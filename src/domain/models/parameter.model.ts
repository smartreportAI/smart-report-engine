/**
 * Canonical representation of a single lab parameter after normalization.
 *
 * Every parameter, regardless of source format, resolves to this shape
 * before any scoring, rendering, or AI processing takes place.
 */

export type ParameterStatus = 'normal' | 'low' | 'high' | 'critical';

export interface ParameterRange {
  min?: number;
  max?: number;
}

export interface ParameterResult {
  /** Stable deterministic identifier derived from the parameter name. */
  id: string;
  name: string;
  value: number | string;
  unit?: string;
  range?: ParameterRange;
  /**
   * Classification of the value against the reference range.
   * Determined by the classification engine in normalization/classification.ts.
   */
  status: ParameterStatus;
  /**
   * Numeric signal score 0–100.
   * 100 = perfectly normal, lower = further from healthy range.
   * Placeholder formula in Phase 2; will be replaced by a calibrated
   * scoring model in a future phase.
   */
  signalScore: number;
}
