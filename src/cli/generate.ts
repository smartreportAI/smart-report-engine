import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { GenerateReportBodySchema } from '../modules/reports/report.types';
import type { TenantConfig } from '../modules/tenants/tenant.types';
import { normalizeReport } from '../domain/normalization/normalize-report';
import { mapRawReportInput } from '../core/mapping/mapping.service';
import { buildReport } from '../rendering/report-builder';
import { generatePdfFromHtml } from '../rendering/pdf/pdf.service';
import { generateMultipassPdf } from '../rendering/pdf/pdf-multipass';
import { buildHeaderTemplate, buildFooterTemplate, getPdfMargins } from '../rendering/html-layout';
import { createAuditRecord, recordAudit } from '../audit/audit.service';
import {
    generateReportFingerprint,
    getCachedReport,
    storeCachedReport,
} from '../cache/report-cache.service';
import { pageRegistry } from '../core/page-registry/page.registry';
import { masterOverviewPage } from '../pages/master-overview.page';
import { profileDetailPage } from '../pages/profile-detail.page';
import {
    inDepthCoverPage,
    inDepthHowToReadPage,
    inDepthSummaryPage,
    inDepthDetailPage,
    inDepthBackPage,
} from '../pages/indepth/index';
import type { PageRenderContext } from '../core/page-registry/page.types';

/* ---------------------------------------------------------------
   Mock tenant store (mirrors report.route.ts)
   --------------------------------------------------------------- */

const MOCK_TENANTS: Record<string, TenantConfig> = {
    'tenant-alpha': {
        tenantId: 'tenant-alpha',
        reportType: 'essential',
        pageOrder: ['master-overview', 'profile-detail'],
        branding: {
            labName: 'Alpha Diagnostics',
            logoUrl: 'https://cdn.example.com/alpha/logo.png',
            primaryColor: '#1A73E8',
            footerText: 'Alpha Diagnostics Pvt. Ltd.',
        },
    },
    'tenant-beta': {
        tenantId: 'tenant-beta',
        reportType: 'inDepth',
        pageOrder: [
            'indepth-cover',
            'indepth-how-to-read',
            'indepth-summary',
            'indepth-detail',
            'indepth-back',
        ],
        branding: {
            labName: 'Beta Health Labs',
            logoUrl: 'https://cdn.example.com/beta/logo.png',
            primaryColor: '#E53935',
            secondaryColor: '#1B5E20',
            accentHealthy: '#388E3C',
            footerText: 'Beta Health Labs — Quality Diagnostics',
            contactEmail: 'reports@betahealthlabs.com',
            showPoweredBy: true,
        },
    },
};

/* ---------------------------------------------------------------
   Page registry seeding (same as server.ts)
   --------------------------------------------------------------- */

function seedPages(): void {
    pageRegistry.register(masterOverviewPage);
    pageRegistry.register(profileDetailPage);

    // InDepth pages
    pageRegistry.register(inDepthCoverPage);
    pageRegistry.register(inDepthHowToReadPage);
    pageRegistry.register(inDepthSummaryPage);
    pageRegistry.register(inDepthDetailPage);
    pageRegistry.register(inDepthBackPage);

    const placeholders = [
        'cover', 'summary', 'executiveSummary', 'bloodPanel',
        'lipidProfile', 'thyroidPanel', 'vitaminAnalysis',
        'recommendations', 'appendix',
    ];

    for (const name of placeholders) {
        if (!pageRegistry.has(name)) {
            pageRegistry.register({
                name,
                generate(_ctx: PageRenderContext): string {
                    return `<div class="section-title" style="padding:40px 0;text-align:center;color:#94a3b8;">[${name}] — page not yet implemented</div>`;
                },
            });
        }
    }
}

/* ---------------------------------------------------------------
   CLI entry point
   --------------------------------------------------------------- */

