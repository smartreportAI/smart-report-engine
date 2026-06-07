import { config } from './core/config/config.service';
import { buildApp } from './app';
import { seedPageRegistry } from './core/page-registry/seed-registry';
import { shutdownPdfService } from './rendering/pdf/pdf.service';
import { closeDb, seedDemoClient } from './database';

async function start(): Promise<void> {
  seedPageRegistry();

  // Seed demo client in MongoDB (creates if not exists)
  await seedDemoClient();

  const app = buildApp();

  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    app.log.info('Smart Report Engine running on http://0.0.0.0:3000');
  } catch (error) {
    app.log.error(error, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`);
    await app.close();
    await shutdownPdfService();
    await closeDb();
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
