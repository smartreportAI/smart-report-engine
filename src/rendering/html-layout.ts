import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TenantBrandingConfig } from '../modules/tenants/tenant.types';

/* ---------------------------------------------------------------
   Layout Options
   --------------------------------------------------------------- */

/**
 * Minimal patient fields needed to render the patient strip.
 * Sourced from NormalizedReport — passed by the report builder.
 */
/**
 * Minimal patient fields needed to render the patient strip.
 * Sourced from NormalizedReport — passed by the report builder.
 */
export interface PatientStripInfo {
  patientId: string;
  patientName?: string;
  labId?: string;
  reportId?: string;
  age: number;
  gender: string;
  reportDate?: string;
}

/**
 * Utility to escape HTML special characters to prevent XSS.
 */
function escapeHtml(str: string | number | undefined): string {
  if (str === undefined || str === null) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface LayoutOptions {
  branding: TenantBrandingConfig;
  pageNumber?: number;
  totalPages?: number;
  /** When provided, renders the patient info strip below the header. */
  patient?: PatientStripInfo;
}

/* ---------------------------------------------------------------
   Per-page layout shell

   Each logical page is a simple div. Headers/footers on every
   *physical* page are handled by Puppeteer's native
   displayHeaderFooter + headerTemplate / footerTemplate, which
   guarantees they appear at the exact top/bottom of every
   printed page, even when content overflows.
   --------------------------------------------------------------- */

/**
 * Safely parses CSS dimension strings into exact Puppeteer margin pixels.
 * Ensures that if a tenant specifies a 120px header, Puppeteer explicitly
 * leaves exactly 120px + user gap in the margin to prevent overlap.
 */
export function getPdfMargins(branding: TenantBrandingConfig, hasPatient: boolean) {
  const parsePx = (val: string | undefined, defaultPx: number): number => {
    if (!val) return defaultPx;
    // Regex matches numbers with optional decimals and standard physical units
    const match = val.trim().match(/^(\d+(?:\.\d+)?)(px|mm|cm|in)$/);
    if (!match) return defaultPx; // Fallback entirely if not parsable

    let num = parseFloat(match[1]);
    const unit = match[2];

    // Puppeteer operates in CSS Pixels (96 DPI)
    if (unit === 'mm') num *= 3.7795275591;
    if (unit === 'cm') num *= 37.795275591;
    if (unit === 'in') num *= 96;

    return num;
  };

  const headerH = parsePx(branding.headerHeight, 80);
  const patientH = hasPatient ? 54 : 0; // Only add patient height if present
  const headerM = parsePx(branding.headerMargin, 20);

  const footerH = parsePx(branding.footerHeight, 36);
  const footerM = parsePx(branding.footerMargin, 15);

  return {
    top: Math.ceil(headerH + patientH + headerM) + 'px',
    bottom: Math.ceil(footerH + footerM) + 'px',
    left: '0px',
    right: '0px'
  };
}

/* ---------------------------------------------------------------
   Patient Strip Renderer

   Renders a compact 4-column patient info bar:
     Patient ID | Age / Gender | Lab ID | Report Date

   Placed immediately below the branded header with no gap,
   so the visual order is: [header] [patient strip] [page content].
   --------------------------------------------------------------- */

function renderPatientStrip(patient: PatientStripInfo): string {
  const genderFormatted = patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1);
  const ageGender = `${genderFormatted} \u2022 ${patient.age} yrs`;
  const date = patient.reportDate ?? new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const items: Array<{ label: string; value: string }> = [
    { label: 'Patient Name', value: escapeHtml(patient.patientName || 'Confidential Patient') },
    { label: 'Patient ID', value: escapeHtml(patient.patientId) },
    { label: 'Age / Gender', value: escapeHtml(ageGender) },
    { label: 'Lab ID', value: escapeHtml(patient.labId || patient.patientId) },
    { label: 'Report Date', value: escapeHtml(date) },
  ];

  const cells = items.map((item) => `
    <div class="ps-item">
      <p class="ps-label">${escapeHtml(item.label)}</p>
      <p class="ps-value">${item.value}</p>
    </div>`).join('');

  return `
<div class="patient-strip">
  <div class="ps-grid">
    ${cells}
  </div>
</div>`;
}

export function renderLayout(content: string, options: LayoutOptions): string {
  const { branding, pageNumber, totalPages, patient } = options;

  const paginationText =
    pageNumber !== undefined && totalPages !== undefined
      ? `Page ${pageNumber} of ${totalPages}`
      : '';

  const footerLabel = branding.footerText ?? branding.labName;
  const patientStrip = patient ? renderPatientStrip(patient) : '';

  return `
<div class="report-page">
  <main class="page-content">
    ${content}
  </main>

  <footer class="page-footer">
    <span class="footer-brand">${footerLabel}</span>
    <span class="footer-page">${paginationText}</span>
  </footer>
</div>`;
}

