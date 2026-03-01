import Fastify, { type FastifyError } from 'fastify';
import sensible from '@fastify/sensible';
import { config } from './core/config/config.service';
import { healthRoutes } from './modules/health/health.route';
import { tenantRoutes } from './modules/tenants/tenant.route';
import { reportRoutes } from './modules/reports/report.route';
import { fhirRoutes } from './integrations/fhir/fhir.route';
import { hl7Routes } from './integrations/hl7/hl7.route';
import { errorResponse } from './shared/utils/response.utils';
import { rateLimiter } from './core/rate-limit/rate-limit.service';
import { metricsRoutes } from './metrics/metrics.route';
import { randomUUID } from 'node:crypto';

/* ---------------------------------------------------------------
   Constants
   --------------------------------------------------------------- */

/** Maximum request body size in bytes (5 MB). */
const MAX_BODY_SIZE = 5 * 1024 * 1024;

/** Routes that require rate limiting (report-generation endpoints). */
const RATE_LIMITED_ROUTES = new Set([
  '/reports/generate',
  '/ingest/fhir',
  '/ingest/hl7',
]);

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
    /** Fastify's built-in body size limit — rejects before parsing. */
    bodyLimit: MAX_BODY_SIZE,
  });

  app.register(sensible);

  /* ---- Request ID injection ---- */
  app.addHook('onRequest', async (request) => {
    (request as any).requestId = request.headers['x-request-id'] ?? randomUUID();
  });

  /* ---- Payload size guard (belt-and-suspenders with bodyLimit) ---- */
  app.addHook('onRequest', async (request, reply) => {
    const contentLength = Number(request.headers['content-length'] ?? 0);
    if (contentLength > MAX_BODY_SIZE) {
      return reply.code(413).send(
        errorResponse(
          'PAYLOAD_TOO_LARGE',
          `Request body exceeds the maximum allowed size of ${MAX_BODY_SIZE / (1024 * 1024)} MB.`,
        ),
      );
    }
  });

  /* ---- Per-tenant rate limiting ---- */
  app.addHook('preHandler', async (request, reply) => {
    if (!RATE_LIMITED_ROUTES.has(request.url)) return;

    const body = request.body as Record<string, unknown> | undefined;
    const tenantId =
      typeof body?.tenantId === 'string' ? body.tenantId : 'unknown';

    const result = rateLimiter.check(tenantId);

    // Always set rate-limit headers
    reply.header('X-RateLimit-Limit', '20');
    reply.header('X-RateLimit-Remaining', String(result.remaining));
    reply.header('X-RateLimit-Reset', String(Math.ceil(result.resetsAt / 1000)));

    if (!result.allowed) {
      return reply.code(429).send(
        errorResponse(
          'RATE_LIMIT_EXCEEDED',
          `Tenant "${tenantId}" has exceeded the rate limit. Please try again later.`,
        ),
      );
    }
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
  app.register(healthRoutes);
  app.register(tenantRoutes);
  app.register(reportRoutes);
  app.register(fhirRoutes);
  app.register(hl7Routes);
  app.register(metricsRoutes);

  return app;
}
