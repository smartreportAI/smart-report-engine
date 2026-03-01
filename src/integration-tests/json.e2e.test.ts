/**
 * JSON ingestion end-to-end tests.
 * POST /reports/generate
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app';
import { resetMetrics, getCounterValue, METRIC } from '../metrics/metrics.service';
import { rateLimiter } from '../core/rate-limit/rate-limit.service';
import { shutdownPdfService } from '../rendering/pdf/pdf.service';
import { seedPages, JSON_REPORT_BODY, parseApiResponse } from './_helpers';

const app = buildApp();

beforeAll(async () => {
    seedPages();
    await app.ready();
    resetMetrics();
    rateLimiter.reset('tenant-alpha');
});

afterAll(async () => {
    await app.close();
    await shutdownPdfService();
});

const POST = (body: unknown) =>
    app.inject({
        method: 'POST',
        url: '/reports/generate',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify(body),
    });

describe('POST /reports/generate — JSON full flow', () => {
    it('returns 200 with HTML report', async () => {
        const res = await POST(JSON_REPORT_BODY);
        expect(res.statusCode).toBe(200);

        const body = parseApiResponse(res.body);
        expect(body.success).toBe(true);
        expect(body.data?.html).toContain('<!DOCTYPE html>');
    });

    it('HTML contains tenant branding', async () => {
        const res = await POST(JSON_REPORT_BODY);
        const body = parseApiResponse(res.body);
        // Alpha Diagnostics is baked into the HTML by the renderer
        expect(body.data?.html?.length).toBeGreaterThan(500);
        expect(body.data?.html).toContain('Alpha Diagnostics');
    });

    it('returns overallScore between 0 and 100', async () => {
        const res = await POST(JSON_REPORT_BODY);
        const body = parseApiResponse(res.body);
        expect(body.data?.overallScore).toBeGreaterThanOrEqual(0);
        expect(body.data?.overallScore).toBeLessThanOrEqual(100);
    });

    it('returns overallSeverity as a known value', async () => {
        const res = await POST(JSON_REPORT_BODY);
        const body = parseApiResponse(res.body);
        expect(['stable', 'monitor', 'critical', 'unknown']).toContain(
            body.data?.overallSeverity,
        );
    });

    it('returns renderedPages as non-empty array', async () => {
        const res = await POST(JSON_REPORT_BODY);
        const body = parseApiResponse(res.body);
        expect(Array.isArray(body.data?.renderedPages)).toBe(true);
        expect(body.data!.renderedPages!.length).toBeGreaterThan(0);
    });

    it('returns 404 for unknown tenant', async () => {
        const res = await POST({ ...JSON_REPORT_BODY, tenantId: 'nonexistent' });
        expect(res.statusCode).toBe(404);
        const body = parseApiResponse(res.body);
        expect(body.error?.code).toBe('TENANT_NOT_FOUND');
    });

    it('returns 400 for invalid body', async () => {
        const res = await POST({ tenantId: 'tenant-alpha' }); // missing reportData
        expect(res.statusCode).toBe(400);
        const body = parseApiResponse(res.body);
        expect(body.error?.code).toBe('INVALID_BODY');
    });

    it('increments ingestion counter', async () => {
        resetMetrics();
        await POST(JSON_REPORT_BODY);
        expect(getCounterValue(METRIC.INGESTION_TOTAL, { source: 'json' })).toBeGreaterThanOrEqual(1);
    });
});
