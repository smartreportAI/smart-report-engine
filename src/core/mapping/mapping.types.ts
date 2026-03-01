/**
 * Tenant-scoped parameter mapping types.
 *
 * A MappingEntry describes how an external lab code/name maps to
 * the engine's internal parameter ID and profile grouping.
 */

export interface MappingRangeOverride {
    min?: number;
    max?: number;
    text?: string;
}

export interface MappingEntry {
    /** External lab code to match against (e.g. LOINC code, LIS code). */
    externalCode: string;
    /** Optional external display name to match against as fallback. */
    externalDisplay?: string;
    /** Internal canonical parameter identifier to map to. */
    internalParameterId: string;
    /** Internal profile name the parameter should be grouped under. */
    internalProfileName: string;
    /** Optional unit override — replaces the source unit. */
    unitOverride?: string;
    /** Optional reference range override — replaces the source range. */
    rangeOverride?: MappingRangeOverride;
}

export interface TenantMappingConfig {
    parameters: MappingEntry[];
}

/**
 * Result of a mapping operation.
 *
 * - `report` is the mapped RawReportInput ready for normalizeReport().
 * - `unmappedParameters` lists testNames that had no matching entry,
 *   useful for logging/debugging in non-strict mode.
 */
export interface MappingResult {
    report: import('../../domain/types/input.types').RawReportInput;
    unmappedParameters: string[];
}
