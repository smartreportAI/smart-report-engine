/**
 * Audit & traceability types for report generation.
 *
 * Every report generation produces an AuditRecord that captures
 * the input fingerprint, mapping warnings, normalized summary,
 * and engine metadata for full traceability.
 */

export interface EngineMetadata {
    /** Semantic version of the Smart Report Engine. */
    engineVersion: string;
    /** Node.js runtime version (e.g. "v20.11.0"). */
    nodeVersion: string;
}

export interface NormalizedSummary {
    overallScore: number;
    overallSeverity: string;
    profileCount: number;
    parameterCount: number;
}

export interface AuditRecord {
    /** Unique identifier for this report generation (UUID v4). */
    reportId: string;
    /** Tenant that requested the report. */
    tenantId: string;
    /** SHA-256 hash of the canonical input + tenant + engine metadata. */
    inputHash: string;
    /** Engine runtime metadata at generation time. */
    engineMetadata: EngineMetadata;
    /** Parameters that had no mapping entry (empty if all mapped or no mapping). */
    mappingWarnings: string[];
    /** Summary of the normalized report (no PHI). */
    normalizedSummary: NormalizedSummary;
    /** Source format that produced this report. */
    source: 'json' | 'fhir' | 'hl7' | 'cli';
    /** ISO-8601 timestamp of report generation. */
    timestamp: string;
}
