import { pageRegistry } from './page.registry';
import type { PageRenderContext } from './page.types';
import { masterOverviewPage } from '../../pages/master-overview.page';
import { profileDetailPage } from '../../pages/profile-detail.page';
import {
  inDepthCoverPage,
  inDepthHowToReadPage,
  inDepthSummaryPage,
  inDepthDetailPage,
  inDepthBackPage,
  inDepthRecommendationsPage,
} from '../../pages/indepth/index';

/**
 * Seeds the page registry with all available pages.
 *
 * Real page implementations are registered first. Remaining names that
 * tenants may reference but don't have a renderer yet get a placeholder
 * so the registry never returns undefined for known page names.
 *
 * This is the single source of truth — imported by both server.ts and
 * the CLI generate script so both use identical page registration.
 */
export function seedPageRegistry(): void {
  // ── Existing pages ──────────────────────────────────────────────
  pageRegistry.register(masterOverviewPage);
  pageRegistry.register(profileDetailPage);

  // ── InDepth pages ────────────────────────────────────────────────
  pageRegistry.register(inDepthCoverPage);
  pageRegistry.register(inDepthHowToReadPage);
  pageRegistry.register(inDepthSummaryPage);
  pageRegistry.register(inDepthDetailPage);
  pageRegistry.register(inDepthRecommendationsPage);
  pageRegistry.register(inDepthBackPage);

  // ── Legacy / future placeholders ─────────────────────────────────
  const placeholders = [
    'cover',
    'summary',
    'executiveSummary',
    'bloodPanel',
    'lipidProfile',
    'thyroidPanel',
    'vitaminAnalysis',
    'recommendations',
    'appendix',
  ];

  for (const name of placeholders) {
    if (!pageRegistry.has(name)) {
      pageRegistry.register({
        name,
        generate(_ctx: PageRenderContext): string {
          return `<div class="section-title" style="padding:40px 0;text-align:center;color:#94a3b8;">[${name}] — page not yet implemented</div>`;
        },
      });
    }
  }
}
