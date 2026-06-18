/**
 * Storage Routes
 *
 * Generates pre-signed S3 URLs for downloading report PDFs and input JSONs.
 * Admin-only. The frontend redirects the browser to the signed URL for download.
 *
 *   GET /admin/reports/:id/pdf    — Pre-signed URL to download the PDF
 *   GET /admin/reports/:id/input  — Pre-signed URL to download the input JSON
 */

import type { FastifyInstance } from 'fastify';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ObjectId } from 'mongodb';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { getDb } from '../../database/connection';
import { COLLECTIONS } from '../../database/collections';
import { successResponse, errorResponse } from '../../shared/utils/response.utils';

const BUCKET = process.env.S3_BUCKET || 'pragnya-smart-reports';
const REGION = 'ap-south-1'; // Hardcoded — bucket is in Mumbai
const SIGNED_URL_EXPIRY = 900; // 15 minutes

const s3 = new S3Client({ region: REGION });

export async function storageRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireRole('admin', 'superadmin'));

  /**
   * GET /admin/reports/:id/pdf
   * Returns a pre-signed S3 URL for downloading the report PDF.
   */
  app.get('/admin/reports/:id/pdf', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!ObjectId.isValid(id)) {
      return reply.code(400).send(errorResponse('INVALID_ID', 'Invalid report ID.'));
    }

    const db = await getDb();
    const report = await db.collection(COLLECTIONS.REPORTS).findOne(
      { _id: new ObjectId(id) },
      { projection: { s3PdfKey: 1, labNo: 1, tenantId: 1 } },
    );

    if (!report) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Report not found.'));
    }

    if (!report.s3PdfKey) {
      return reply.code(404).send(
        errorResponse('NO_PDF', 'No PDF stored in S3 for this report. It may have been generated before S3 integration.'),
      );
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: report.s3PdfKey,
      ResponseContentType: 'application/pdf',
    });

    const url = await getSignedUrl(s3, command, { expiresIn: SIGNED_URL_EXPIRY });

    return reply.code(200).send(successResponse({
      url,
      filename: `${report.labNo || 'report'}.pdf`,
      expiresIn: SIGNED_URL_EXPIRY,
    }));
  });

  /**
   * GET /admin/reports/:id/input
   * Returns a pre-signed S3 URL for downloading the original input JSON.
   */
  app.get('/admin/reports/:id/input', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!ObjectId.isValid(id)) {
      return reply.code(400).send(errorResponse('INVALID_ID', 'Invalid report ID.'));
    }

    const db = await getDb();
    const report = await db.collection(COLLECTIONS.REPORTS).findOne(
      { _id: new ObjectId(id) },
      { projection: { s3InputKey: 1, labNo: 1, tenantId: 1 } },
    );

    if (!report) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Report not found.'));
    }

    if (!report.s3InputKey) {
      return reply.code(404).send(
        errorResponse('NO_INPUT', 'No input JSON stored in S3 for this report.'),
      );
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: report.s3InputKey,
      ResponseContentType: 'application/json',
    });

    const url = await getSignedUrl(s3, command, { expiresIn: SIGNED_URL_EXPIRY });

    return reply.code(200).send(successResponse({
      url,
      filename: `${report.labNo || 'input'}.json`,
      expiresIn: SIGNED_URL_EXPIRY,
    }));
  });
}
