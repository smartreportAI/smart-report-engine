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
   --------------------------------------------------------------- */

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

  lines.push('}');

  // Utility class overrides that must track the variable
  lines.push(`\n.bg-stable    { background: ${branding.primaryColor}; }`);
  lines.push(`.text-primary { color: ${branding.primaryColor}; }`);

  return lines.join('\n');
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
