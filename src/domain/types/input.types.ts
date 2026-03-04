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
  /** Lower bound; may be number, string (e.g. "<5"), or null from lab systems. */
  min?: number | string | null;
  /** Upper bound; may be number, string (e.g. "N/A"), or null from lab systems. */
  max?: number | string | null;
  /** Free-text range description when numeric bounds are not available. */
  text?: string | null;
}

export interface RawParameterInput {
  testName: string;
  value: number | string;
  unit?: string | null;
  referenceRange?: RawReferenceRange;
}

export interface RawProfileInput {
  profileName: string;
  parameters: RawParameterInput[];
}

export type Gender = 'male' | 'female' | 'other';

export interface RawReportInput {
  patientId: string;
  patientName?: string;
  age: number;
  gender: Gender;
  profiles: RawProfileInput[];
  aiAssessment?: {
    healthScore: number;
    overallRecommendations: string[];
  };
}
