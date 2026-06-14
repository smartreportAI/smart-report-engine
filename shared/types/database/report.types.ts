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
  status?: string;
  profile?: string;
  profileName?: string;
}

export interface ReportDocument {
  _id?: ObjectId;

  // Identification
  labNo: string;
  tenantId: string;
  org?: string;
  centre?: string;

  // Patient info
  patientName: string;
  age: number;
  gender: string;
  referredBy?: string;
  packageName?: string;
  patientId?: string;

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
  overallSeverity?: string;

  // Output
  pdfUrl?: string;
  pdfSize?: number;

  // Status
  status: ReportStatus;
  errorMessage?: string;

  // Dispatch (webhook)
  dispatchStatus?: DispatchStatus;
  dispatchedAt?: Date;

  // Viewer
  viewerToken?: string;

  // Source & Performance
  source?: InputSource;
  generationTimeMs?: number;

  // Metadata
  createdAt: Date;
}
