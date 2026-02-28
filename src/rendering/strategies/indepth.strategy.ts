import type { ReportStrategy } from './report-strategy.types';

/**
 * In-Depth strategy — full premium report with all visual features.
 *
 * Includes analytics strip, range sliders, executive summary,
 * and AI-driven recommendations.
 */
export const inDepthStrategy: ReportStrategy = {
    allowAnalyticsStrip: true,
    allowSliders: true,
    allowExecutiveSummary: true,
    allowRecommendations: true,
};
