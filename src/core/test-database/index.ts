/**
 * Test Database — Main Entry Point
 *
 * Provides the mapping pipeline that transforms raw lab observations
 * into properly categorized report data.
 *
 * ─────────────────────────────────────────────────────────────────────
 * MAPPING PRIORITY (highest → lowest):
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Step 1 — Client ID Override
 *    Client-specific LIS codes (e.g. "GLUF") stored per tenantId.
 *    If the client sent an unknown/incorrect ID, this misses and
 *    the pipeline naturally falls through to Step 2.
 *
 *  Step 2 — Global BM ID
 *    Standard BioMarker IDs (BM0001–BM9999) from id-mapping.ts.
 *    Covers all direct LIS integrations.
 *
 *  Step 3 — Standard Name Exact Match
 *    Case-insensitive match against known standard names in
 *    profile-mapping.ts. Covers cases where:
 *      (a) The observationId was wrong/unknown but testName matches.
 *      (b) Portal/AI-parsed input where id and name are identical.
 *
 *  Step 4 — Alias Lookup
 *    Curated table of common abbreviations and name variants.
 *    Covers portal AI outputs like "FBS", "hba1c", "LDL-C", etc.
 *
 *  Step 5 — Ungrouped
 *    No match. Parameter goes to "Ungrouped" and is logged.
 *
 * ─────────────────────────────────────────────────────────────────────
 */

import { DEFAULT_ID_MAPPING } from './id-mapping';
import { DEFAULT_PROFILE_MAPPING } from './profile-mapping';
import { resolveAlias } from './name-normalizer';
import type { RawReportInput, RawProfileInput, RawParameterInput } from '../../domain/types/input.types';

export interface MappingOverrides {
  /** Client-specific ID overrides (take priority over global BM ID mapping) */
  idMappingOverrides?: Record<string, string>;
  /** Client-specific profile overrides (remap standard name → different profile) */
  profileMappingOverrides?: Record<string, string>;
}

export interface MappingPipelineResult {
  /** Report with parameters redistributed into proper profiles */
  report: RawReportInput;
  /** Parameter names that went to Ungrouped (no mapping found) */
  unmappedParameters: string[];
  /** Total parameters processed */
  totalParameters: number;
  /** Parameters successfully mapped to a named profile */
  mappedParameters: number;
  /** Per-parameter resolution detail — useful for admin debugging */
  resolutionLog: ResolutionLogEntry[];
}

/** Describes how a single parameter was resolved */
export interface ResolutionLogEntry {
  observationId?: string;
  testName: string;
  resolvedName?: string;
  resolvedProfile?: string;
  resolvedVia: 'client-id-override' | 'global-bm-id' | 'name-exact' | 'alias' | 'ungrouped';
}

/**
 * Step 1 + 2: Resolve standard name from observationId.
 *
 * Priority:
 *   a. Client ID override (client-specific LIS codes)
 *   b. Global BM ID (standard BioMarker IDs)
 */
function resolveNameFromId(
  id: string,
  idOverrides?: Record<string, string>,
): { name: string; via: 'client-id-override' | 'global-bm-id' } | undefined {
  if (!id || id.trim() === '') return undefined;
  const trimmedId = id.trim();

  if (idOverrides?.[trimmedId]) {
    return { name: idOverrides[trimmedId], via: 'client-id-override' };
  }

  const globalMatch = DEFAULT_ID_MAPPING[trimmedId];
  if (globalMatch) {
    return { name: globalMatch, via: 'global-bm-id' };
  }

  return undefined;
}

/**
 * Step 3 + 4: Resolve standard name from testName.
 *
 * Step 3 — Exact match (case-insensitive) against known standard names.
 * Step 4 — Alias lookup (common abbreviations and portal AI variants).
 */
