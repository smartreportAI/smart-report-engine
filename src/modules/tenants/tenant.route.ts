import type { FastifyInstance } from 'fastify';
import type { TenantConfig } from './tenant.types';
import { successResponse, errorResponse } from '../../shared/utils/response.utils';

/**
 * Mock tenant store — replaced by a database-backed service in a future phase.
 */
const MOCK_TENANTS: Record<string, TenantConfig> = {
  'tenant-alpha': {
    tenantId: 'tenant-alpha',
    reportType: 'essential',
    pageOrder: ['cover', 'summary', 'bloodPanel', 'recommendations'],
    branding: {
      labName: 'Alpha Diagnostics',
      logoUrl: 'https://cdn.example.com/alpha/logo.png',
      primaryColor: '#1A73E8',
      footerText: 'Alpha Diagnostics Pvt. Ltd.',
      headerMargin: '40px',
    },
  },
  'tenant-beta': {
    tenantId: 'tenant-beta',
    reportType: 'inDepth',
    pageOrder: [
      'cover',
      'executiveSummary',
      'bloodPanel',
      'lipidProfile',
      'thyroidPanel',
      'vitaminAnalysis',
      'recommendations',
      'appendix',
    ],
     branding: {
            labName: 'NexaHealth Analytics',
            logoUrl: '',
            primaryColor: '#2D4A9A',
            secondaryColor: '#20BFDD',
            accentHealthy: '#388E3C',
            footerText: 'NexaHealth Analytics — Smart Health Insights',
            headerHeight: '80px',
            headerMargin: '20px',
            contactEmail: 'reports@nexahealth.com',
            showPoweredBy: true,
        },
  },
};

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
      const tenant = MOCK_TENANTS[id];

      if (!tenant) {
        return reply
          .code(404)
          .send(errorResponse('TENANT_NOT_FOUND', `Tenant "${id}" does not exist.`));
      }

      return reply.code(200).send(successResponse(tenant));
    },
  );
}
