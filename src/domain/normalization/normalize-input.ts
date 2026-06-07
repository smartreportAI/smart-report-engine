/**
 * normalize-input.ts
 *
 * Transforms raw lab JSON (the format labs actually send) into
 * the clean RawReportInput that the rest of the engine expects.
 *
 * This is the bridge between messy real-world lab data and
 * our typed internal model.
 */

import type { LabInput, LabObservation, LabInvestigation } from '../types/lab-input.types';
import type { RawReportInput, RawProfileInput, RawParameterInput, Gender } from '../types/input.types';

/**
 * Metadata extracted from the lab input that doesn't fit into
 * the report data model but is needed for rendering (header, footer, etc.)
 */
export interface LabMetadata {
  org: string;
  centre: string;
  labNo: string;
  workOrderId?: string;
  referredBy?: string;
  patientMobile?: string;
  patientCategory?: string;
  packageName?: string;
  barcodeNo?: string;
  sampleCollDate?: string;
  approvalDate?: string;
  hasPastData: boolean;
}

/**
 * Result of normalizing a raw lab input.
 */
export interface NormalizeInputResult {
  /** Clean report data ready for the mapping pipeline */
  reportInput: RawReportInput;
  /** Lab metadata for header/footer/cover rendering */
  metadata: LabMetadata;
  /** Observations that were skipped (empty value, invalid, etc.) */
  skippedObservations: string[];
}

/**
 * Normalizes gender from various formats labs send.
 */
function normalizeGender(raw: string): Gender {
  const g = raw.trim().toLowerCase();
  if (g === 'm' || g === 'male') return 'male';
  if (g === 'f' || g === 'female') return 'female';
  return 'other';
}

/**
 * Extracts numeric age from various formats labs send.
 * Handles: "35", "35 Years", "35Y", 35, "2 Months", etc.
 */
function normalizeAge(raw: string | number): number {
  if (typeof raw === 'number') return raw;
  const str = raw.trim();

  // Try direct parse
  const direct = parseInt(str, 10);
  if (!isNaN(direct)) return direct;

  // Try extracting number from strings like "35 Years"
  const match = str.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);

  return 0; // Fallback
}

/**
 * Cleans a value string — removes special chars like >, <, = that labs
 * sometimes include in range or value fields.
 */
function cleanNumericString(val: string): string {
  if (!val) return '';
  return val.replace(/[><= ]/g, '').trim();
}

/**
 * Checks if an observation should be included in the report.
 * Filters out empty values, headers, comments, etc.
 */
function isValidObservation(obs: LabObservation): boolean {
  // Skip if no value
  if (!obs.value || obs.value.trim() === '') return false;

  // Skip known invalid entries
  const invalidNames = ['HEAD', 'Head', '- action suggested', 'Comment', 'Comment:', 'Comment.', 'Comment..', 'Comment,', 'Comment.,', 'Comment :', 'Others', 'Others.'];
  if (invalidNames.includes(obs.name?.trim())) return false;

  // Skip if name is empty
  if (!obs.name || obs.name.trim() === '') return false;

  return true;
}

/**
 * Converts a single lab observation into a RawParameterInput.
 */
function observationToParameter(obs: LabObservation): RawParameterInput {
  const minStr = cleanNumericString(obs.MinValue);
  const maxStr = cleanNumericString(obs.MaxValue);
  const minVal = minStr ? parseFloat(minStr) : undefined;
  const maxVal = maxStr ? parseFloat(maxStr) : undefined;

  // Determine reference range
  const hasMin = minVal !== undefined && !isNaN(minVal);
  const hasMax = maxVal !== undefined && !isNaN(maxVal);
  const referenceRange = (hasMin || hasMax)
    ? { min: hasMin ? minVal : undefined, max: hasMax ? maxVal : undefined }
    : undefined;

  // Parse value — try numeric first, keep string if not numeric
  const trimmedValue = obs.value.trim();
  const numericValue = parseFloat(trimmedValue);
  const value = !isNaN(numericValue) ? numericValue : trimmedValue;

  return {
    testName: obs.name.trim(),
    value,
    unit: obs.unit?.trim() || undefined,
    referenceRange,
    observationId: obs.id?.trim() || undefined,
  };
}

/**
 * Main function: transforms raw lab JSON into clean internal format.
 *
 * The raw lab format has:
 *   results[] → investigation[] → observations[]
 *
 * We flatten all observations into a single "Ungrouped" profile.
 * Profile assignment happens later in the mapping pipeline.
 */
export function normalizeLabInput(labInput: LabInput): NormalizeInputResult {
  const skippedObservations: string[] = [];
  const allParameters: RawParameterInput[] = [];

  let barcodeNo: string | undefined;
  let sampleCollDate: string | undefined;
  let approvalDate: string | undefined;
  let packageName: string | undefined;

  // Flatten: results → investigation → observations
  const results = Array.isArray(labInput.results) ? labInput.results : [];

  for (const result of results) {
    if (!packageName && result.Package_name) {
      packageName = result.Package_name;
    }

    // Handle both "investigation" and "Investigation" (labs are inconsistent)
    const investigations: LabInvestigation[] = [
      ...(Array.isArray(result.investigation) ? result.investigation : []),
      ...(Array.isArray(result.Investigation) ? result.Investigation : []),
    ];

    for (const inv of investigations) {
      // Capture metadata from first investigation
      if (!barcodeNo && inv.barcodeNo) barcodeNo = inv.barcodeNo;
      if (!sampleCollDate && inv.SampleCollDate) sampleCollDate = inv.SampleCollDate;
      if (!approvalDate && inv.ApprovalDate) approvalDate = inv.ApprovalDate;

      const observations = Array.isArray(inv.observations) ? inv.observations : [];

      for (const obs of observations) {
        if (!isValidObservation(obs)) {
          if (obs.name) skippedObservations.push(obs.name);
          continue;
        }

        allParameters.push(observationToParameter(obs));
      }
    }
  }

  // Put all parameters into a single "Ungrouped" profile
  // The mapping pipeline will reassign them to proper profiles later
  const profiles: RawProfileInput[] = [];
  if (allParameters.length > 0) {
    profiles.push({
      profileName: 'Ungrouped',
      parameters: allParameters,
    });
  }

  const reportInput: RawReportInput = {
    patientId: labInput.LabNo || labInput.WorkOrderID || 'UNKNOWN',
    patientName: labInput.PName?.trim(),
    age: normalizeAge(labInput.Age),
    gender: normalizeGender(labInput.Gender),
    profiles,
  };

  const metadata: LabMetadata = {
    org: labInput.org,
    centre: labInput.Centre,
    labNo: labInput.LabNo || '',
    workOrderId: labInput.WorkOrderID,
    referredBy: labInput.ReferredBy,
    patientMobile: labInput.patientMobile,
    patientCategory: labInput.patientCategory,
    packageName,
    barcodeNo,
    sampleCollDate,
    approvalDate,
    hasPastData: labInput.hasPastData || false,
  };

  return { reportInput, metadata, skippedObservations };
}
