import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { GenerateReportBodySchema, LabInputBodySchema } from '../modules/reports/report.types';
import { normalizeReport } from '../domain/normalization/normalize-report';
import { normalizeLabInput } from '../domain/normalization/normalize-input';
import { mapRawReportInput } from '../core/mapping/mapping.service';
import { runMappingPipeline } from '../core/test-database';
import { buildReport } from '../rendering/report-builder';
import { generateMultipassPdf } from '../rendering/pdf/pdf-multipass';
import { shutdownPdfService } from '../rendering/pdf/pdf.service';
import { browserPool } from '../rendering/pdf/browser-pool';
import { seedPageRegistry } from '../core/page-registry/seed-registry';
import { CLIENT_REGISTRY } from '../config/clients.config';
import type { RawReportInput } from '../domain/types/input.types';
import type { LabInput } from '../domain/types/lab-input.types';

/* ---------------------------------------------------------------
   CLI entry point
   --------------------------------------------------------------- */

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const pdfFlag = args.includes('--pdf');
    const inputPath = args.find((a) => !a.startsWith('--'));

    const warmupPromise = pdfFlag ? browserPool.warmup() : null;

    if (!inputPath) {
        console.error('Usage: npm run generate <input.json> [--pdf]');
        console.error('');
        console.error('Examples:');
        console.error('  npm run generate examples/mixed-report.json');
        console.error('  npm run generate examples/mixed-report.json -- --pdf');
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

    // 2. Detect format and validate
    const body = parsed as Record<string, unknown>;
    const isLabFormat = 'labData' in body;

    // Resolve tenantId early (needed for mapping overrides)
    const earlyTenantId = (body.tenantId as string) || '';
    const tenantForOverrides = earlyTenantId ? CLIENT_REGISTRY[earlyTenantId] : undefined;

    let tenantId: string;
    let rawReportInput: RawReportInput;

    if (isLabFormat) {
        // Raw lab format
        const validated = LabInputBodySchema.safeParse(body);
        if (!validated.success) {
            console.error('✗ Lab input validation failed:');
            console.error(JSON.stringify(validated.error.flatten().fieldErrors, null, 2));
            process.exit(1);
        }

        tenantId = validated.data.tenantId;

        // Normalize raw lab input
        const { reportInput, metadata, skippedObservations } = normalizeLabInput(
            validated.data.labData as unknown as LabInput,
        );

        if (skippedObservations.length > 0) {
            console.log(`  ⚠ Skipped ${skippedObservations.length} invalid observations`);
        }

        // Run mapping pipeline (priority: client ID override → BM ID → name exact → alias → ungrouped)
        const mappingResult = runMappingPipeline(reportInput, {
            idMappingOverrides: tenantForOverrides?.idMappingOverrides,
            profileMappingOverrides: tenantForOverrides?.profileMappingOverrides,
        });
        rawReportInput = mappingResult.report;

        // Count resolution methods for logging
        const byVia = mappingResult.resolutionLog.reduce((acc, e) => {
            acc[e.resolvedVia] = (acc[e.resolvedVia] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log('');
        console.log('📋 Mapping Pipeline');
        console.log(`  Total:         ${mappingResult.totalParameters} parameters`);
        console.log(`  Mapped:        ${mappingResult.mappedParameters}`);
        console.log(`  Unmapped:      ${mappingResult.unmappedParameters.length}`);
        if (byVia['client-id-override']) console.log(`  Client ID:     ${byVia['client-id-override']}`);
        if (byVia['global-bm-id'])      console.log(`  BM ID:         ${byVia['global-bm-id']}`);
        if (byVia['name-exact'])        console.log(`  Name Match:    ${byVia['name-exact']}`);
        if (byVia['alias'])             console.log(`  Alias Match:   ${byVia['alias']}`);
        if (mappingResult.unmappedParameters.length > 0) {
            console.log(`  Unmapped:      ${mappingResult.unmappedParameters.join(', ')}`);
        }
        console.log(`  Patient:       ${metadata.org} / ${metadata.labNo}`);
    } else {
        // Pre-mapped format
        const validated = GenerateReportBodySchema.safeParse(body);
        if (!validated.success) {
            console.error('✗ Validation failed:');
            console.error(JSON.stringify(validated.error.flatten().fieldErrors, null, 2));
            process.exit(1);
        }

        tenantId = validated.data.tenantId;
        rawReportInput = validated.data.reportData as unknown as RawReportInput;
    }

    // 3. Resolve tenant
    const tenant = CLIENT_REGISTRY[tenantId];
    if (!tenant) {
        console.error(`✗ Tenant "${tenantId}" not found.`);
        console.error(`  Available: ${Object.keys(CLIENT_REGISTRY).join(', ')}`);
        process.exit(1);
    }

    // 4. Seed pages, map (existing mapping service for pre-mapped format)
    seedPageRegistry();
    const { report: mappedData, unmappedParameters } = mapRawReportInput(rawReportInput, tenant);

    // 5. Normalize + Build
    const normalized = normalizeReport(mappedData);
    const result = buildReport(normalized, tenant);

    // 6. Ensure output directory
    const outputDir = resolve('output');
    mkdirSync(outputDir, { recursive: true });

    // 7. Write output
    if (pdfFlag) {
        console.log('');
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
}

main().catch((err) => {
    console.error('✗ Unexpected error:', err);
    process.exit(1);
});
