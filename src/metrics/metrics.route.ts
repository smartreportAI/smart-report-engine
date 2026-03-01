import type { FastifyInstance } from 'fastify';
import { getMetricsText } from './metrics.service';

/**
 * GET /metrics
 *
 * Returns all collected metrics in Prometheus text exposition format.
 * Content-Type: text/plain; version=0.0.4; charset=utf-8
 */
export async function metricsRoutes(app: FastifyInstance): Promise<void> {
    app.get('/metrics', async (_request, reply) => {
        const text = getMetricsText();
        return reply
            .code(200)
            .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
            .send(text);
    });
}
