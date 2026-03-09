import type { FastifyInstance } from 'fastify';
import { CLIENT_REGISTRY } from '../../config/clients.config';
import { successResponse, errorResponse } from '../../shared/utils/response.utils';

export async function tenantRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>(
    '/tenants/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          404: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenant = CLIENT_REGISTRY[id];

      if (!tenant) {
        return reply
          .code(404)
          .send(errorResponse('TENANT_NOT_FOUND', `Tenant "${id}" does not exist.`));
      }

      return reply.code(200).send(successResponse(tenant));
    },
  );
}
