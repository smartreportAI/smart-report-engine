/**
 * Raw lab report input structures.
 *
 * These are the shapes that arrive from external sources (API payloads,
 * uploaded lab files, integrations). They are intentionally permissive —
 * loose, unnormalized, and potentially missing optional fields.
 *
 * The normalization layer converts these into canonical domain models.
 */

export interface RawReferenceRange {
  min?: number;
  max?: number;
  /** Free-text range description when numeric bounds are not available. */
  text?: string;
}

export interface RawParameterInput {
  testName: string;
  value: number | string;
  unit?: string;
  referenceRange?: RawReferenceRange;
}

export interface RawProfileInput {
  profileName: string;
  parameters: RawParameterInput[];
}

export type Gender = 'male' | 'female' | 'other';

export interface RawReportInput {
  patientId: string;
  age: number;
  gender: Gender;
  profiles: RawProfileInput[];
}
