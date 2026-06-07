/**
 * Portal API — Dev Server Entry Point
 *
 * Starts the Fastify server on port 3001 (separate from Report Engine on 3000).
 */

import { config } from './config/env.config';
import { buildApp } from './app';
import { closeDb } from './database/connection';
import { ensureIndexes } from './database/indexes';
import { seedSuperAdmin } from './scripts/seed';

async function start(): Promise<void> {
  const app = buildApp();

  try {
    // Ensure database indexes exist
    await ensureIndexes();
    app.log.info('Database indexes ensured');

    // Seed superadmin if no users exist (first-time setup)
    await seedSuperAdmin();

    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`Portal API running on http://0.0.0.0:${config.port}`);
    app.log.info(`Environment: ${config.nodeEnv}`);
  } catch (error) {
    app.log.error(error, 'Failed to start Portal API');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`);
    await app.close();
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
