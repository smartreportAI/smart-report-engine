import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { GenerateReportBodySchema } from '../modules/reports/report.types';
import { normalizeReport } from '../domain/normalization/normalize-report';
import { mapRawReportInput } from '../core/mapping/mapping.service';
import { buildReport } from '../rendering/report-builder';
import { generateMultipassPdf } from '../rendering/pdf/pdf-multipass';
import { shutdownPdfService } from '../rendering/pdf/pdf.service';
import { browserPool } from '../rendering/pdf/browser-pool';
import { createAuditRecord, recordAudit } from '../audit/audit.service';
import {
    generateReportFingerprint,
    getCachedReport,
    storeCachedReport,
} from '../cache/report-cache.service';
import { seedPageRegistry } from '../core/page-registry/seed-registry';
import { config } from '../core/config/config.service';
import { buildViewerPayload } from '../viewer/viewer.service';
import { createViewerToken } from '../viewer/token.service';
import { generateViewerQrSvg } from '../viewer/qr.service';

import { CLIENT_REGISTRY } from '../config/clients.config';

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

    const warmupPromise = pdfFlag ? browserPool.warmup() : null;

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
    const tenant = CLIENT_REGISTRY[tenantId];
    if (!tenant) {
        console.error(`✗ Tenant "${tenantId}" not found.`);
        console.error(`  Available: ${Object.keys(CLIENT_REGISTRY).join(', ')}`);
        process.exit(1);
    }

    // 4. Seed pages, map
    seedPageRegistry();
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

    // 6a. Viewer token + real QR code (gated by tenant.webViewer + VIEWER_BASE_URL)
    let viewerQrSvg: string | undefined;
    let viewerUrl: string | undefined;
    if (tenant.webViewer && config.viewerBaseUrl) {
        try {
            const reportDisplayId = `RPT-${new Date().getFullYear()}-${normalized.patientId.slice(-4).toUpperCase()}`;
            const reportDate = new Date().toLocaleDateString('en-IN', {
                day: '2-digit', month: 'long', year: 'numeric',
            });
            const viewerPayload = buildViewerPayload(normalized, tenant, reportDisplayId, reportDate);
            const token = createViewerToken({
                fingerprint,
                tenantId,
                patientId: normalized.patientId,
                reportDisplayId,
                reportDate,
                payload: viewerPayload,
            });
            viewerUrl = `${config.viewerBaseUrl}/view/${token}`;
            viewerQrSvg = await generateViewerQrSvg(viewerUrl, tenant.branding.primaryColor, 90);
        } catch {
            console.error('  ⚠ Viewer QR generation failed — using placeholder');
        }
    }

    const result = buildReport(normalized, tenant, viewerQrSvg, viewerUrl);

    // 7. Audit (new generation only)
    const audit = createAuditRecord({
        tenantId,
        rawInput: reportData,
        mappingWarnings: unmappedParameters,
        normalized,
        source: 'cli',
    });
    const auditPath = recordAudit(audit);

    // 8. Cache store
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
        patient: result.patient,
    });

    // 9. Ensure output directory
    const outputDir = resolve('output');
    mkdirSync(outputDir, { recursive: true });

    // 10. Write output
    if (pdfFlag) {
        console.log('⏳ Generating PDF (multi-pass)...');

        if (warmupPromise) await warmupPromise;
        const pdfBuffer = await generateMultipassPdf(result, tenant);

        const outPath = resolve(outputDir, 'report.pdf');
        writeFileSync(outPath, pdfBuffer);
        await shutdownPdfService();

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

    if (viewerUrl) {
        console.log('');
        console.log('🔗 Patient Viewer');
        console.log(`  URL:  ${viewerUrl}`);
    }
}

main().catch((err) => {
    console.error('✗ Unexpected error:', err);
    process.exit(1);
});
