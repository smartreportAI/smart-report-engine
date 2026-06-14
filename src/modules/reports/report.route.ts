import type { FastifyInstance } from 'fastify';
import { GenerateReportBodySchema, LabInputBodySchema } from './report.types';
import type { GenerateReportBody, LabInputBody, ReportGenerationResult } from './report.types';
import { successResponse, errorResponse } from '../../shared/utils/response.utils';
import { normalizeReport } from '../../domain/normalization/normalize-report';
import { normalizeLabInput } from '../../domain/normalization/normalize-input';
import type { LabMetadata } from '../../domain/normalization/normalize-input';
import { mapRawReportInput } from '../../core/mapping/mapping.service';
import { runMappingPipeline } from '../../core/test-database';
import type { MappingPipelineResult } from '../../core/test-database';
import { buildReport } from '../../rendering/report-builder';
import { generateMultipassPdf } from '../../rendering/pdf/pdf-multipass';
import { saveReport, saveFailedReport, validateClient, decrementCredits } from '../../database';
import { resolveClientConfig } from '../../services/client-config.service';
import { dispatchToWebhook, updateReportDispatchStatus } from '../../services/webhook.service';
import type { RawReportInput } from '../../domain/types/input.types';
import type { LabInput } from '../../domain/types/lab-input.types';
import type { NormalizedReport } from '../../domain/models/report.model';

