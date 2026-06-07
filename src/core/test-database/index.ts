/**
 * Test Database — Main Entry Point
 *
 * This module provides the mapping pipeline that transforms raw lab
 * observations into properly categorized report data.
 *
 * Mapping flow:
 *   1. Try ID mapping (observation.id → standard name)
 *   2. If ID not found, try name mapping (observation.name → standard name)
 *   3. Use standard name to find profile assignment
 *   4. If profile not found, put into "Ungrouped" profile
 *
 * Client overrides:
 *   - Pass idOverrides to override/extend the default ID mapping
 *   - Pass profileOverrides to override/extend the default profile mapping
 */

import { DEFAULT_ID_MAPPING } from './id-mapping';
import { DEFAULT_PROFILE_MAPPING } from './profile-mapping';
import type { RawReportInput, RawProfileInput, RawParameterInput } from '../../domain/types/input.types';

export interface MappingOverrides {
  /** Client-specific ID overrides (take priority over defaults) */
  idMappingOverrides?: Record<string, string>;
  /** Client-specific profile overrides (take priority over defaults) */
  profileMappingOverrides?: Record<string, string>;
}

export interface MappingPipelineResult {
  /** Report with parameters grouped into proper profiles */
  report: RawReportInput;
  /** Parameters that couldn't be mapped (went to Ungrouped) */
  unmappedParameters: string[];
  /** Total parameters processed */
  totalParameters: number;
  /** Parameters successfully mapped to a profile */
  mappedParameters: number;
}

/**
 * Resolves a standard test name from an observation ID.
 * Checks client overrides first, then falls back to defaults.
 */
function resolveNameFromId(
  id: string,
  idOverrides?: Record<string, string>,
): string | undefined {
  if (!id || id.trim() === '') return undefined;
  const trimmedId = id.trim();

  // Client override takes priority
  if (idOverrides?.[trimmedId]) return idOverrides[trimmedId];

  // Then check default mapping
  return DEFAULT_ID_MAPPING[trimmedId];
}

/**
 * Resolves a standard test name from an observation name (fuzzy).
 * Checks the profile mapping keys as "known names".
 * Uses case-insensitive matching.
 */
function resolveNameFromName(
  name: string,
  profileOverrides?: Record<string, string>,
): string | undefined {
  if (!name || name.trim() === '') return undefined;
  const trimmedName = name.trim();

  // Exact match in profile mapping (this name IS a standard name)
  if (DEFAULT_PROFILE_MAPPING[trimmedName]) return trimmedName;
  if (profileOverrides?.[trimmedName]) return trimmedName;

  // Case-insensitive match
  const lowerName = trimmedName.toLowerCase();
  for (const key of Object.keys(DEFAULT_PROFILE_MAPPING)) {
    if (key.toLowerCase() === lowerName) return key;
  }
  if (profileOverrides) {
    for (const key of Object.keys(profileOverrides)) {
      if (key.toLowerCase() === lowerName) return key;
    }
  }

  return undefined;
}

/**
 * Resolves which profile a test belongs to.
 * Checks client overrides first, then defaults.
 */
function resolveProfile(
  standardName: string,
  profileOverrides?: Record<string, string>,
): string {
  // Client override takes priority
  if (profileOverrides?.[standardName]) return profileOverrides[standardName];

  // Default mapping
  return DEFAULT_PROFILE_MAPPING[standardName] || 'Ungrouped';
}

/**
 * Main mapping pipeline.
 *
 * Takes a RawReportInput (with all params in "Ungrouped" profile from normalize-input)
 * and redistributes parameters into proper health profiles using the test database.
 *
 * Flow for each parameter:
 *   1. If parameter has an ID → look up standard name via ID mapping
 *   2. If no ID match → try matching by name
 *   3. Once we have a standard name → look up profile
 *   4. If no profile found → stays in "Ungrouped"
 */
export function runMappingPipeline(
  input: RawReportInput,
  overrides?: MappingOverrides,
): MappingPipelineResult {
  const profileBuckets = new Map<string, RawParameterInput[]>();
  const unmappedParameters: string[] = [];
  let totalParameters = 0;
  let mappedParameters = 0;

  // Process all parameters from all input profiles
  for (const profile of input.profiles) {
    for (const param of profile.parameters) {
      totalParameters++;

      let standardName: string | undefined;

      // Step 1: Try ID mapping using the observationId field
      if (param.observationId) {
        standardName = resolveNameFromId(param.observationId, overrides?.idMappingOverrides);
      }

      // Step 2: If ID didn't match, try name matching
      if (!standardName) {
        standardName = resolveNameFromName(param.testName, overrides?.profileMappingOverrides);
      }

      // Step 3: Resolve profile
      let profileName: string;
      if (standardName) {
        profileName = resolveProfile(standardName, overrides?.profileMappingOverrides);
        mappedParameters++;
      } else {
        profileName = 'Ungrouped';
        unmappedParameters.push(param.testName);
      }

      // Use standard name as testName if we resolved one (normalize display)
      const finalParam: RawParameterInput = {
        ...param,
        testName: standardName || param.testName,
      };

      if (!profileBuckets.has(profileName)) {
        profileBuckets.set(profileName, []);
      }
      profileBuckets.get(profileName)!.push(finalParam);
    }
  }

  // Build output profiles
  const profiles: RawProfileInput[] = [];
  for (const [profileName, parameters] of profileBuckets) {
    profiles.push({ profileName, parameters });
  }

  return {
    report: {
      ...input,
      profiles,
    },
    unmappedParameters,
    totalParameters,
    mappedParameters,
  };
}

// Re-export for direct access if needed
export { DEFAULT_ID_MAPPING } from './id-mapping';
export { DEFAULT_PROFILE_MAPPING } from './profile-mapping';
