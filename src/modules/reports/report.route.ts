import type { FastifyInstance } from 'fastify';
import { GenerateReportBodySchema } from './report.types';
import type { GenerateReportBody, ReportGenerationResult } from './report.types';
import { successResponse, errorResponse } from '../../shared/utils/response.utils';
import type { TenantConfig } from '../tenants/tenant.types';
import { normalizeReport } from '../../domain/normalization/normalize-report';
import { mapRawReportInput } from '../../core/mapping/mapping.service';
import { buildReport } from '../../rendering/report-builder';
import { generatePdfFromHtml } from '../../rendering/pdf/pdf.service';
import { generateMultipassPdf } from '../../rendering/pdf/pdf-multipass';
import { buildHeaderTemplate, buildFooterTemplate, getPdfMargins } from '../../rendering/html-layout';
import { createAuditRecord, recordAudit } from '../../audit/audit.service';
import {
  generateReportFingerprint,
  getCachedReport,
  getCachedPdf,
  storeCachedReport,
  storeCachedPdf,
} from '../../cache/report-cache.service';
import {
  incrementCounter,
  observeDuration,
  METRIC,
} from '../../metrics/metrics.service';

/**
 * Inline mock tenant store — will be replaced by a shared TenantService
 * backed by a database in a future phase.
 * Kept in sync with tenant.route.ts so GET /tenants/:id and POST /reports/generate
 * accept the same tenant IDs (tenant-alpha, tenant-beta, demo).
 */
