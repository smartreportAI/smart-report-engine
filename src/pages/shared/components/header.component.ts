/**
 * Shared Components — Page Header
 *
 * Used on every report page (cover, summary, detail, back).
 * Renders the branded top strip + logo + lab name row.
 *
 * The html-layout.ts shell already wraps pages, but these
 * components are for pages that need the header embedded
 * directly inside their own content section (e.g. cover page
 * which manages its own full-bleed layout).
 */

import type { TenantBrandingConfig } from '../../../modules/tenants/tenant.types';

/**
 * Compact branded header for interior pages.
 * Shows the medical icon box, lab name, NABL badge, and report metadata.
 */
export function renderPageHeader(
  branding: TenantBrandingConfig,
  options: { reportId?: string; pageNumber?: number; totalPages?: number } = {}
): string {
  const { reportId = 'N/A', pageNumber, totalPages } = options;
  const pageText = (pageNumber && totalPages)
    ? `In-Depth Profile &middot; Page ${pageNumber} of ${totalPages}`
    : '';

  return `
<div class="page-header">
  <div class="header-left">
    <div class="header-icon-box">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2v14M2 9h14" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="9" cy="9" r="6.5" stroke="white" stroke-width="1.2" opacity="0.45"/>
      </svg>
    </div>
    <div class="header-lab-info">
      <div class="header-lab-tagline">DIAGNOSTIC LABORATORY</div>
      <div class="header-lab-name">${branding.labName}</div>
    </div>
  </div>

  <div class="header-right">
    <div class="header-meta">
      <div class="header-meta-id">Report ID: ${reportId}</div>
      ${pageText ? `<div class="header-meta-page">${pageText}</div>` : ''}
    </div>
  </div>
</div>`;
}

/**
 * Full-bleed cover header — larger, centred, used only on the cover page.
 */
export function renderCoverHeader(branding: TenantBrandingConfig): string {
  return `
<div class="sh-cover-header" style="background:${branding.primaryColor}">
  <img class="sh-cover-header__logo" src="${branding.logoUrl}" alt="${branding.labName}" />
  <div class="sh-cover-header__lab-name">${branding.labName}</div>
</div>`;
}
