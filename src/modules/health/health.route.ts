import type { FastifyInstance } from 'fastify';
import { successResponse } from '../../shared/utils/response.utils';

interface HealthStatus {
  status: 'ok';
  environment: string;
  uptime: number;
  registeredPages: string[];
}

export async function healthRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    '/health',
    {
      schema: {
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (_request, reply) => {
      const { pageRegistry } = await import(
        '../../core/page-registry/page.registry'
      );

      const status: HealthStatus = {
        status: 'ok',
        environment: process.env['NODE_ENV'] ?? 'development',
        uptime: Math.floor(process.uptime()),
        registeredPages: pageRegistry.list(),
      };

      return reply.code(200).send(successResponse(status));
    },
  );
}
