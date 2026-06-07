/**
 * Report Database Service
 *
 * Saves report generation results to MongoDB.
 */

import { getDb } from './connection';

const COLLECTION = 'reports';

export interface ReportDocument {
  labNo: string;
  tenantId: string;
  org: string;
  centre: string;
  patientName: string;
  age: number;
  gender: string;
  packageName?: string;
  referredBy?: string;

  // Mapping results
  totalParameters: number;
  mappedCount: number;
  unmappedCount: number;
  unmappedParameters: string[];
  normalCount: number;
  abnormalCount: number;
  abnormalParameters: {
    name: string;
    value: number | string;
    min?: number;
    max?: number;
    unit?: string;
    profile: string;
  }[];

  // Output
  pdfUrl?: string;
  pdfSize?: number;
  status: 'completed' | 'failed';
  errorMessage?: string;

  // Time
  createdAt: Date;
}

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
