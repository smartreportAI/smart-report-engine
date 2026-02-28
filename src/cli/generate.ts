import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { GenerateReportBodySchema } from '../modules/reports/report.types';
import type { TenantConfig } from '../modules/tenants/tenant.types';
import { normalizeReport } from '../domain/normalization/normalize-report';
import { buildReport } from '../rendering/report-builder';
import { generatePdfFromHtml } from '../rendering/pdf/pdf.service';
import { pageRegistry } from '../core/page-registry/page.registry';
import { masterOverviewPage } from '../pages/master-overview.page';
import { profileDetailPage } from '../pages/profile-detail.page';
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
        pageOrder: ['master-overview', 'profile-detail'],
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
    const inputPath = args.find((a) => !a.startsWith('--'));

    if (!inputPath) {
        console.error('Usage: npm run generate <input.json> [--pdf]');
        console.error('');
        console.error('Examples:');
        console.error('  npm run generate examples/sample-report.json');
        console.error('  npm run generate examples/sample-report.json -- --pdf');
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

    // 4. Seed pages & build report
    seedPages();
    const normalized = normalizeReport(reportData);
    const result = buildReport(normalized, tenant);

    // 5. Ensure output directory
    const outputDir = resolve('output');
    mkdirSync(outputDir, { recursive: true });

    // 6. Write output
    if (pdfFlag) {
        console.log('⏳ Generating PDF...');
        const pdfBuffer = await generatePdfFromHtml(result.html);
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
}

main().catch((err) => {
    console.error('✗ Unexpected error:', err);
    process.exit(1);
});
