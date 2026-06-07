import Fastify, { type FastifyError } from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import { config } from './core/config/config.service';
import { tenantRoutes } from './modules/tenants/tenant.route';
import { reportRoutes } from './modules/reports/report.route';
import { errorResponse } from './shared/utils/response.utils';
import { randomUUID } from 'node:crypto';

/* ---------------------------------------------------------------
   Constants
   --------------------------------------------------------------- */

/** Maximum request body size in bytes (5 MB). */
const MAX_BODY_SIZE = 5 * 1024 * 1024;

/* ---------------------------------------------------------------
   App factory
   --------------------------------------------------------------- */

export function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        config.nodeEnv === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    bodyLimit: MAX_BODY_SIZE,
  });

  app.register(sensible);
  app.register(cors, { origin: true });

  /* ---- Request ID injection ---- */
  app.addHook('onRequest', async (request) => {
    (request as any).requestId = request.headers['x-request-id'] ?? randomUUID();
  });

  /* ---- Error handlers ---- */
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    app.log.error({ err: error }, 'Unhandled application error');

    const statusCode = error.statusCode ?? 500;
    return reply.code(statusCode).send(
      errorResponse(
        error.code ?? 'INTERNAL_SERVER_ERROR',
        statusCode === 500
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
      ),
    );
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send(
      errorResponse('ROUTE_NOT_FOUND', 'The requested route does not exist.'),
    );
  });

  /* ---- Routes ---- */
  app.register(tenantRoutes);
  app.register(reportRoutes);

  return app;
}
