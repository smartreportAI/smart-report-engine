/**
 * Report Database Service
 *
 * Saves report generation results to MongoDB.
 */

import { getDb } from './connection';
import type { ReportDocument } from '@smart-report/shared-types';

const COLLECTION = 'reports';

/**
 * Save a report document after successful generation.
 */
export async function saveReport(report: ReportDocument): Promise<string> {
  const db = await getDb();
  const result = await db.collection(COLLECTION).insertOne(report);
  return result.insertedId.toString();
}

/**
 * Mark a report as failed.
 */
export async function saveFailedReport(
  labNo: string,
  tenantId: string,
  org: string,
  errorMessage: string,
): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).insertOne({
    labNo,
    tenantId,
    org,
    status: 'failed',
    errorMessage,
    createdAt: new Date(),
  });
}
