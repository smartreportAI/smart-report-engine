/**
 * Shared Components — Page Footer (Version O: Cascade Steps)
 *
 * Used on every page that manages its own footer (e.g. cover, back).
 * Interior pages use the footer injected by Puppeteer's native
 * displayHeaderFooter via html-layout.ts.
 */

import type { TenantBrandingConfig } from '../../../modules/tenants/tenant.types';

export interface FooterOptions {
  branding: TenantBrandingConfig;
  pageNumber?: number;
  totalPages?: number;
  leftLabel?: string;
}

const FOOTER_CASCADE_SVG = `<svg class="footer-cascade-svg" viewBox="0 0 60 36" preserveAspectRatio="none">
  <rect x="40" y="0" width="20" height="36" fill="rgba(255,255,255,0.06)"/>
  <rect x="25" y="0" width="15" height="24" fill="rgba(255,255,255,0.04)"/>
  <circle cx="48" cy="10" r="2" fill="rgba(255,255,255,0.3)"/>
  <circle cx="48" cy="24" r="1.5" fill="rgba(255,255,255,0.2)"/>
  <circle cx="33" cy="10" r="1.5" fill="rgba(255,255,255,0.15)"/>
</svg>`;

export function renderPageFooter(opts: FooterOptions): string {
  const { branding, pageNumber, totalPages, leftLabel } = opts;

  const label = leftLabel ?? branding.footerText ?? branding.labName;
  const pageText =
    pageNumber !== undefined && totalPages !== undefined
      ? `Page ${pageNumber} of ${totalPages}`
      : '';

  return `
<footer class="sh-footer" style="background:${branding.primaryColor}">
  ${FOOTER_CASCADE_SVG}
  <span class="sh-footer__brand">${label}</span>
  <span class="sh-footer__page">${pageText}</span>
</footer>`;
}

export function renderDisclaimerFooter(branding: TenantBrandingConfig): string {
  return `
<footer class="sh-footer sh-footer--disclaimer" style="background:${branding.primaryColor}">
  ${FOOTER_CASCADE_SVG}
  <span class="sh-footer__disclaimer">
    This report is confidential and intended solely for the named patient and their healthcare provider.
    Results should be interpreted in clinical context.
  </span>
  ${branding.contactEmail ? `<span class="sh-footer__contact">${branding.contactEmail}</span>` : ''}
</footer>`;
}