async function main(): Promise<void> {
    const args = process.argv.slice(2);

    // Parse flags
    const pdfFlag = args.includes('--pdf');
    const noCacheFlag = args.includes('--no-cache');
    const noAuditFlag = args.includes('--no-audit');
    const inputPath = args.find((a) => !a.startsWith('--'));

    if (noCacheFlag) process.env.DISABLE_CACHE = 'true';
    if (noAuditFlag) process.env.DISABLE_AUDIT = 'true';

    if (!inputPath) {
        console.error('Usage: npm run generate <input.json> [--pdf] [--no-cache] [--no-audit]');
        console.error('');
        console.error('Examples:');
        console.error('  npm run generate examples/sample-report.json');
        console.error('  npm run generate examples/sample-report.json -- --pdf --no-cache --no-audit');
        process.exit(1);
    }

    // 1. Read and parse JSON
    const absolutePath = resolve(inputPath);
    let rawJson: string;
    try {
        rawJson = readFileSync(absolutePath, 'utf-8');
    } catch {
        console.error(`✗ Cannot read file: ${absolutePath}`);
        process.exit(1);
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(rawJson);
    } catch {
        console.error(`✗ Invalid JSON in: ${basename(absolutePath)}`);
        process.exit(1);
    }

    // 2. Validate using Zod schema (same as the API route)
    const validated = GenerateReportBodySchema.safeParse(parsed);
    if (!validated.success) {
        console.error('✗ Validation failed:');
        console.error(JSON.stringify(validated.error.flatten().fieldErrors, null, 2));
        process.exit(1);
    }

    const { tenantId, reportData } = validated.data;

    // 3. Resolve tenant
    const tenant = MOCK_TENANTS[tenantId];
    if (!tenant) {
        console.error(`✗ Tenant "${tenantId}" not found.`);
        console.error(`  Available: ${Object.keys(MOCK_TENANTS).join(', ')}`);
        process.exit(1);
    }

    // 4. Seed pages, map
    seedPages();
    const { report: mappedData, unmappedParameters } = mapRawReportInput(reportData, tenant);

    // 5. Cache check
    const fingerprint = generateReportFingerprint(mappedData, tenantId);
    const cached = getCachedReport(fingerprint);

    if (cached) {
        console.log('');
        console.log('⚡ Cache hit — using cached report');
        console.log(`  Fingerprint: ${fingerprint}`);

        const outputDir = resolve('output');
        mkdirSync(outputDir, { recursive: true });

        if (pdfFlag) {
            console.log('⏳ Generating PDF from cached HTML...');
            const pdfBuffer = await generateMultipassPdf(cached, tenant);
            const outPath = resolve(outputDir, 'report.pdf');
            writeFileSync(outPath, pdfBuffer);
            console.log(`  File:     ${outPath}`);
            console.log(`  Size:     ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
        } else {
            const outPath = resolve(outputDir, 'report.html');
            writeFileSync(outPath, cached.html, 'utf-8');
            console.log(`  File:     ${outPath}`);
            console.log(`  Size:     ${(cached.html.length / 1024).toFixed(1)} KB`);
        }

        console.log(`  Score:    ${cached.overallScore}/100`);
        console.log(`  Severity: ${cached.overallSeverity}`);
        console.log('  Audit:    skipped (cached)');
        return;
    }

    // 6. Normalize + Build
    const normalized = normalizeReport(mappedData);
    const result = buildReport(normalized, tenant);

    // 7. Audit (new generation only)
    const audit = createAuditRecord({
        tenantId,
        rawInput: reportData,
        mappingWarnings: unmappedParameters,
        normalized,
        source: 'cli',
    });
    const auditPath = recordAudit(audit);

    storeCachedReport(fingerprint, {
        tenantId,
        html: result.html,
        coverHtml: result.coverHtml,
        contentHtml: result.contentHtml,
        backHtml: result.backHtml,
        overallScore: result.overallScore,
        overallSeverity: result.overallSeverity,
        renderedPages: result.renderedPages,
        skippedPages: result.skippedPages,
    });

    // 9. Ensure output directory
    const outputDir = resolve('output');
    mkdirSync(outputDir, { recursive: true });

    // 10. Write output
    if (pdfFlag) {
        console.log('⏳ Generating PDF (multi-pass)...');

        const pdfBuffer = await generateMultipassPdf(result, tenant);

        const outPath = resolve(outputDir, 'report.pdf');
        writeFileSync(outPath, pdfBuffer);

        console.log('');
        console.log('✓ PDF generated successfully');
        console.log(`  File:     ${outPath}`);
        console.log(`  Size:     ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
    } else {
        const outPath = resolve(outputDir, 'report.html');
        writeFileSync(outPath, result.html, 'utf-8');

        console.log('');
        console.log('✓ HTML generated successfully');
        console.log(`  File:     ${outPath}`);
        console.log(`  Size:     ${(result.html.length / 1024).toFixed(1)} KB`);
    }

    console.log(`  Score:    ${result.overallScore}/100`);
    console.log(`  Severity: ${result.overallSeverity}`);
    console.log(`  Pages:    ${result.renderedPages.join(', ')}`);

    if (result.skippedPages.length > 0) {
        console.log(`  Skipped:  ${result.skippedPages.join(', ')}`);
    }

    if (unmappedParameters.length > 0) {
        console.log(`  Unmapped: ${unmappedParameters.join(', ')}`);
    }

    console.log('');
    console.log('📋 Audit');
    console.log(`  Report ID:  ${audit.reportId}`);
    console.log(`  Input Hash: ${audit.inputHash}`);
    console.log(`  Saved To:   ${auditPath}`);
    console.log(`  Cache Key:  ${fingerprint}`);
}

main().catch((err) => {
    console.error('✗ Unexpected error:', err);
    process.exit(1);
});
