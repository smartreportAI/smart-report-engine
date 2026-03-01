import type {
    AuditRecord,
    EngineMetadata,
    NormalizedSummary,
} from './audit.types';
import type { NormalizedReport } from '../domain/models/report.model';
import { generateInputHash, generateReportId } from './audit.utils';
import { saveAuditRecord } from './storage/file.storage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENGINE_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parameters required to create an audit record.
 */
export interface CreateAuditParams {
    tenantId: string;
    /** The raw input payload (before mapping/normalization). */
    rawInput: unknown;
    /** Mapping warnings (empty if no mapping or fully mapped). */
    mappingWarnings: string[];
    /** The normalized report (after normalizeReport()). */
    normalized: NormalizedReport;
    /** Source format: json, fhir, hl7, or cli. */
    source: 'json' | 'fhir' | 'hl7' | 'cli';
}

/**
 * Creates a complete AuditRecord from pipeline context.
 *
 * This is a pure function — it generates a reportId and inputHash,
 * captures engine metadata, and assembles the record.
 * It does NOT persist; call `recordAudit()` to save.
 */
export function createAuditRecord(params: CreateAuditParams): AuditRecord {
    const reportId = generateReportId();

    const engineMetadata: EngineMetadata = {
        engineVersion: ENGINE_VERSION,
        nodeVersion: process.version,
    };

    const inputHash = generateInputHash({
        input: params.rawInput,
        tenant: params.tenantId,
        engine: engineMetadata,
    });

    const normalizedSummary: NormalizedSummary = {
        overallScore: params.normalized.overallScore,
        overallSeverity: params.normalized.overallSeverity,
        profileCount: params.normalized.profiles.length,
        parameterCount: params.normalized.profiles.reduce(
            (sum, p) => sum + p.parameters.length,
            0,
        ),
    };

    return {
        reportId,
        tenantId: params.tenantId,
        inputHash,
        engineMetadata,
        mappingWarnings: params.mappingWarnings,
        normalizedSummary,
        source: params.source,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Persists an AuditRecord to the file store.
 *
 * @param record  - The audit record to save.
 * @param baseDir - Optional override for the output directory.
 * @returns Absolute path to the saved audit file.
 */
export function recordAudit(record: AuditRecord, baseDir?: string): string {
    if (process.env.DISABLE_AUDIT === 'true') {
        return 'audit-disabled-locally';
    }
    return saveAuditRecord(record, baseDir);
}
