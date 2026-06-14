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
    labNo: string;
    tenantId: string;
    org?: string;
    centre?: string;
    patientName: string;
    age: number;
    gender: string;
    referredBy?: string;
    packageName?: string;
    patientId?: string;
    totalParameters: number;
    mappedCount: number;
    unmappedCount: number;
    unmappedParameters: string[];
    normalCount: number;
    abnormalCount: number;
    abnormalParameters: AbnormalParameter[];
    overallScore?: number;
    overallSeverity?: string;
    pdfUrl?: string;
    pdfSize?: number;
    status: ReportStatus;
    errorMessage?: string;
    dispatchStatus?: DispatchStatus;
    dispatchedAt?: Date;
    viewerToken?: string;
    source?: InputSource;
    generationTimeMs?: number;
    createdAt: Date;
}
//# sourceMappingURL=report.types.d.ts.map