const MOCK_TENANTS: Record<string, TenantConfig> = {
  demo: {
    tenantId: 'demo',
    reportType: 'inDepth',
    pageOrder: [
      'indepth-cover',
      'indepth-how-to-read',
      'indepth-summary',
      'indepth-detail',
      'indepth-back',
    ],
    branding: {
      labName: 'Smart Health Labs',
      logoUrl: 'https://cdn.example.com/demo/logo.png',
      primaryColor: '#4F46E5',
      secondaryColor: '#0EA5E9',
      accentHealthy: '#16A34A',
      accentMonitor: '#D97706',
      accentAttention: '#DC2626',
      footerText: 'Smart Health Labs — Intelligent Diagnostics',
      contactEmail: 'reports@smarthealthlabs.com',
      showPoweredBy: true,
    },
  },
  'tenant-alpha': {
    tenantId: 'tenant-alpha',
    reportType: 'essential',
    pageOrder: ['cover', 'summary', 'bloodPanel', 'recommendations'],
    branding: {
      labName: 'Alpha Diagnostics',
      logoUrl: 'https://cdn.example.com/alpha/logo.png',
      primaryColor: '#1A73E8',
      footerText: 'Alpha Diagnostics Pvt. Ltd.',
      headerMargin: '40px',
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
      labName: 'NexaHealth Analytics',
      logoUrl: '',
      primaryColor: '#2D4A9A',
      secondaryColor: '#20BFDD',
      accentHealthy: '#388E3C',
      footerText: 'NexaHealth Analytics — Smart Health Insights',
      headerHeight: '80px',
      headerMargin: '20px',
      contactEmail: 'reports@nexahealth.com',
      showPoweredBy: true,
    },
  },
};

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: GenerateReportBody }>(
    '/reports/generate',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: true,
        },
        response: {
          400: { type: 'object', additionalProperties: true },
          404: { type: 'object', additionalProperties: true },
          500: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      const startMs = Date.now();
      const source = 'json';
      incrementCounter(METRIC.INGESTION_TOTAL, { source });

      /* ---- 1. Validate request body ---- */
      const parsed = GenerateReportBodySchema.safeParse(request.body);

      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;
        incrementCounter(METRIC.ERROR_TOTAL, { type: 'validation', source });
        return reply
          .code(400)
          .send(errorResponse('INVALID_BODY', JSON.stringify(fieldErrors)));
      }

      const { tenantId, reportData, output } = parsed.data;

      /* ---- 2. Resolve tenant ---- */
      const tenant = MOCK_TENANTS[tenantId];

      if (!tenant) {
        return reply
          .code(404)
          .send(errorResponse('TENANT_NOT_FOUND', `Tenant "${tenantId}" does not exist.`));
      }

      /* ---- 3. Map ---- */
      const { report: mappedData, unmappedParameters } = mapRawReportInput(reportData, tenant);

      if (unmappedParameters.length > 0) {
        app.log.warn({ unmappedParameters, tenantId }, 'Unmapped parameters detected');
        incrementCounter(METRIC.MAPPING_WARNING_TOTAL, { source }, unmappedParameters.length);
      }

      /* ---- 4. Cache check ---- */
      const fingerprint = generateReportFingerprint(mappedData, tenantId);
      const cached = getCachedReport(fingerprint);

      if (cached) {
        incrementCounter(METRIC.CACHE_HIT_TOTAL, { source });
        app.log.info({ fingerprint, tenantId, source, durationMs: Date.now() - startMs }, 'Cache hit — returning cached report');

        if (output === 'pdf') {
          const cachedPdf = getCachedPdf(fingerprint);
          if (cachedPdf) {
            return reply.code(200).send(successResponse({
              pdfBase64: cachedPdf.toString('base64'),
              overallScore: cached.overallScore,
              overallSeverity: cached.overallSeverity,
              renderedPages: cached.renderedPages,
              skippedPages: cached.skippedPages,
            }));
          }
          // Generate multipass PDF from cached HTML elements
          const pdfBuffer = await generateMultipassPdf(cached, tenant);
          storeCachedPdf(fingerprint, pdfBuffer);
          return reply.code(200).send(successResponse({
            pdfBase64: pdfBuffer.toString('base64'),
            overallScore: cached.overallScore,
            overallSeverity: cached.overallSeverity,
            renderedPages: cached.renderedPages,
            skippedPages: cached.skippedPages,
          }));
        }

        const response: ReportGenerationResult = {
          html: cached.html,
          overallScore: cached.overallScore,
          overallSeverity: cached.overallSeverity,
          renderedPages: cached.renderedPages,
          skippedPages: cached.skippedPages,
        };
        return reply.code(200).send(successResponse(response));
      }

      /* ---- 5. Normalize + Build ---- */
      incrementCounter(METRIC.CACHE_MISS_TOTAL, { source });
      const normalized = normalizeReport(mappedData);
      const result = buildReport(normalized, tenant);
      incrementCounter(METRIC.SEVERITY_TOTAL, { severity: result.overallSeverity });

      /* ---- 6. Audit (only for new generations) ---- */
      try {
        const audit = createAuditRecord({
          tenantId,
          rawInput: reportData,
          mappingWarnings: unmappedParameters,
          normalized,
          source: 'json',
        });
        const auditPath = recordAudit(audit);
        incrementCounter(METRIC.AUDIT_TOTAL, { source });
        app.log.info({ reportId: audit.reportId, inputHash: audit.inputHash, auditPath, tenantId, fingerprint, source }, 'Audit record saved');
      } catch (err) {
        app.log.error({ err }, 'Failed to save audit record');
      }

      /* ---- 7. Cache store + respond ---- */
      if (output === 'pdf') {
        // Retry once on transient PDF failures (e.g. Puppeteer crash / timeout)
        const maxAttempts = 2;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const pdfStartMs = Date.now();
            const pdfBuffer = await generateMultipassPdf(result, tenant);
            const pdfDuration = Date.now() - pdfStartMs;

            incrementCounter(METRIC.PDF_GENERATION_TOTAL, { source });
            observeDuration(METRIC.PDF_DURATION_MS, pdfDuration, { source });
            observeDuration(METRIC.REPORT_DURATION_MS, Date.now() - startMs, { source });

            storeCachedReport(
              fingerprint,
              {
                tenantId,
                html: result.html,
                coverHtml: result.coverHtml,
                contentHtml: result.contentHtml,
                backHtml: result.backHtml,
                overallScore: result.overallScore,
                overallSeverity: result.overallSeverity,
                renderedPages: result.renderedPages,
                skippedPages: result.skippedPages,
              },
              pdfBuffer,
            );

            return reply.code(200).send(
              successResponse({
                pdfBase64: pdfBuffer.toString('base64'),
                overallScore: result.overallScore,
                overallSeverity: result.overallSeverity,
                renderedPages: result.renderedPages,
                skippedPages: result.skippedPages,
              }),
            );
          } catch (err) {
            lastError = err;
            app.log.error({ err, attempt }, 'PDF generation failed');

            if (attempt === maxAttempts) {
              incrementCounter(METRIC.ERROR_TOTAL, { type: 'pdf', source });
              return reply
                .code(500)
                .send(
                  errorResponse(
                    'PDF_GENERATION_FAILED',
                    'Failed to generate PDF. Please try again.',
                  ),
                );
            }
          }
        }
      }

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

      const response: ReportGenerationResult = {
        html: result.html,
        overallScore: result.overallScore,
        overallSeverity: result.overallSeverity,
        renderedPages: result.renderedPages,
        skippedPages: result.skippedPages,
      };

      observeDuration(METRIC.REPORT_DURATION_MS, Date.now() - startMs, { source });
      return reply.code(200).send(successResponse(response));
    },
  );
}
