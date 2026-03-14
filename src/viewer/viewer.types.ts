import type { ParameterStatus } from '../domain/models/parameter.model';
import type { ProfileSeverity } from '../domain/models/profile.model';
import type { OverallSeverity } from '../domain/models/report.model';

// ---------------------------------------------------------------------------
// Viewer Token Record — stored in viewer/tokens/<token>.json
// ---------------------------------------------------------------------------

export interface ViewerTokenRecord {
    token: string;
    fingerprint: string;
    tenantId: string;
    patientId: string;
    reportDisplayId: string;
    reportDate: string;
    createdAt: string;
    expiresAt: string;
}

// ---------------------------------------------------------------------------
// Viewer Payload — stored in viewer/data/<token>.json (patient-safe only)
// ---------------------------------------------------------------------------

export interface ViewerParameter {
    name: string;
    value: number | string;
    unit?: string;
    range?: { min?: number; max?: number };
    status: ParameterStatus;
}

export interface ViewerProfile {
    name: string;
    severity: ProfileSeverity;
    abnormalCount: number;
    normalCount: number;
    parameters: ViewerParameter[];
}

export interface ViewerBranding {
    labName: string;
    logoUrl: string;
    primaryColor: string;
    secondaryColor?: string;
    accentHealthy?: string;
    accentMonitor?: string;
    accentAttention?: string;
    contactEmail?: string;
    contactPhone?: string;
}

export interface ViewerPayload {
    reportId: string;
    reportDate: string;
    patientName?: string;
    patientId: string;
    age: number;
    gender: string;
    overallScore: number;
    overallSeverity: OverallSeverity;
    profiles: ViewerProfile[];
    recommendations?: string[];
    branding: ViewerBranding;
}