/* ---------------------------------------------------------------
   Design-system CSS loader (cached)
   --------------------------------------------------------------- */

let _cssCache: string | null = null;

function loadDesignSystemCSS(): string {
  if (_cssCache !== null) return _cssCache;

  const cssPath = resolve(__dirname, 'design-system.css');
  _cssCache = readFileSync(cssPath, 'utf-8');
  return _cssCache;
}

/* ---------------------------------------------------------------
   Brand CSS variable generator

   Produces a :root {} block that overrides design-system defaults
   with tenant-specific branding values. Fallback rules:
     - If accentHealthy not provided → design-system default applies
     - Same for accentMonitor, accentAttention
     - fontFamilyHeading / fontFamilyBody fall through to default
   --------------------------------------------------------------- */

export function generateBrandCSSVariables(
  branding: TenantBrandingConfig,
): string {
  const lines: string[] = [':root {'];

  // Required
  lines.push(`  --color-primary: ${branding.primaryColor};`);

  // Optional color overrides
  if (branding.secondaryColor) {
    lines.push(`  --color-secondary: ${branding.secondaryColor};`);
  }
  if (branding.accentHealthy) {
    lines.push(`  --color-healthy: ${branding.accentHealthy};`);
  }
  if (branding.accentMonitor) {
    lines.push(`  --color-monitor: ${branding.accentMonitor};`);
  }
  if (branding.accentAttention) {
    lines.push(`  --color-attention: ${branding.accentAttention};`);
  }

  // Font overrides
  if (branding.fontFamilyHeading) {
    lines.push(
      `  --font-family-heading: '${branding.fontFamilyHeading}', sans-serif;`,
    );
  }
  if (branding.fontFamilyBody) {
    lines.push(
      `  --font-family-body: '${branding.fontFamilyBody}', sans-serif;`,
    );
  }

  // Layout height/margin overrides
  if (branding.headerHeight) lines.push(`  --header-height: ${branding.headerHeight};`);
  if (branding.headerMargin) lines.push(`  --header-margin: ${branding.headerMargin};`);
  if (branding.footerHeight) lines.push(`  --footer-height: ${branding.footerHeight};`);
  if (branding.footerMargin) lines.push(`  --footer-margin: ${branding.footerMargin};`);

  lines.push('}');

  // Utility class overrides that must track the variable
  lines.push(`\n.bg-stable    { background: ${branding.primaryColor}; }`);
  lines.push(`.text-primary { color: ${branding.primaryColor}; }`);

  return lines.join('\n');
}

/* ---------------------------------------------------------------
   Puppeteer Header/Footer Templates

   These are injected by Puppeteer's page.pdf() and are rendered
   by Chrome on every physical page automatically. They support
   only inline CSS (no external sheets), so styles are embedded.

   Puppeteer provides magic classes:
     .pageNumber   — current physical page number
     .totalPages   — total physical pages
   --------------------------------------------------------------- */
