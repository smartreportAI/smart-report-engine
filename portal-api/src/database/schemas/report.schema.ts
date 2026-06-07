/**
 * Report Schema
 *
 * This is the SAME collection written by the Report Engine.
 * The Portal API only READS from this collection (never writes).
 * The Report Engine writes after each generation.
 *
 * Design decisions:
 *   - labNo + tenantId together identify a unique report
 *   - abnormalParameters stores detailed info for flagged results
 *   - source tracks where the input came from (json/fhir/hl7)
 *   - overallScore + overallSeverity are pre-computed for fast dashboard queries
 *   - pdfUrl will hold S3 URL (future)
 *   - viewerToken links to the patient mobile viewer
 *
 * For the admin dashboard:
 *   - List all reports across all clients (with filters)
 *   - View report detail (patient info, abnormals, mapping stats)
 *   - Track failures, unmapped parameters
 *   - Charts: reports per day/week/month, per client
 *
 * For the client dashboard:
 *   - List their reports (scoped by tenantId)
 *   - View report detail
 *   - Download PDF
 *   - See trends (how many reports per day)
 */

import type { ObjectId } from 'mongodb';

export type ReportStatus = 'completed' | 'failed' | 'pending';
export type DispatchStatus = 'sent' | 'failed' | 'pending' | 'none';
export type InputSource = 'json' | 'fhir' | 'hl7';

export interface AbnormalParameter {
  name: string;
  value: number | string;
  unit?: string;
  min?: number;
  max?: number;
  status: string;                 // 'high' | 'low' | 'critical'
  profileName: string;
}

export interface ReportDocument {
  _id?: ObjectId;

  // Identification
  labNo: string;
  tenantId: string;

  // Patient info
  patientName: string;
  age: number;
  gender: string;
  referredBy?: string;
  packageName?: string;
  patientId?: string;             // internal patient ID

  // Mapping stats
  totalParameters: number;
  mappedCount: number;
  unmappedCount: number;
  unmappedParameters: string[];

  // Results
  normalCount: number;
  abnormalCount: number;
  abnormalParameters: AbnormalParameter[];
  overallScore?: number;
  overallSeverity?: string;       // 'stable' | 'monitor' | 'critical'

  // Output
  pdfUrl?: string;                // S3 URL (future)
  pdfSize?: number;               // bytes

  // Status
  status: ReportStatus;
  errorMessage?: string;

  // Dispatch (webhook)
  dispatchStatus: DispatchStatus;
  dispatchedAt?: Date;

  // Viewer
  viewerToken?: string;

  // Source & Performance
  source: InputSource;
  generationTimeMs?: number;

  // Metadata
  createdAt: Date;
}
