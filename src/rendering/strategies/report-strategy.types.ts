/**
 * ReportStrategy controls which premium visual features are enabled
 * for a given report type (essential vs inDepth).
 *
 * Pages receive the strategy object and must respect its flags.
 * No if-else by tenantId — strategy is resolved from reportType alone.
 */
export interface ReportStrategy {
    /** Show the analytics strip (profiles / abnormal / critical counts). */
    allowAnalyticsStrip: boolean;
    /** Show range sliders on parameter cards. */
    allowSliders: boolean;
    /** Include an executive summary page. */
    allowExecutiveSummary: boolean;
    /** Include AI-powered recommendations page. */
    allowRecommendations: boolean;
    /** Max profiles rendered per page (undefined = unlimited). */
    maxProfilesPerPage?: number;
}
