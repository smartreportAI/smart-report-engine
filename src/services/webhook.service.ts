/**
 * Webhook Dispatch Service
 *
 * After PDF generation, sends the report to the client's webhook URL.
 * Each client can configure:
 *   - webhookUrl: where to POST
 *   - webhookFormat: what body shape the client expects
 *
 * This runs as "fire and forget" — doesn't block the API response.
 * Dispatch status is saved to the report document in MongoDB.
 */

import { getDb } from '../database';

const DISPATCH_TIMEOUT_MS = 10000; // 10 seconds

export interface WebhookDispatchResult {
  success: boolean;
  statusCode?: number;
  message?: string;
}

/**
 * Sends the generated PDF to the client's webhook URL.
 *
 * @param webhookUrl - The URL to POST to
 * @param webhookFormat - Body format: "default" | "base64_only" | "custom"
 * @param labNo - Lab number for the report
 * @param patientName - Patient name
 * @param pdfBase64 - PDF as base64 string
 */
export async function dispatchToWebhook(
  webhookUrl: string,
  webhookFormat: string | undefined,
  labNo: string,
  patientName: string,
  pdfBase64: string,
): Promise<WebhookDispatchResult> {
  if (!webhookUrl) {
    return { success: false, message: 'No webhook URL configured' };
  }

  try {
    // Build request body based on format
    const body = buildWebhookBody(webhookFormat || 'default', labNo, patientName, pdfBase64);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DISPATCH_TIMEOUT_MS);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      return { success: true, statusCode: response.status, message: 'Dispatched successfully' };
    }

    return {
      success: false,
      statusCode: response.status,
      message: `Webhook returned ${response.status}`,
    };
  } catch (err: any) {
    const message = err.name === 'AbortError'
      ? 'Webhook timed out'
      : `Webhook error: ${err.message}`;
    return { success: false, message };
  }
}

/**
 * Builds the webhook request body based on client's expected format.
 */
function buildWebhookBody(
  format: string,
  labNo: string,
  patientName: string,
  pdfBase64: string,
): Record<string, unknown> {
  switch (format) {
    case 'base64_only':
      // Some clients just want the base64 PDF
      return {
        LabNo: labNo,
        PdfDataBase64: pdfBase64,
      };

    case 'full':
      // Full details
      return {
        LabNo: labNo,
        PName: patientName,
        PdfDataBase64: pdfBase64,
        Encodedata: pdfBase64,
        Encodedata_header: pdfBase64,
      };

    case 'default':
    default:
      // Standard format
      return {
        LabNo: labNo,
        PName: patientName,
        PdfDataBase64: pdfBase64,
      };
  }
}

/**
 * Updates the report document with dispatch status.
 */
export async function updateReportDispatchStatus(
  labNo: string,
  tenantId: string,
  result: WebhookDispatchResult,
): Promise<void> {
  try {
    const db = await getDb();
    await db.collection('reports').updateOne(
      { labNo, tenantId, status: 'completed' },
      {
        $set: {
          dispatchStatus: result.success ? 'sent' : 'failed',
          dispatchMessage: result.message,
          dispatchedAt: result.success ? new Date() : undefined,
        },
      },
      { sort: { createdAt: -1 } },
    );
  } catch {
    // Don't throw — this is non-critical
  }
}
