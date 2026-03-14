import { config } from './core/config/config.service';
import { buildApp } from './app';
import { seedPageRegistry } from './core/page-registry/seed-registry';
import { shutdownPdfService } from './rendering/pdf/pdf.service';
import { rateLimiter } from './core/rate-limit/rate-limit.service';
import { deleteExpiredTokens } from './viewer/token.service';

async function start(): Promise<void> {
  seedPageRegistry();

  // Clean up any viewer tokens that expired while the server was offline
  deleteExpiredTokens();

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
