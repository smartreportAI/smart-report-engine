import { pageRegistry } from '../core/page-registry/page.registry';
import type { PageRenderContext } from '../core/page-registry/page.types';
import { renderLayout, wrapDocument } from './html-layout';
import type { LayoutOptions } from './html-layout';
import type { NormalizedReport } from '../domain/models/report.model';
import type { TenantConfig } from '../modules/tenants/tenant.types';
import { resolveStrategy } from './strategies';
import type { ReportStrategy } from './strategies';

export interface ReportBuildResult {
  html: string;
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
): { sections: string[]; rendered: string[]; skipped: string[] } {
  const sections: string[] = [];
  const rendered: string[] = [];
  const skipped: string[] = [];

  for (const pageName of pageOrder) {
    if (pageName === 'profile-detail') {
      const page = pageRegistry.resolve(pageName);
      if (!page) {
        skipped.push(pageName);
        continue;
      }
      for (const profile of report.profiles) {
        const ctx: PageRenderContext = { data: profile, strategy };
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

    const ctx: PageRenderContext = { data: report, strategy };
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
 *   5. Wrap each section with the branded layout (header / footer / strip)
 *   6. Combine all wrapped pages into a single HTML document
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
  );

  const layoutOpts: Omit<LayoutOptions, 'pageNumber' | 'totalPages'> = {
    branding: tenantConfig.branding,
  };

  const totalPages = sections.length;

  const wrappedPages = sections.map((content, idx) =>
    renderLayout(content, {
      ...layoutOpts,
      pageNumber: idx + 1,
      totalPages,
    }),
  );

  const html = wrapDocument(wrappedPages, tenantConfig.branding);

  return {
    html,
    overallScore: normalized.overallScore,
    overallSeverity: normalized.overallSeverity,
    renderedPages: rendered,
    skippedPages: skipped,
  };
}