export function buildHeaderTemplate(branding: TenantBrandingConfig, patient?: PatientStripInfo): string {
  const height = branding.headerHeight ?? '80px';
  const labNameEscaped = escapeHtml(branding.labName);
  const brandColor = branding.primaryColor;

  let patientHtml = '';
  if (patient) {
    const genderFormatted = patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1);
    const ageGender = escapeHtml(`${genderFormatted} \u2022 ${patient.age} yrs`);
    const date = escapeHtml(patient.reportDate ?? new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    }));

    patientHtml = `
    <div style="background:rgba(0,0,0,0.015); border-bottom:1px solid rgba(0,0,0,0.06); padding:8px 32px; margin-top:0; display:grid; grid-template-columns:repeat(5,1fr); gap:16px; height:54px; align-items:center; box-sizing:border-box;">
       <div>
         <div style="font-size:8.5px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#94a3b8; margin-bottom:2px;">Patient Name</div>
         <div style="font-size:11px; font-weight:600; color:#1e293b;">${escapeHtml(patient.patientName || 'Confidential Patient')}</div>
       </div>
       <div>
         <div style="font-size:8.5px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#94a3b8; margin-bottom:2px;">Patient ID</div>
         <div style="font-size:11px; font-weight:600; color:#1e293b;">${escapeHtml(patient.patientId)}</div>
       </div>
       <div>
         <div style="font-size:8.5px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#94a3b8; margin-bottom:2px;">Age / Gender</div>
         <div style="font-size:11px; font-weight:600; color:#1e293b;">${ageGender}</div>
       </div>
       <div>
         <div style="font-size:8.5px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#94a3b8; margin-bottom:2px;">Lab ID</div>
         <div style="font-size:11px; font-weight:600; color:#1e293b;">${escapeHtml(patient.labId || patient.patientId)}</div>
       </div>
       <div>
         <div style="font-size:8.5px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#94a3b8; margin-bottom:2px;">Report Date</div>
         <div style="font-size:11px; font-weight:600; color:#1e293b;">${date}</div>
       </div>
    </div>`;
  }

  return `
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact !important;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .ph-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    margin: 0; padding: 0;
    box-sizing: border-box;
  }
  .ph-bar {
    width: 100%; height: ${height};
    position: relative;
    display: flex; align-items: center;
    padding: 0 32px;
    background: ${brandColor};
    box-sizing: border-box;
    overflow: hidden;
  }
  .ph-cascade-pattern {
    position: absolute; top: 0; right: 0;
    width: 180px; height: 100%;
    z-index: 0; pointer-events: none;
  }
  .ph-content {
    display: flex; align-items: center; gap: 14px;
    z-index: 2; position: relative;
  }
  .ph-icon {
    width: 38px; height: 38px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.4);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ph-lab-info { display: flex; flex-direction: column; }
  .ph-tagline {
    font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
    color: rgba(255,255,255,0.55); font-weight: 700;
  }
  .ph-name {
    font-size: 15px; font-weight: 800; color: white;
    letter-spacing: -0.01em; margin-top: 1px;
  }
</style>
<div class="ph-wrapper">
  <div class="ph-bar">
    <svg class="ph-cascade-pattern" viewBox="0 0 180 80" preserveAspectRatio="none">
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
    </svg>
    <div class="ph-content">
      <div class="ph-icon">
         <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
           <path d="M9 2v14M2 9h14" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
           <circle cx="9" cy="9" r="6.5" stroke="white" stroke-width="1.2" opacity="0.45"/>
         </svg>
      </div>
      <div class="ph-lab-info">
        <div class="ph-tagline">DIAGNOSTIC LABORATORY</div>
        <div class="ph-name">${labNameEscaped}</div>
      </div>
    </div>
  </div>
  ${patientHtml}
</div>`;
}

export function buildFooterTemplate(branding: TenantBrandingConfig): string {
  const height = branding.footerHeight ?? '36px';
  const label = branding.footerText ?? branding.labName;
  const brandColor = branding.primaryColor;

  return `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; }
</style>
<div style="
  position:absolute;
  bottom:0;
  left:0;
  right:0;
  width:100%;
  height:${height};
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 32px;
  background:${brandColor};
  font-family:'Inter','Segoe UI',system-ui,sans-serif;
  font-size:9px;
  color:rgba(255,255,255,0.75);
  overflow:hidden;
">
  <svg style="position:absolute;top:0;right:0;width:60px;height:100%;z-index:0;pointer-events:none;" viewBox="0 0 60 36" preserveAspectRatio="none">
    <rect x="40" y="0" width="20" height="36" fill="rgba(255,255,255,0.06)"/>
    <rect x="25" y="0" width="15" height="24" fill="rgba(255,255,255,0.04)"/>
    <circle cx="48" cy="10" r="2" fill="rgba(255,255,255,0.3)"/>
    <circle cx="48" cy="24" r="1.5" fill="rgba(255,255,255,0.2)"/>
    <circle cx="33" cy="10" r="1.5" fill="rgba(255,255,255,0.15)"/>
  </svg>
  <span style="z-index:1;font-weight:600;">${label}</span>
  <span style="z-index:1;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>`;
}

/* ---------------------------------------------------------------
   Document wrapper
   --------------------------------------------------------------- */

/**
 * Wraps an array of rendered page sections into a complete HTML document.
 *
 * Injection order:
 *   1. design-system.css (base tokens + components)
 *   2. Brand CSS variables (tenant overrides — cascades over defaults)
 */
export function wrapDocument(
  pages: string[],
  branding: TenantBrandingConfig,
): string {
  const designCSS = loadDesignSystemCSS();
  const brandCSS = generateBrandCSSVariables(branding);
  const docTitle = `${branding.labName} — Health Report`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${docTitle}</title>
<style>
${designCSS}

/* --- Tenant Brand Overrides --- */
${brandCSS}
</style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;
}
