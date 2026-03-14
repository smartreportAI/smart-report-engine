import type { ReportStrategy } from '../../rendering/strategies/report-strategy.types';
import type { TenantBrandingConfig } from '../../modules/tenants/tenant.types';

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
  /** Direct access to the tenant's exact brand config. */
  branding: TenantBrandingConfig;
  /**
   * Real scannable QR code SVG string (generated from the viewer URL + token).
   * Undefined when VIEWER_BASE_URL is not configured — pages fall back to placeholder.
   */
  viewerQrSvg?: string;
  /**
   * Full viewer URL for this report (e.g. https://host/view/<token>).
   * Used to make QR codes clickable links in the PDF.
   */
  viewerUrl?: string;
}

/**
 * Every report page must implement this interface.
 * The generate method receives a PageRenderContext and returns rendered HTML.
 */
export interface ReportPage {
  name: string;
  generate(ctx: PageRenderContext): string;
}
