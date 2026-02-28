import type { ReportStrategy } from './report-strategy.types';

/**
 * Essential strategy — lean, performance-focused report.
 *
 * Strips analytics overlay, sliders, executive summary, and AI recs.
 * Produces a clean, concise single-page-friendly output.
 */
export const essentialStrategy: ReportStrategy = {
    allowAnalyticsStrip: false,
    allowSliders: false,
    allowExecutiveSummary: false,
    allowRecommendations: false,
};
