import type { ParameterStatus } from '../models/parameter.model';

/**
 * Threshold for considering a deviation "extreme" and therefore critical.
 *
 * If a numeric value falls more than CRITICAL_DEVIATION_FACTOR times
 * outside the nearest bound, the parameter is classified as critical.
 *
 * Example: min=10, FACTOR=2 → value < (10 - 2*10) = -10 is critical.
 * This is a placeholder rule. In a future phase this will be replaced
 * by per-parameter clinical critical limits sourced from a reference DB.
 */
const CRITICAL_DEVIATION_FACTOR = 0.5;

export interface ClassificationResult {
  status: ParameterStatus;
  /**
   * Signal score 0–100.
   *
   * Formula (placeholder):
   *   normal   → 100
   *   low/high → 100 - min(deviation% × 100, 80)   capped at 20
   *   critical → 10  (floor value until real scoring is introduced)
   *
   * Deviation% = |value - nearest bound| / bound   (when bound ≠ 0)
   *            = |value - nearest bound| / 1        (when bound = 0)
   */
  signalScore: number;
}

/**
 * Classifies a numeric lab parameter value against its reference range
 * and returns a status + placeholder signal score.
 *
 * @param value - The measured numeric value.
 * @param min   - Lower bound of the reference range (optional).
 * @param max   - Upper bound of the reference range (optional).
 */
export function classifyParameter(
  value: number,
  min: number | undefined,
  max: number | undefined,
): ClassificationResult {
  const hasMin = min !== undefined;
  const hasMax = max !== undefined;

  if (!hasMin && !hasMax) {
    return { status: 'normal', signalScore: 100 };
  }

  if (hasMin && value < min) {
    const deviation = computeDeviation(value, min);
    const isCritical = deviation > CRITICAL_DEVIATION_FACTOR;
    return {
      status: isCritical ? 'critical' : 'low',
      signalScore: isCritical ? 10 : computeSignalScore(deviation),
    };
  }

  if (hasMax && value > max) {
    const deviation = computeDeviation(value, max);
    const isCritical = deviation > CRITICAL_DEVIATION_FACTOR;
    return {
      status: isCritical ? 'critical' : 'high',
      signalScore: isCritical ? 10 : computeSignalScore(deviation),
    };
  }

  return { status: 'normal', signalScore: 100 };
}

/**
 * Computes the fractional deviation of a value from a reference bound.
 *
 * Uses the absolute bound as the denominator to keep the ratio unit-independent.
 * Falls back to an absolute difference of 1 when the bound is exactly zero,
 * preventing division-by-zero while still surfacing the deviation.
 */
function computeDeviation(value: number, bound: number): number {
  const denominator = Math.abs(bound) !== 0 ? Math.abs(bound) : 1;
  return Math.abs(value - bound) / denominator;
}

/**
 * Converts a fractional deviation into a signal score between 20 and 99.
 *
 * The score decreases as deviation increases and is capped so that a
 * non-critical abnormal value never falls below 20 (critical floor is 10).
 */
function computeSignalScore(deviation: number): number {
  const penalty = Math.min(deviation * 100, 80);
  return Math.round(Math.max(100 - penalty, 20));
}
