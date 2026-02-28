import { config } from './core/config/config.service';
import { buildApp } from './app';
import { pageRegistry } from './core/page-registry/page.registry';
import type { PageRenderContext } from './core/page-registry/page.types';
import { masterOverviewPage } from './pages/master-overview.page';
import { profileDetailPage } from './pages/profile-detail.page';

/**
 * Seeds the page registry with all available pages.
 *
 * Real page implementations are registered first. Remaining names that
 * tenants may reference but don't have a renderer yet get a placeholder
 * so the registry never returns undefined for known page names.
 */
function seedPageRegistry(): void {
  pageRegistry.register(masterOverviewPage);
  pageRegistry.register(profileDetailPage);

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
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

void start();
