import type { ParameterResult } from './parameter.model';

/**
 * Aggregated result for a single lab profile (e.g. "Complete Blood Count",
 * "Lipid Panel", "Thyroid Panel").
 *
 * A profile groups related parameters and exposes aggregate health signals
 * that the report engine and AI recommendation layer consume.
 */

export type ProfileSeverity = 'healthy' | 'monitor' | 'attention';

export interface ProfileResult {
  /** Stable identifier derived from the profile name. */
  id: string;
  name: string;
  parameters: ParameterResult[];
  /** Count of parameters whose status is not "normal". */
  abnormalCount: number;
  normalCount: number;
  /**
   * Aggregate score 0–100 representing overall profile health.
   * Computed as the mean of all parameter signalScores.
   * Placeholder in Phase 2; will be weighted in a future phase.
   */
  profileScore: number;
  /**
   * Derived severity bucket based on abnormalCount ratio and profileScore.
   * healthy   → all or nearly all parameters normal
   * monitor   → some parameters outside range but none critical
   * attention → critical parameters present or high abnormal ratio
   */
  severity: ProfileSeverity;
}
