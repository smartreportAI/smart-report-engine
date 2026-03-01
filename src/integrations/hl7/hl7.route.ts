import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { adaptHl7ToRawReport } from './hl7.adapter';
import { normalizeReport } from '../../domain/normalization/normalize-report';
import { mapRawReportInput } from '../../core/mapping/mapping.service';
import { buildReport } from '../../rendering/report-builder';
import { generatePdfFromHtml } from '../../rendering/pdf/pdf.service';
import { createAuditRecord, recordAudit } from '../../audit/audit.service';
import {
    generateReportFingerprint,
    getCachedReport,
    getCachedPdf,
    storeCachedReport,
    storeCachedPdf,
} from '../../cache/report-cache.service';
import { incrementCounter, observeDuration, METRIC } from '../../metrics/metrics.service';
import { successResponse, errorResponse } from '../../shared/utils/response.utils';
import type { TenantConfig } from '../../modules/tenants/tenant.types';
import type { ReportGenerationResult } from '../../modules/reports/report.types';

// ---------------------------------------------------------------------------
// Request body schema
// ---------------------------------------------------------------------------

const Hl7IngestBodySchema = z.object({
    tenantId: z.string().min(1),
    hl7Message: z.string().min(1),
    output: z.enum(['html', 'pdf']).default('html'),
});

type Hl7IngestBody = z.infer<typeof Hl7IngestBodySchema>;

