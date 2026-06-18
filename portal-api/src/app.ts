/**
 * Portal API — Fastify Application
 *
 * Lightweight server for admin dashboard + client portal.
 * Connects to the SAME MongoDB as the Report Engine.
 * No Puppeteer, no Chrome — just database operations.
 */

import Fastify, { type FastifyError } from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import { config } from './config/env.config';
import { authRoutes } from './modules/auth/auth.route';
import { adminRoutes } from './modules/admin/admin.route';
import { mappingAdminRoutes } from './modules/admin/mapping.route';
import { storageRoutes } from './modules/admin/storage.route';
import { clientRoutes } from './modules/client/client.route';
import { errorResponse } from './shared/utils/response.utils';
import { pingDb, isDbConnected } from './database/connection';

export function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: config.isDev
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // Plugins
  app.register(sensible);
  app.register(cors, {
    origin: config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
  });

  /* ---- Readiness Guard ----
   * Every route except /health needs the database. When the DB is not yet
   * connected (e.g. server just started, or a transient Atlas outage), return
   * a clear 503 instead of letting a Mongo timeout surface as a generic 500.
   */
  app.addHook('onRequest', async (request, reply) => {
    if (request.url === '/health' || request.method === 'OPTIONS') return;
    if (!isDbConnected()) {
      return reply.code(503).send(
        errorResponse(
          'DATABASE_UNAVAILABLE',
          'The service is starting up or the database is temporarily unreachable. Please try again in a moment.',
        ),
      );
    }
  });

  /* ---- Health Check ---- */
  app.get('/health', async (_request, reply) => {
    const dbOk = await pingDb();
    const status = dbOk ? 'healthy' : 'degraded';
    const code = dbOk ? 200 : 503;

    return reply.code(code).send({
      status,
      service: 'smart-report-portal-api',
      version: '1.0.0',
      database: dbOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  /* ---- Routes ---- */
  app.register(authRoutes, { prefix: '' });
  app.register(adminRoutes, { prefix: '' });
  app.register(mappingAdminRoutes, { prefix: '' });
  app.register(storageRoutes, { prefix: '' });
  app.register(clientRoutes, { prefix: '' });

  /* ---- Error Handlers ---- */
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    app.log.error({ err: error }, 'Unhandled application error');
    const statusCode = error.statusCode ?? 500;
    return reply.code(statusCode).send(
      errorResponse(
        error.code ?? 'INTERNAL_SERVER_ERROR',
        statusCode === 500
          ? 'An unexpected error occurred.'
          : error.message,
      ),
    );
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send(
      errorResponse('ROUTE_NOT_FOUND', 'The requested route does not exist.'),
    );
  });

  return app;
}
