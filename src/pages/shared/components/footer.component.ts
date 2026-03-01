/**
 * Shared Components — Page Footer
 *
 * Used on every page that manages its own footer (e.g. cover, back).
 * Interior pages use the footer injected by html-layout.ts shell.
 */

import type { TenantBrandingConfig } from '../../../modules/tenants/tenant.types';

export interface FooterOptions {
  branding: TenantBrandingConfig;
  pageNumber?: number;
  totalPages?: number;
  /** Override the left label (defaults to labName / footerText) */
  leftLabel?: string;
}

/**
 * Standard branded footer — lab name left, page number right.
 */
export function renderPageFooter(opts: FooterOptions): string {
  const { branding, pageNumber, totalPages, leftLabel } = opts;

  const label = leftLabel ?? branding.footerText ?? branding.labName;
  const pageText =
    pageNumber !== undefined && totalPages !== undefined
      ? `Page ${pageNumber} of ${totalPages}`
      : '';

  return `
<footer class="sh-footer">
  <span class="sh-footer__brand">${label}</span>
  <span class="sh-footer__page">${pageText}</span>
</footer>`;
}

/**
 * Confidential disclaimer footer — used on back page and cover.
 */
export function renderDisclaimerFooter(branding: TenantBrandingConfig): string {
  return `
<footer class="sh-footer sh-footer--disclaimer">
  <span class="sh-footer__disclaimer">
    This report is confidential and intended solely for the named patient and their healthcare provider.
    Results should be interpreted in clinical context.
  </span>
  ${branding.contactEmail ? `<span class="sh-footer__contact">${branding.contactEmail}</span>` : ''}
</footer>`;
}
