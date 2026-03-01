import { config } from './core/config/config.service';
import { buildApp } from './app';
import { pageRegistry } from './core/page-registry/page.registry';
import type { PageRenderContext } from './core/page-registry/page.types';
import { masterOverviewPage } from './pages/master-overview.page';
import { profileDetailPage } from './pages/profile-detail.page';
// InDepth pages
import {
  inDepthCoverPage,
  inDepthHowToReadPage,
  inDepthSummaryPage,
  inDepthDetailPage,
  inDepthBackPage,
} from './pages/indepth/index';
import { shutdownPdfService } from './rendering/pdf/pdf.service';
import { rateLimiter } from './core/rate-limit/rate-limit.service';

/**
 * Seeds the page registry with all available pages.
 *
 * Real page implementations are registered first. Remaining names that
 * tenants may reference but don't have a renderer yet get a placeholder
 * so the registry never returns undefined for known page names.
 */
function seedPageRegistry(): void {
  // ── Existing pages ──────────────────────────────────────────────
  pageRegistry.register(masterOverviewPage);
  pageRegistry.register(profileDetailPage);

  // ── InDepth pages ────────────────────────────────────────────────
  pageRegistry.register(inDepthCoverPage);
  pageRegistry.register(inDepthHowToReadPage);
  pageRegistry.register(inDepthSummaryPage);
  pageRegistry.register(inDepthDetailPage);
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

async function start(): Promise<void> {
  seedPageRegistry();

  const app = buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(
      `Smart Report Engine running on http://${config.host}:${config.port}`,
    );
  } catch (error) {
    app.log.error(error, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`);
    await app.close();
    await shutdownPdfService();
    rateLimiter.destroy();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

void start();

