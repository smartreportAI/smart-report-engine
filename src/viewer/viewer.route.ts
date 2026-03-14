import type { FastifyInstance } from 'fastify';
import { lookupViewerToken } from './token.service';
import { renderViewerPage } from './templates/viewer.page';
import { renderExpiredPage, renderInvalidPage } from './templates/viewer-error.page';
import { successResponse, errorResponse } from '../shared/utils/response.utils';

/** Security headers applied to all viewer responses (patient-facing). */
const VIEWER_SECURITY_HEADERS: Record<string, string> = {
    'Cache-Control':      'private, no-store',
    'X-Frame-Options':    'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy':    'no-referrer',
};

export async function viewerRoutes(app: FastifyInstance): Promise<void> {

    // ── GET /view/:token — Mobile viewer HTML page ─────────────────────
    app.get<{ Params: { token: string } }>(
        '/view/:token',
        async (request, reply) => {
            const { token } = request.params;

            for (const [k, v] of Object.entries(VIEWER_SECURITY_HEADERS)) {
                reply.header(k, v);
            }

            const result = lookupViewerToken(token);

            if (!result) {
                // Check if it looks like a valid hex token (plausibly expired vs never existed)
                const looksValid = /^[0-9a-f]{64}$/.test(token);
                const html = looksValid ? renderExpiredPage() : renderInvalidPage();
                return reply.code(200).type('text/html').send(html);
            }

            const html = renderViewerPage(result.payload);
            return reply.code(200).type('text/html').send(html);
        },
    );

    // ── GET /api/viewer/:token — JSON data endpoint ────────────────────
    app.get<{ Params: { token: string } }>(
        '/api/viewer/:token',
        async (request, reply) => {
            const { token } = request.params;

            for (const [k, v] of Object.entries(VIEWER_SECURITY_HEADERS)) {
                reply.header(k, v);
            }

            const result = lookupViewerToken(token);

            if (!result) {
                const looksValid = /^[0-9a-f]{64}$/.test(token);
                const status = looksValid ? 410 : 404;
                const code   = looksValid ? 'REPORT_LINK_EXPIRED' : 'REPORT_NOT_FOUND';
                const msg    = looksValid ? 'This report link has expired.' : 'Report not found.';
                return reply.code(status).send(errorResponse(code, msg));
            }

            return reply.code(200).send(successResponse(result.payload));
        },
    );
}
