import type { ProfileResult } from './profile.model';
import type { Gender } from '../types/input.types';

/**
 * The fully normalized, canonical health report.
 *
 * This is the single internal representation that all downstream consumers
 * (report renderer, scoring engine, AI recommendation layer, PDF generator)
 * must work with. Nothing downstream reads raw input directly.
 */

export type OverallSeverity = 'stable' | 'monitor' | 'critical';

export interface NormalizedReport {
  patientId: string;
  patientName?: string;
  age: number;
  gender: Gender;
  profiles: ProfileResult[];
  /**
   * Mean of all profileScores.
   * Placeholder in Phase 2; will be replaced by weighted organ-system
   * scoring in a future phase.
   */
  overallScore: number;
  /**
   * Derived from overallScore thresholds.
   * stable   → overallScore ≥ 75
   * monitor  → overallScore ≥ 50
   * critical → overallScore < 50
   */
  overallSeverity: OverallSeverity;

  /** AI-generated holistic health assessment (override score + doctor recommendations) */
  aiAssessment?: {
    healthScore: number;
    overallRecommendations: string[];
  };
}
