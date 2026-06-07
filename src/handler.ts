/**
 * AWS Lambda Handler
 *
 * This is the entry point when deployed to AWS Lambda.
 * It replaces the Fastify server (which is used for local dev only).
 *
 * The handler accepts the same JSON payload as the /reports/generate endpoint:
 *   - { tenantId, labData: { ... } }     → raw lab format
 *   - { tenantId, reportData: { ... } }  → pre-mapped format
 *
 * Returns:
 *   - { statusCode, body: JSON string with success/error response }
 */

import { GenerateReportBodySchema, LabInputBodySchema } from './modules/reports/report.types';
import type { ReportGenerationResult } from './modules/reports/report.types';
import { normalizeReport } from './domain/normalization/normalize-report';
import { normalizeLabInput } from './domain/normalization/normalize-input';
import { mapRawReportInput } from './core/mapping/mapping.service';
import { runMappingPipeline } from './core/test-database';
import { buildReport } from './rendering/report-builder';
import { generateMultipassPdf } from './rendering/pdf/pdf-multipass';
import { seedPageRegistry } from './core/page-registry/seed-registry';
import { CLIENT_REGISTRY } from './config/clients.config';
import type { RawReportInput } from './domain/types/input.types';
import type { LabInput } from './domain/types/lab-input.types';

// Seed page registry once on cold start
seedPageRegistry();

/* ---------------------------------------------------------------
   Types
   --------------------------------------------------------------- */

interface LambdaEvent {
  body?: string;
  isBase64Encoded?: boolean;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/* ---------------------------------------------------------------
   Helpers
   --------------------------------------------------------------- */

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function successResponse(data: unknown): LambdaResponse {
  return {
    statusCode: 200,
    headers: RESPONSE_HEADERS,
    body: JSON.stringify({ success: true, data }),
  };
}

function errorResponse(statusCode: number, code: string, message: string): LambdaResponse {
  return {
    statusCode,
    headers: RESPONSE_HEADERS,
    body: JSON.stringify({
      success: false,
      error: { code, message },
      timestamp: new Date().toISOString(),
    }),
  };
}

/* ---------------------------------------------------------------
   Handler
   --------------------------------------------------------------- */

export async function handler(event: LambdaEvent): Promise<LambdaResponse> {
  // Handle CORS preflight
  if ((event as any).httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: RESPONSE_HEADERS, body: '' };
  }

  try {
    // Parse body
    let body: Record<string, unknown>;
    try {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body || '', 'base64').toString('utf-8')
        : event.body || '{}';
      body = JSON.parse(rawBody);
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Unable to parse request body as JSON.');
    }

    // Detect input format
    const hasLabData = body !== null && typeof body === 'object' && 'labData' in body;
    const hasReportData = body !== null && typeof body === 'object' && 'reportData' in body;

    if (!hasLabData && !hasReportData) {
      return errorResponse(400, 'INVALID_BODY', 'Request must contain either "reportData" or "labData".');
    }

    let tenantId: string;
    let output: string;
    let rawReportInput: RawReportInput;

    if (hasLabData) {
      /* ---- Raw lab format ---- */
      const parsed = LabInputBodySchema.safeParse(body);
      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;
        return errorResponse(400, 'INVALID_BODY', JSON.stringify(fieldErrors));
      }

      tenantId = parsed.data.tenantId;
      output = parsed.data.output;

      // Normalize raw lab input
      const { reportInput } = normalizeLabInput(parsed.data.labData as unknown as LabInput);

      // Run mapping pipeline with client overrides
      const tenant = CLIENT_REGISTRY[tenantId];
      const mappingResult = runMappingPipeline(reportInput, {
        idMappingOverrides: tenant?.idMappingOverrides,
        profileMappingOverrides: tenant?.profileMappingOverrides,
      });

      rawReportInput = mappingResult.report;
    } else {
      /* ---- Pre-mapped format ---- */
      const parsed = GenerateReportBodySchema.safeParse(body);
      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;
        return errorResponse(400, 'INVALID_BODY', JSON.stringify(fieldErrors));
      }

      tenantId = parsed.data.tenantId;
      output = parsed.data.output;
      rawReportInput = parsed.data.reportData as unknown as RawReportInput;
    }

    // Resolve tenant
    const tenant = CLIENT_REGISTRY[tenantId];
    if (!tenant) {
      return errorResponse(404, 'TENANT_NOT_FOUND', `Tenant "${tenantId}" does not exist.`);
    }

    // Map → Normalize → Build
    const { report: mappedData } = mapRawReportInput(rawReportInput, tenant);
    const normalized = normalizeReport(mappedData);
    const result = buildReport(normalized, tenant);

    // Generate PDF or return HTML
    if (output === 'pdf') {
      const pdfBuffer = await generateMultipassPdf(result, tenant);

      return successResponse({
        pdfBase64: pdfBuffer.toString('base64'),
        overallScore: result.overallScore,
        overallSeverity: result.overallSeverity,
        renderedPages: result.renderedPages,
        skippedPages: result.skippedPages,
      });
    }

    const response: ReportGenerationResult = {
      html: result.html,
      overallScore: result.overallScore,
      overallSeverity: result.overallSeverity,
      renderedPages: result.renderedPages,
      skippedPages: result.skippedPages,
    };

    return successResponse(response);
  } catch (err) {
    console.error('Lambda handler error:', err);
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}
