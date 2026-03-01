import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TenantBrandingConfig } from '../modules/tenants/tenant.types';

/* ---------------------------------------------------------------
   Layout Options
   --------------------------------------------------------------- */

export interface LayoutOptions {
  branding: TenantBrandingConfig;
  pageNumber?: number;
  totalPages?: number;
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
export function getPdfMargins(branding: TenantBrandingConfig) {
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

  const headerH = parsePx(branding.headerHeight, 48);
  const headerM = parsePx(branding.headerMargin, 15); // Default 15px gap

  const footerH = parsePx(branding.footerHeight, 36);
  const footerM = parsePx(branding.footerMargin, 15); // Default 15px gap

  return {
    top: Math.ceil(headerH + headerM) + 'px',
    bottom: Math.ceil(footerH + footerM) + 'px',
    left: '0px',
    right: '0px'
  };
}

export function renderLayout(content: string, options: LayoutOptions): string {
  const { branding, pageNumber, totalPages } = options;

  const paginationText =
    pageNumber !== undefined && totalPages !== undefined
      ? `Page ${pageNumber} of ${totalPages}`
      : '';

  const footerLabel = branding.footerText ?? branding.labName;

  return `
<div class="report-page">
  <div class="page-strip" style="background:${branding.primaryColor}"></div>

  <header class="page-header">
    <img class="logo" src="${branding.logoUrl}" alt="${branding.labName} logo" />
    <span class="lab-name">${branding.labName}</span>
  </header>

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

export function buildHeaderTemplate(branding: TenantBrandingConfig): string {
  const height = branding.headerHeight ?? '48px';

  return `
<style>
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact !important;
  }
</style>
<div style="
  width:100%;
  height:${height};
  display:flex;
  align-items:center;
  gap:10px;
  padding:0 20px;
  border-bottom:1px solid #e2e8f0;
  font-family:'Inter','Segoe UI',system-ui,sans-serif;
  font-size:12px;
  box-sizing:border-box;
">
  <div style="
    width:100%;
    height:6px;
    background:${branding.primaryColor};
    position:absolute;
    top:0;left:0;right:0;
  "></div>
  <img src="${branding.logoUrl}" style="height:28px;width:auto;object-fit:contain;" />
  <span style="font-size:13px;font-weight:600;color:#475569;">${branding.labName}</span>
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
