import { pageRegistry } from '../core/page-registry/page.registry';
import type { PageRenderContext } from '../core/page-registry/page.types';
import { renderLayout, wrapDocument } from './html-layout';
import type { LayoutOptions, PatientStripInfo } from './html-layout';
import type { NormalizedReport } from '../domain/models/report.model';
import type { TenantConfig } from '../modules/tenants/tenant.types';
import { resolveStrategy } from './strategies';
import type { ReportStrategy } from './strategies';

/** Pages that should NOT have header/footer (full-bleed pages) */
const FULL_BLEED_PAGES = new Set(['indepth-cover', 'indepth-back']);

export interface ReportBuildResult {
  /** Full HTML document (for HTML output — backward compatible) */
  html: string;
  /** Separate HTML for cover page only (null if no cover page) */
  coverHtml: string | null;
  /** Separate HTML for content pages only (with renderLayout wrappers) */
  contentHtml: string;
  /** Separate HTML for back page only (null if no back page) */
  backHtml?: string | null;
  /** Metadata for the patient strip (passed to PDF header) */
  patient?: PatientStripInfo;

  overallScore: number;
  overallSeverity: string;
  renderedPages: string[];
  skippedPages: string[];
}

/**
 * Resolves a page name from the tenant's pageOrder to the correct data
 * slice and invokes the page's generate() method.
 *
 * Special page names:
 *   "master-overview"  → receives the full NormalizedReport
 *   "profile-detail"   → expanded into one page per profile
 *
 * All other names are resolved from the registry and receive the full report.
 *
 * Each page receives a PageRenderContext { data, strategy } — never
 * a raw report or tenant config directly.
 */
function generatePageSections(
  pageOrder: string[],
  report: NormalizedReport,
  strategy: ReportStrategy,
  branding: TenantConfig['branding'],
): { sections: string[]; rendered: string[]; skipped: string[] } {
  const sections: string[] = [];
  const rendered: string[] = [];
  const skipped: string[] = [];

  for (const pageName of pageOrder) {
    // Both 'profile-detail' and 'indepth-detail' expand to one page per profile
    if (pageName === 'profile-detail' || pageName === 'indepth-detail') {
      const page = pageRegistry.resolve(pageName);
      if (!page) {
        skipped.push(pageName);
        continue;
      }
      for (const profile of report.profiles) {
        const ctx: PageRenderContext = { data: profile, strategy, branding };
        sections.push(page.generate(ctx));
        rendered.push(`${pageName}:${profile.id}`);
      }
      continue;
    }

    const page = pageRegistry.resolve(pageName);
    if (!page) {
      skipped.push(pageName);
      continue;
    }

    const ctx: PageRenderContext = { data: report, strategy, branding };
    sections.push(page.generate(ctx));
    rendered.push(pageName);
  }

  return { sections, rendered, skipped };
}

/**
 * Builds a complete HTML report document from a NormalizedReport and
 * a TenantConfig.
 *
 * Flow:
 *   1. Resolve strategy from tenant.reportType
 *   2. Iterate tenantConfig.pageOrder
 *   3. Resolve each page name from the page registry
 *   4. Call page.generate() with PageRenderContext { data, strategy }
 *   5. Wrap content pages with the branded layout (header / footer / strip)
 *   6. Split output into cover, content, and back segments for multi-pass PDF
 *   7. Combine all into a single HTML document (backward-compatible)
 *
 * Multi-pass PDF strategy:
 *   - Cover/back pages are "full-bleed" (no header/footer)
 *   - Content pages get renderLayout() wrappers (HTML header/footer)
 *   - The PDF generator renders content pages with Puppeteer native headers
 *     (which repeat on every physical page, even overflow pages)
 *   - Cover/back are rendered as separate PDFs with no headers
 *   - All PDFs are merged into the final document
 */
export function buildReport(
  normalized: NormalizedReport,
  tenantConfig: TenantConfig,
): ReportBuildResult {
  const strategy = resolveStrategy(tenantConfig.reportType);

  const { sections, rendered, skipped } = generatePageSections(
    tenantConfig.pageOrder,
    normalized,
    strategy,
    tenantConfig.branding
  );

  const reportId = `RPT-${new Date().getFullYear()}-${normalized.patientId.slice(-4).toUpperCase()}`;

  const reportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const layoutOpts: Omit<LayoutOptions, 'pageNumber' | 'totalPages'> = {
    branding: tenantConfig.branding,
    patient: {
      patientId: normalized.patientId,
      patientName: normalized.patientName,
      labId: normalized.patientId, // Defaulting labId to patientId as per current data structure
      reportId: reportId,
      age: normalized.age,
      gender: normalized.gender,
      reportDate,
    },
  };

  const totalPages = sections.length;

  // ── Separate pages into cover, content, back ──────────────────
  const coverRawPages: string[] = [];
  const contentRawPages: string[] = [];
  const backRawPages: string[] = [];

  const wrappedAll: string[] = [];

  sections.forEach((content, idx) => {
    const name = rendered[idx];

    if (name === 'indepth-cover') {
      coverRawPages.push(content);
      wrappedAll.push(content); // No layout wrapper for cover
    } else if (name === 'indepth-back') {
      backRawPages.push(content);
      wrappedAll.push(content); // No layout wrapper for back
    } else {
      const wrapped = renderLayout(content, {
        ...layoutOpts,
        pageNumber: idx + 1,
        totalPages,
      });
      contentRawPages.push(wrapped);
      wrappedAll.push(wrapped);
    }
  });

  // ── Build separate HTML documents for multi-pass PDF ──────────
  const branding = tenantConfig.branding;
  const html = wrapDocument(wrappedAll, branding);
  const coverHtml = coverRawPages.length > 0
    ? wrapDocument(coverRawPages, branding)
    : null;
  const contentHtml = wrapDocument(contentRawPages, branding);
  const backHtml = backRawPages.length > 0
    ? wrapDocument(backRawPages, branding)
    : null;

  return {
    html,
    coverHtml,
    contentHtml,
    backHtml,
    overallScore: normalized.overallScore,
    overallSeverity: normalized.overallSeverity,
    renderedPages: rendered,
    skippedPages: skipped,
    patient: layoutOpts.patient,
  };
}
