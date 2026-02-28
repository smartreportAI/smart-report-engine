import Fastify, { type FastifyError } from 'fastify';
import sensible from '@fastify/sensible';
import { config } from './core/config/config.service';
import { healthRoutes } from './modules/health/health.route';
import { tenantRoutes } from './modules/tenants/tenant.route';
import { reportRoutes } from './modules/reports/report.route';
import { errorResponse } from './shared/utils/response.utils';

export function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        config.nodeEnv === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  app.register(sensible);

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

  app.register(healthRoutes);
  app.register(tenantRoutes);
  app.register(reportRoutes);

  return app;
}
