/**
 * Shared Components — Page Header (Version O: Cascade Steps)
 *
 * Used on every report page (cover, summary, detail, back).
 * Renders the branded header bar with primaryColor background
 * and cascade-step decorative pattern in the top-right.
 *
 * The html-layout.ts Puppeteer header uses inline CSS for the
 * same design. This component is for pages that embed the header
 * directly inside their own content (e.g. cover, back).
 */

import type { TenantBrandingConfig } from '../../../modules/tenants/tenant.types';

const CASCADE_SVG = `<svg class="header-cascade-svg" viewBox="0 0 180 80" preserveAspectRatio="none">
  <rect x="140" y="0" width="40" height="80" fill="rgba(255,255,255,0.08)"/>
  <rect x="120" y="0" width="20" height="60" fill="rgba(255,255,255,0.06)"/>
  <rect x="100" y="0" width="20" height="40" fill="rgba(255,255,255,0.04)"/>
  <rect x="80" y="0" width="20" height="24" fill="rgba(255,255,255,0.025)"/>
  <circle cx="140" cy="10" r="3" fill="rgba(255,255,255,0.45)"/>
  <circle cx="140" cy="26" r="2.5" fill="rgba(255,255,255,0.35)"/>
  <circle cx="140" cy="42" r="2" fill="rgba(255,255,255,0.25)"/>
  <circle cx="120" cy="10" r="2.5" fill="rgba(255,255,255,0.3)"/>
  <circle cx="120" cy="26" r="2" fill="rgba(255,255,255,0.2)"/>
  <circle cx="100" cy="10" r="2" fill="rgba(255,255,255,0.2)"/>
  <circle cx="160" cy="14" r="3.5" fill="rgba(255,255,255,0.55)"/>
  <circle cx="160" cy="34" r="3" fill="rgba(255,255,255,0.4)"/>
  <circle cx="160" cy="54" r="2.5" fill="rgba(255,255,255,0.3)"/>
  <circle cx="160" cy="70" r="2" fill="rgba(255,255,255,0.2)"/>
  <line x1="160" y1="14" x2="160" y2="70" stroke="rgba(255,255,255,0.08)" stroke-width="0.8"/>
  <line x1="140" y1="10" x2="140" y2="42" stroke="rgba(255,255,255,0.06)" stroke-width="0.8"/>
  <line x1="120" y1="10" x2="120" y2="26" stroke="rgba(255,255,255,0.05)" stroke-width="0.8"/>
</svg>`;

export function renderPageHeader(
  branding: TenantBrandingConfig,
  _options: { reportId?: string; pageNumber?: number; totalPages?: number } = {}
): string {
  return `
<div class="page-header" style="background:${branding.primaryColor}">
  ${CASCADE_SVG}
  <div class="header-content">
    <div class="header-icon-box">
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
        <path d="M9 2v14M2 9h14" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="9" cy="9" r="6.5" stroke="white" stroke-width="1.2" opacity="0.45"/>
      </svg>
    </div>
    <div class="header-lab-info">
      <div class="header-lab-tagline">DIAGNOSTIC LABORATORY</div>
      <div class="header-lab-name">${branding.labName}</div>
    </div>
  </div>
</div>`;
}

export function renderCoverHeader(branding: TenantBrandingConfig): string {
  return `
<div class="sh-cover-header" style="background:${branding.primaryColor}">
  <img class="sh-cover-header__logo" src="${branding.logoUrl}" alt="${branding.labName}" />
  <div class="sh-cover-header__lab-name">${branding.labName}</div>
</div>`;
}
