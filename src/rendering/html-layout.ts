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

  let patientHtml = '';
  if (patient) {
    const genderFormatted = patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1);
    const ageGender = escapeHtml(`${genderFormatted} \u2022 ${patient.age} yrs`);
    const date = escapeHtml(patient.reportDate ?? new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    }));

    patientHtml = `
    <div style="background-color:#f8fafc; border-bottom:1px solid #e2e8f0; padding:8px 32px; margin-top:3px; margin-bottom:12px; display:grid; grid-template-columns:repeat(5,1fr); gap:16px;">
       <div>
         <div style="font-size:8.5px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#94a3b8; margin-bottom:2px;">Patient Name</div>
         <div style="font-size:11px; font-weight:600; color:#1e293b;">${escapeHtml(patient.patientName || 'Confidential Patient')}</div>
       </div>
       <div>
         <div style="font-size:8.5px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#94a3b8; margin-bottom:2px;">Patient ID</div>
         <div style="font-size:11px; font-weight:600; color:#1e293b;">${escapeHtml(patient.patientId)}</div>
       </div>
       <div>
         <div style="font-size:8.5px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#94a3b8; margin-bottom:2px;">Age / Gender</div>
         <div style="font-size:11px; font-weight:600; color:#1e293b;">${ageGender}</div>
       </div>
       <div>
         <div style="font-size:8.5px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#94a3b8; margin-bottom:2px;">Lab ID</div>
         <div style="font-size:11px; font-weight:600; color:#1e293b;">${escapeHtml(patient.labId || patient.patientId)}</div>
       </div>
       <div>
         <div style="font-size:8.5px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#94a3b8; margin-bottom:2px;">Report Date</div>
         <div style="font-size:11px; font-weight:600; color:#1e293b;">${date}</div>
       </div>
    </div>`;
  }

  return `
<style>
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact !important;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .ph-wrapper {
    width: 100%;
    margin: 0; padding: 0;
    box-sizing: border-box;
  }
  .ph-bar {
    width: 100%; height: ${height};
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 32px; border-bottom: 1px solid #E5E7EB; background: white;
    box-sizing: border-box;
  }
  .ph-left { display: flex; align-items: center; gap: 12px; }
  .ph-icon {
    width: 36px; height: 36px; border-radius: 12px;
    background: linear-gradient(135deg, #2D4A9A 0%, #20BFDD 100%);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ph-lab-info { display: flex; flex-direction: column; }
  .ph-tagline {
    font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
    color: #9CA3AF; margin-bottom: 1px;
  }
  .ph-name { font-size: 14px; font-weight: 700; color: #2D4A9A; }
  
  .ph-right { display: flex; align-items: center; gap: 24px; }
  .ph-nabl {
    display: flex; align-items: center; gap: 6px; padding: 6px 12px;
    border-radius: 8px; background-color: #EBF5FF; border: 1px solid #BFDBFE;
  }
  .ph-nabl span { font-size: 9px; font-weight: 600; color: #2D4A9A; }
  
  .ph-meta { text-align: right; display: flex; flex-direction: column; gap: 1px; }
  .ph-meta-id { font-size: 10px; color: #9CA3AF; }
  .ph-meta-page { font-size: 10px; color: #6B7280; }
</style>
<div class="ph-wrapper">
  <div class="ph-bar">
    <div class="ph-left">
      <div class="ph-icon">
         <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
           <path d="M9 2v14M2 9h14" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
           <circle cx="9" cy="9" r="6.5" stroke="white" stroke-width="1.2" opacity="0.45"/>
         </svg>
      </div>
      <div class="ph-lab-info">
        <div class="ph-tagline">DIAGNOSTIC LABORATORY</div>
        <div class="ph-name">${labNameEscaped}</div>
      </div>
    </div>

    <div class="ph-right">
      <div class="ph-meta">
        <div class="ph-meta-id">Report ID: ${escapeHtml(patient?.reportId || 'N/A')}</div>
        <div class="ph-meta-page">In-Depth Profile &middot; Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
      </div>
    </div>
  </div>
  ${patientHtml}
</div>`;
}

export function buildFooterTemplate(branding: TenantBrandingConfig): string {
  const height = branding.footerHeight ?? '36px';
  const label = branding.footerText ?? branding.labName;

  return `
<div style="
  width:100%;
  height:${height};
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:0 20px;
  border-top:1px solid #e2e8f0;
  font-family:'Inter','Segoe UI',system-ui,sans-serif;
  font-size:10px;
  color:#94a3b8;
  box-sizing:border-box;
">
  <span>${label}</span>
  <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
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
