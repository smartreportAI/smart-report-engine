import type { ReportStrategy } from '../../rendering/strategies/report-strategy.types';

/**
 * Data envelope passed to every page's generate() method.
 *
 * Pages MUST NOT:
 *  - read process.env
 *  - access filesystem
 *  - read config singletons
 *
 * All context comes through this envelope. Rendering remains pure.
 */
export interface PageRenderContext<T = unknown> {
  /** The domain data slice for this page (NormalizedReport or ProfileResult). */
  data: T;
  /** Strategy flags controlling which premium features are enabled. */
  strategy: ReportStrategy;
}

/**
 * Every report page must implement this interface.
 * The generate method receives a PageRenderContext and returns rendered HTML.
 */
export interface ReportPage {
  name: string;
  generate(ctx: PageRenderContext): string;
}
