/**
 * Portal API — Dev Server Entry Point
 *
 * Starts the Fastify server on port 3001 (separate from Report Engine on 3000).
 *
 * Startup is resilient: the HTTP server begins listening immediately, and the
 * database (index creation + superadmin seed) is initialized in the background
 * with retries. This means a transient MongoDB connectivity issue no longer
 * crashes the whole API — clients get a clear error instead of a refused
 * connection, and the API self-heals once the database becomes reachable.
 */

import type { FastifyInstance } from 'fastify';
import { config } from './config/env.config';
import { buildApp } from './app';
import { closeDb } from './database/connection';
import { ensureIndexes } from './database/indexes';
import { seedSuperAdmin } from './scripts/seed';

/** Tracks whether the one-time DB setup (indexes + seed) has completed. */
let dbReady = false;
export const isDbReady = (): boolean => dbReady;

/**
 * Run index creation + superadmin seed, retrying with backoff until it
 * succeeds. Runs in the background so it never blocks the HTTP server.
 */
async function initDatabaseWithRetry(app: FastifyInstance): Promise<void> {
  let attempt = 0;
  // 5s, 10s, 20s, then capped at 30s between attempts.
  const delays = [5000, 10000, 20000, 30000];

  while (!dbReady) {
    attempt += 1;
    try {
      await ensureIndexes();
      app.log.info('Database indexes ensured');

      await seedSuperAdmin();
      dbReady = true;
      app.log.info('Database initialization complete — API fully ready');
    } catch (error) {
      const wait = delays[Math.min(attempt - 1, delays.length - 1)];
      app.log.error(
        { err: error },
        `Database init attempt ${attempt} failed; retrying in ${wait / 1000}s. ` +
          `API is listening but DB-backed routes will return 503 until this succeeds.`,
      );
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

async function start(): Promise<void> {
  const app = buildApp();

  try {
    // Listen FIRST so the API is always reachable (no ERR_CONNECTION_REFUSED).
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`Portal API running on http://0.0.0.0:${config.port}`);
    app.log.info(`Environment: ${config.nodeEnv}`);
  } catch (error) {
    app.log.error(error, 'Failed to bind Portal API to port');
    process.exit(1);
  }

  // Kick off DB setup in the background — do not await.
  void initDatabaseWithRetry(app);

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
  // Do not exit — a rejected DB promise during startup must not kill the API.
});

void start();