// ---------------------------------------------------------------------------
// Mock tenant store (mirrors report.route.ts — will be replaced by shared
// TenantService in a future phase)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function hl7Routes(app: FastifyInstance): Promise<void> {
    app.post<{ Body: Hl7IngestBody }>(
        '/ingest/hl7',
        {
            schema: {
                body: { type: 'object', additionalProperties: true },
                response: {
                    400: { type: 'object', additionalProperties: true },
                    404: { type: 'object', additionalProperties: true },
                    422: { type: 'object', additionalProperties: true },
                    500: { type: 'object', additionalProperties: true },
                },
            },
        },
        async (request, reply) => {
            const startMs = Date.now();
            const source = 'hl7';
            incrementCounter(METRIC.INGESTION_TOTAL, { source });

            /* ---- 1. Validate outer request body ---- */
            const parsed = Hl7IngestBodySchema.safeParse(request.body);

            if (!parsed.success) {
                const fieldErrors = parsed.error.flatten().fieldErrors;
                incrementCounter(METRIC.ERROR_TOTAL, { type: 'validation', source });
                return reply
                    .code(400)
                    .send(errorResponse('INVALID_BODY', JSON.stringify(fieldErrors)));
            }

            const { tenantId, hl7Message, output } = parsed.data;

            /* ---- 2. Resolve tenant ---- */
            const tenant = MOCK_TENANTS[tenantId];

            if (!tenant) {
                return reply
                    .code(404)
                    .send(
                        errorResponse(
                            'TENANT_NOT_FOUND',
                            `Tenant "${tenantId}" does not exist.`,
                        ),
                    );
            }

            /* ---- 3. Adapt HL7 message → RawReportInput ---- */
            let rawReport;
            try {
                rawReport = adaptHl7ToRawReport(hl7Message);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : 'HL7 message parsing failed.';
                app.log.warn({ err }, 'HL7 ingestion parsing/adaptation error');
                return reply
                    .code(422)
                    .send(errorResponse('HL7_PARSE_FAILED', message));
            }

            /* ---- 4. Map ---- */
            const { report: mappedReport, unmappedParameters } = mapRawReportInput(rawReport, tenant);

            if (unmappedParameters.length > 0) {
                app.log.warn({ unmappedParameters, tenantId }, 'Unmapped parameters detected (HL7)');
                incrementCounter(METRIC.MAPPING_WARNING_TOTAL, { source }, unmappedParameters.length);
            }

            /* ---- 5. Cache check ---- */
            const fingerprint = generateReportFingerprint(mappedReport, tenantId);
            const cached = getCachedReport(fingerprint);

            if (cached) {
                incrementCounter(METRIC.CACHE_HIT_TOTAL, { source });
                app.log.info({ fingerprint, tenantId, source, durationMs: Date.now() - startMs }, 'Cache hit (HL7)');
                if (output === 'pdf') {
                    const cachedPdf = getCachedPdf(fingerprint);
                    if (cachedPdf) {
                        return reply.code(200).header('Content-Type', 'application/pdf')
                            .header('Content-Disposition', `inline; filename="${tenantId}-hl7-report.pdf"`)
                            .send(cachedPdf);
                    }
                    const pdfBuffer = await generatePdfFromHtml(cached.html);
                    storeCachedPdf(fingerprint, pdfBuffer);
                    return reply.code(200).header('Content-Type', 'application/pdf')
                        .header('Content-Disposition', `inline; filename="${tenantId}-hl7-report.pdf"`)
                        .send(pdfBuffer);
                }
                const response: ReportGenerationResult = {
                    html: cached.html, overallScore: cached.overallScore,
                    overallSeverity: cached.overallSeverity,
                    renderedPages: cached.renderedPages, skippedPages: cached.skippedPages,
                };
                return reply.code(200).send(successResponse(response));
            }

            /* ---- 6. Normalize + Build ---- */
            incrementCounter(METRIC.CACHE_MISS_TOTAL, { source });
            const normalized = normalizeReport(mappedReport);
            const result = buildReport(normalized, tenant);
            incrementCounter(METRIC.SEVERITY_TOTAL, { severity: result.overallSeverity });

            /* ---- 7. Audit (new generation only) ---- */
            try {
                const audit = createAuditRecord({
                    tenantId, rawInput: hl7Message,
                    mappingWarnings: unmappedParameters, normalized, source: 'hl7',
                });
                const auditPath = recordAudit(audit);
                incrementCounter(METRIC.AUDIT_TOTAL, { source });
                app.log.info({ reportId: audit.reportId, inputHash: audit.inputHash, auditPath, tenantId, fingerprint, source }, 'Audit record saved (HL7)');
            } catch (err) {
                app.log.error({ err }, 'Failed to save audit record (HL7)');
            }

            /* ---- 8. Cache store + respond ---- */
            const cacheEntry = {
                tenantId, html: result.html, overallScore: result.overallScore,
                overallSeverity: result.overallSeverity,
                renderedPages: result.renderedPages, skippedPages: result.skippedPages,
            };

            if (output === 'pdf') {
                try {
                    const pdfStartMs = Date.now();
                    const pdfBuffer = await generatePdfFromHtml(result.html);
                    incrementCounter(METRIC.PDF_GENERATION_TOTAL, { source });
                    observeDuration(METRIC.PDF_DURATION_MS, Date.now() - pdfStartMs, { source });
                    storeCachedReport(fingerprint, cacheEntry, pdfBuffer);
                    observeDuration(METRIC.REPORT_DURATION_MS, Date.now() - startMs, { source });
                    return reply.code(200).header('Content-Type', 'application/pdf')
                        .header('Content-Disposition', `inline; filename="${tenantId}-hl7-report.pdf"`)
                        .send(pdfBuffer);
                } catch (err) {
                    app.log.error({ err }, 'PDF generation failed (HL7)');
                    return reply.code(500).send(errorResponse('PDF_GENERATION_FAILED', 'Failed to generate PDF.'));
                }
            }

            storeCachedReport(fingerprint, cacheEntry);
            const response: ReportGenerationResult = {
                html: result.html, overallScore: result.overallScore,
                overallSeverity: result.overallSeverity,
                renderedPages: result.renderedPages, skippedPages: result.skippedPages,
            };
            observeDuration(METRIC.REPORT_DURATION_MS, Date.now() - startMs, { source });
            return reply.code(200).send(successResponse(response));
        },
    );
}
