import type { NormalizedReport } from '../domain/models/report.model';
import type { TenantConfig } from '../modules/tenants/tenant.types';
import type { ViewerPayload, ViewerProfile, ViewerParameter } from './viewer.types';

/**
 * Builds a patient-safe ViewerPayload from the normalized report and tenant config.
 * Deliberately excludes internal fields (fingerprint, UUIDs, raw HTML, signalScores, etc.).
 */
export function buildViewerPayload(
    normalized: NormalizedReport,
    tenantConfig: TenantConfig,
    reportDisplayId: string,
    reportDate: string,
): ViewerPayload {
    const branding = tenantConfig.branding;

    const profiles: ViewerProfile[] = normalized.profiles.map(profile => {
        const parameters: ViewerParameter[] = profile.parameters.map(param => ({
            name: param.name,
            value: param.value,
            unit: param.unit,
            range: param.range,
            status: param.status,
        }));

        return {
            name: profile.name,
            severity: profile.severity,
            abnormalCount: profile.abnormalCount,
            normalCount: profile.normalCount,
            parameters,
        };
    });

    return {
        reportId: reportDisplayId,
        reportDate,
        patientName: normalized.patientName,
        patientId: normalized.patientId,
        age: normalized.age,
        gender: normalized.gender,
        overallScore: normalized.overallScore,
        overallSeverity: normalized.overallSeverity,
        profiles,
        recommendations: normalized.aiAssessment?.overallRecommendations,
        branding: {
            labName: branding.labName,
            logoUrl: branding.logoUrl,
            primaryColor: branding.primaryColor,
            secondaryColor: branding.secondaryColor,
            accentHealthy: branding.accentHealthy,
            accentMonitor: branding.accentMonitor,
            accentAttention: branding.accentAttention,
            contactEmail: branding.contactEmail,
            contactPhone: branding.contactPhone,
        },
    };
}
