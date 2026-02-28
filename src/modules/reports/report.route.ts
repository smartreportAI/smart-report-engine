import type { FastifyInstance } from 'fastify';
import { GenerateReportBodySchema } from './report.types';
import type { GenerateReportBody, ReportGenerationResult } from './report.types';
import { successResponse, errorResponse } from '../../shared/utils/response.utils';
import type { TenantConfig } from '../tenants/tenant.types';
import { normalizeReport } from '../../domain/normalization/normalize-report';
import { buildReport } from '../../rendering/report-builder';
import { generatePdfFromHtml } from '../../rendering/pdf/pdf.service';

/**
 * Inline mock tenant store — will be replaced by a shared TenantService
 * backed by a database in a future phase.
 */
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
      'master-overview',
      'profile-detail',
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

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: GenerateReportBody }>(
    '/reports/generate',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: true,
        },
        // Response schema is left open since PDF returns raw binary
        response: {
          400: { type: 'object', additionalProperties: true },
          404: { type: 'object', additionalProperties: true },
          500: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      /* ---- 1. Validate request body ---- */
      const parsed = GenerateReportBodySchema.safeParse(request.body);

      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;
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

      /* ---- 3. Build HTML report ---- */
      const normalized = normalizeReport(reportData);
      const result = buildReport(normalized, tenant);

      /* ---- 4. PDF path ---- */
      if (output === 'pdf') {
        try {
          const pdfBuffer = await generatePdfFromHtml(result.html);

          return reply
            .code(200)
            .header('Content-Type', 'application/pdf')
            .header(
              'Content-Disposition',
              `inline; filename="${tenantId}-report.pdf"`,
            )
            .send(pdfBuffer);
        } catch (err) {
          app.log.error({ err }, 'PDF generation failed');
          return reply
            .code(500)
            .send(errorResponse('PDF_GENERATION_FAILED', 'Failed to generate PDF. Please try again.'));
        }
      }

      /* ---- 5. HTML path (default) ---- */
      const response: ReportGenerationResult = {
        html: result.html,
        overallScore: result.overallScore,
        overallSeverity: result.overallSeverity,
        renderedPages: result.renderedPages,
        skippedPages: result.skippedPages,
      };

      return reply.code(200).send(successResponse(response));
    },
  );
}