function resolveNameFromName(
  name: string,
  profileOverrides?: Record<string, string>,
): { name: string; via: 'name-exact' | 'alias' } | undefined {
  if (!name || name.trim() === '') return undefined;
  const trimmedName = name.trim();
  const lowerName = trimmedName.toLowerCase();

  // Step 3a: Exact match in default profile mapping
  if (DEFAULT_PROFILE_MAPPING[trimmedName]) {
    return { name: trimmedName, via: 'name-exact' };
  }

  // Step 3b: Exact match in client profile overrides
  if (profileOverrides?.[trimmedName]) {
    return { name: trimmedName, via: 'name-exact' };
  }

  // Step 3c: Case-insensitive match in default profile mapping
  for (const key of Object.keys(DEFAULT_PROFILE_MAPPING)) {
    if (key.toLowerCase() === lowerName) {
      return { name: key, via: 'name-exact' };
    }
  }

  // Step 3d: Case-insensitive match in client profile overrides
  if (profileOverrides) {
    for (const key of Object.keys(profileOverrides)) {
      if (key.toLowerCase() === lowerName) {
        return { name: key, via: 'name-exact' };
      }
    }
  }

  // Step 4: Alias lookup — curated variants and abbreviations
  const aliasResolved = resolveAlias(trimmedName);
  if (aliasResolved) {
    return { name: aliasResolved, via: 'alias' };
  }

  return undefined;
}

/**
 * Resolve which profile a standard name belongs to.
 * Client profileMappingOverrides take priority over global defaults.
 */
function resolveProfile(
  standardName: string,
  profileOverrides?: Record<string, string>,
): string {
  if (profileOverrides?.[standardName]) return profileOverrides[standardName];
  return DEFAULT_PROFILE_MAPPING[standardName] || 'Ungrouped';
}

/**
 * Main mapping pipeline.
 *
 * Takes a RawReportInput (all params in "Ungrouped" from normalize-input)
 * and redistributes them into proper health profiles.
 *
 * Per-parameter priority:
 *   1. Client ID override → 2. Global BM ID → 3. Name exact → 4. Alias → 5. Ungrouped
 */
export function runMappingPipeline(
  input: RawReportInput,
  overrides?: MappingOverrides,
): MappingPipelineResult {
  const profileBuckets = new Map<string, RawParameterInput[]>();
  const unmappedParameters: string[] = [];
  const resolutionLog: ResolutionLogEntry[] = [];
  let totalParameters = 0;
  let mappedParameters = 0;

  for (const profile of input.profiles) {
    for (const param of profile.parameters) {
      totalParameters++;

      const obsId = param.observationId?.trim();
      const testName = param.testName?.trim() || '';

      let resolvedName: string | undefined;
      let resolvedVia: ResolutionLogEntry['resolvedVia'] = 'ungrouped';

      // Steps 1 & 2: Try ID-based resolution first
      if (obsId) {
        const idResult = resolveNameFromId(obsId, overrides?.idMappingOverrides);
        if (idResult) {
          resolvedName = idResult.name;
          resolvedVia = idResult.via;
        }
      }

      // Steps 3 & 4: Fall back to name-based resolution
      // Runs when: ID was missing, wrong, or not in any mapping
      if (!resolvedName) {
        const nameResult = resolveNameFromName(testName, overrides?.profileMappingOverrides);
        if (nameResult) {
          resolvedName = nameResult.name;
          resolvedVia = nameResult.via;
        }
      }

      // Step 5: Profile resolution or Ungrouped
      let profileName: string;
      if (resolvedName) {
        profileName = resolveProfile(resolvedName, overrides?.profileMappingOverrides);
        mappedParameters++;
      } else {
        profileName = 'Ungrouped';
        resolvedVia = 'ungrouped';
        unmappedParameters.push(testName || obsId || 'unknown');
      }

      resolutionLog.push({
        observationId: obsId,
        testName,
        resolvedName,
        resolvedProfile: resolvedName ? profileName : undefined,
        resolvedVia,
      });

      // Normalize display name to canonical standard name
      const finalParam: RawParameterInput = {
        ...param,
        testName: resolvedName || testName,
      };

      if (!profileBuckets.has(profileName)) {
        profileBuckets.set(profileName, []);
      }
      profileBuckets.get(profileName)!.push(finalParam);
    }
  }

  const profiles: RawProfileInput[] = [];
  for (const [profileName, parameters] of profileBuckets) {
    profiles.push({ profileName, parameters });
  }

  return {
    report: { ...input, profiles },
    unmappedParameters,
    totalParameters,
    mappedParameters,
    resolutionLog,
  };
}

// Re-export for direct access
export { DEFAULT_ID_MAPPING } from './id-mapping';
export { DEFAULT_PROFILE_MAPPING } from './profile-mapping';
export { resolveAlias, getAllAliases } from './name-normalizer';
