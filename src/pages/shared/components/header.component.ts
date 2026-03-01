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
 * Shows the color strip, logo, lab name, and a right-side label.
 */
export function renderPageHeader(
  branding: TenantBrandingConfig,
  rightLabel = '',
): string {
  return `
<div class="sh-header">
  <div class="sh-header__strip" style="background:${branding.primaryColor}"></div>
  <div class="sh-header__bar">
    <div class="sh-header__brand">
      <img class="sh-header__logo" src="${branding.logoUrl}" alt="${branding.labName}" />
      <span class="sh-header__lab-name">${branding.labName}</span>
    </div>
    ${rightLabel ? `<span class="sh-header__right-label">${rightLabel}</span>` : ''}
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