export async function reportRoutes(app: FastifyInstance): Promise<void> {

  /**
   * POST /reports/generate
   * Accepts EITHER:
   *   - { tenantId, reportData: { ... } }  → pre-mapped format (existing)
   *   - { tenantId, labData: { ... } }     → raw lab format (new)
   */
  app.post<{ Body: GenerateReportBody | LabInputBody }>(
    '/reports/generate',
    {
      schema: {
        body: { type: 'object', additionalProperties: true },
        response: {
          400: { type: 'object', additionalProperties: true },
          404: { type: 'object', additionalProperties: true },
          500: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Record<string, unknown>;

      /* ---- Detect input format based on which key is present ---- */
      const hasLabData = body !== null && typeof body === 'object' && 'labData' in body;
      const hasReportData = body !== null && typeof body === 'object' && 'reportData' in body;

      if (!hasLabData && !hasReportData) {
        return reply.code(400).send(
          errorResponse('INVALID_BODY', 'Request must contain either "reportData" (pre-mapped) or "labData" (raw lab format).'),
        );
      }

      let tenantId: string;
      let output: string;
      let rawReportInput: RawReportInput;
      let labMetadata: LabMetadata | undefined;
      let mappingPipelineResult: MappingPipelineResult | undefined;

      if (hasLabData) {
        /* ---- Raw lab format ---- */
        const parsed = LabInputBodySchema.safeParse(body);
        if (!parsed.success) {
          const fieldErrors = parsed.error.flatten().fieldErrors;
          return reply.code(400).send(
            errorResponse('INVALID_BODY', JSON.stringify(fieldErrors)),
          );
        }

        tenantId = parsed.data.tenantId;
        output = parsed.data.output;

        // Step 1: Normalize raw lab input (flatten observations, normalize gender/age)
        const { reportInput, metadata, skippedObservations } = normalizeLabInput(
          parsed.data.labData as unknown as LabInput,
        );

        if (skippedObservations.length > 0) {
          app.log.info({ skippedCount: skippedObservations.length, tenantId }, 'Skipped invalid observations');
        }

        // Step 2: Run mapping pipeline (ID mapping → name mapping → profile assignment)
        const tenantForMapping = await resolveClientConfig(tenantId);
        const mappingResult = runMappingPipeline(reportInput, {
          idMappingOverrides: tenantForMapping?.tenantConfig.idMappingOverrides,
          profileMappingOverrides: tenantForMapping?.tenantConfig.profileMappingOverrides,
        });

        rawReportInput = mappingResult.report;
        labMetadata = metadata;
        mappingPipelineResult = mappingResult;

        app.log.info({
          tenantId,
          total: mappingResult.totalParameters,
          mapped: mappingResult.mappedParameters,
          unmapped: mappingResult.unmappedParameters.length,
        }, 'Mapping pipeline completed');
      } else {
        /* ---- Pre-mapped format (existing) ---- */
        const parsed = GenerateReportBodySchema.safeParse(body);
        if (!parsed.success) {
          const fieldErrors = parsed.error.flatten().fieldErrors;
          return reply.code(400).send(
            errorResponse('INVALID_BODY', JSON.stringify(fieldErrors)),
          );
        }

        tenantId = parsed.data.tenantId;
        output = parsed.data.output;
        rawReportInput = parsed.data.reportData as unknown as RawReportInput;
      }

      /* ---- Resolve tenant (DB config + code config merged) ---- */
      const resolved = await resolveClientConfig(tenantId);
      if (!resolved) {
        return reply.code(404).send(
          errorResponse('TENANT_NOT_FOUND', `Tenant "${tenantId}" does not exist.`),
        );
      }
      const tenant = resolved.tenantConfig;

      /* ---- Validate client (credits + active status) ---- */
      const validation = await validateClient(tenantId);
      if (!validation.allowed) {
        return reply.code(403).send(
          errorResponse('CLIENT_NOT_ALLOWED', validation.reason || 'Client cannot generate reports.'),
        );
      }

      /* ---- Map ---- */
      const { report: mappedData, unmappedParameters } = mapRawReportInput(rawReportInput, tenant);

      if (unmappedParameters.length > 0) {
        app.log.warn({ unmappedCount: unmappedParameters.length, tenantId }, 'Unmapped parameters detected');
      }

      /* ---- Normalize + Build ---- */
      const normalized = normalizeReport(mappedData);
      const result = buildReport(normalized, tenant);

      /* ---- Generate PDF or return HTML ---- */
      if (output === 'pdf') {
        try {
          const pdfBuffer = await generateMultipassPdf(result, tenant);

          // Save report to MongoDB (fire and forget — don't block response)
          saveReportToDb(normalized, labMetadata, mappingPipelineResult, pdfBuffer.length, tenantId, result)
            .catch(err => app.log.error({ err }, 'Failed to save report to DB'));

          // Decrement credits (fire and forget)
          decrementCredits(tenantId)
            .catch(err => app.log.error({ err }, 'Failed to decrement credits'));

          // Dispatch to webhook if configured (fire and forget)
          if (resolved.webhookUrl) {
            const pdfB64 = pdfBuffer.toString('base64');
            dispatchToWebhook(
              resolved.webhookUrl,
              resolved.webhookFormat,
              labMetadata?.labNo || normalized.patientId,
              normalized.patientName || '',
              pdfB64,
            ).then(result => {
              updateReportDispatchStatus(
                labMetadata?.labNo || normalized.patientId,
                tenantId,
                result,
              );
              if (result.success) {
                app.log.info({ tenantId, labNo: labMetadata?.labNo }, 'Webhook dispatched');
              } else {
                app.log.warn({ tenantId, labNo: labMetadata?.labNo, reason: result.message }, 'Webhook dispatch failed');
              }
            }).catch(err => app.log.error({ err }, 'Webhook dispatch error'));
          }

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
          app.log.error({ err }, 'PDF generation failed');

          // Save failed report
          saveFailedReport(
            labMetadata?.labNo || normalized.patientId,
            tenantId,
            labMetadata?.org || tenantId,
            String(err),
          ).catch(() => {});

          return reply.code(500).send(
            errorResponse('PDF_GENERATION_FAILED', 'Failed to generate PDF. Please try again.'),
          );
        }
      }

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

/**
 * Builds and saves a report document to MongoDB.
 */
async function saveReportToDb(
  normalized: NormalizedReport,
  metadata: LabMetadata | undefined,
  mappingResult: MappingPipelineResult | undefined,
  pdfSize: number,
  tenantId: string,
  result: { overallScore: number; overallSeverity: string },
): Promise<void> {
  // Collect abnormal parameters across all profiles
  const abnormalParameters = normalized.profiles.flatMap(profile =>
    profile.parameters
      .filter(p => p.status !== 'normal')
      .map(p => ({
        name: p.name,
        value: p.value,
        min: p.range?.min,
        max: p.range?.max,
        unit: p.unit,
        profile: profile.name,
      })),
  );

  const normalCount = normalized.profiles.reduce((sum, p) => sum + p.normalCount, 0);
  const abnormalCount = normalized.profiles.reduce((sum, p) => sum + p.abnormalCount, 0);

  await saveReport({
    labNo: metadata?.labNo || normalized.patientId,
    tenantId,
    org: metadata?.org || tenantId,
    centre: metadata?.centre || tenantId,
    patientName: normalized.patientName || '',
    age: normalized.age,
    gender: normalized.gender,
    packageName: metadata?.packageName,
    referredBy: metadata?.referredBy,
    totalParameters: mappingResult?.totalParameters || (normalCount + abnormalCount),
    mappedCount: mappingResult?.mappedParameters || (normalCount + abnormalCount),
    unmappedCount: mappingResult?.unmappedParameters.length || 0,
    unmappedParameters: mappingResult?.unmappedParameters || [],
    normalCount,
    abnormalCount,
    abnormalParameters,
    overallScore: result.overallScore,
    overallSeverity: result.overallSeverity,
    patientId: normalized.patientId,
    pdfSize,
    status: 'completed',
    createdAt: new Date(),
  });
}
