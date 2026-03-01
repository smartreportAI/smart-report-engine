import type { MappingEntry } from './mapping.types';

/**
 * Pre-built lookup index for efficient parameter→mapping resolution.
 *
 * Keys are lowercased for case-insensitive matching.
 */
export interface MappingIndex {
    byCode: Map<string, MappingEntry>;
    byDisplay: Map<string, MappingEntry>;
}

/**
 * Builds a case-insensitive lookup index from mapping entries.
 *
 * Two separate maps are created:
 *   1. `byCode`    — keyed on `externalCode.toLowerCase()`
 *   2. `byDisplay` — keyed on `externalDisplay.toLowerCase()` (when provided)
 *
 * @param entries - Array of MappingEntry from the tenant config.
 */
export function buildMappingIndex(entries: MappingEntry[]): MappingIndex {
    const byCode = new Map<string, MappingEntry>();
    const byDisplay = new Map<string, MappingEntry>();

    for (const entry of entries) {
        byCode.set(entry.externalCode.toLowerCase(), entry);

        if (entry.externalDisplay) {
            byDisplay.set(entry.externalDisplay.toLowerCase(), entry);
        }
    }

    return { byCode, byDisplay };
}

/**
 * Finds a MappingEntry for a given test name.
 *
 * Resolution order:
 *   1. Exact match on `externalCode` (case-insensitive)
 *   2. Exact match on `externalDisplay` (case-insensitive)
 *   3. `undefined` (no match)
 *
 * @param testName - The raw test name from the ingested report.
 * @param index    - Pre-built mapping index.
 */
export function findMappingEntry(
    testName: string,
    index: MappingIndex,
): MappingEntry | undefined {
    const normalized = testName.toLowerCase();
    return index.byCode.get(normalized) ?? index.byDisplay.get(normalized);
}
