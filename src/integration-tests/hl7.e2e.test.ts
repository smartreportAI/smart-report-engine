/**
 * HL7 ingestion end-to-end tests.
 * POST /ingest/hl7
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app';
import { resetMetrics, getCounterValue, METRIC } from '../metrics/metrics.service';
import { rateLimiter } from '../core/rate-limit/rate-limit.service';
import { seedPages, HL7_INGEST_BODY, parseApiResponse } from './_helpers';

const app = buildApp();

beforeAll(async () => {
    seedPages();
    await app.ready();
    resetMetrics();
    rateLimiter.reset('tenant-alpha');
});

afterAll(async () => {
    await app.close();
});

const POST = (body: unknown) =>
    app.inject({
        method: 'POST',
        url: '/ingest/hl7',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify(body),
    });

describe('POST /ingest/hl7 — HL7 full flow', () => {
    it('returns 200 with HTML report', async () => {
        const res = await POST(HL7_INGEST_BODY);
        expect(res.statusCode).toBe(200);

        const body = parseApiResponse(res.body);
        expect(body.success).toBe(true);
        expect(body.data?.html).toContain('<!DOCTYPE html>');
    });

    it('returns valid score and severity', async () => {
        const res = await POST(HL7_INGEST_BODY);
        const body = parseApiResponse(res.body);
        expect(body.data?.overallScore).toBeGreaterThanOrEqual(0);
        expect(body.data?.overallScore).toBeLessThanOrEqual(100);
        expect(['stable', 'monitor', 'critical', 'unknown']).toContain(body.data?.overallSeverity);
    });

    it('returns renderedPages array', async () => {
        const res = await POST(HL7_INGEST_BODY);
        const body = parseApiResponse(res.body);
        expect(Array.isArray(body.data?.renderedPages)).toBe(true);
    });

    it('returns 400 for missing hl7Message', async () => {
        const res = await POST({ tenantId: 'tenant-alpha' });
        expect(res.statusCode).toBe(400);
        const body = parseApiResponse(res.body);
        expect(body.error?.code).toBe('INVALID_BODY');
    });

    it('returns 422 for message with wrong message type', async () => {
        const badMsg = [
            'MSH|^~\\&|LAB|HOSP|APP|DEST|20240101120000||ADT^A01|MSG002|P|2.5', // wrong type
            'PID|1||BAD-001|||Patient^Bad||19900101|M',
        ].join('\r');

        const res = await POST({ ...HL7_INGEST_BODY, hl7Message: badMsg });
        expect(res.statusCode).toBe(422);
        const body = parseApiResponse(res.body);
        expect(body.error?.code).toBe('HL7_PARSE_FAILED');
    });

    it('returns 404 for unknown tenant', async () => {
        const res = await POST({ ...HL7_INGEST_BODY, tenantId: 'ghost-tenant' });
        expect(res.statusCode).toBe(404);
    });

    it('increments HL7 ingestion counter', async () => {
        resetMetrics();
        await POST(HL7_INGEST_BODY);
        expect(getCounterValue(METRIC.INGESTION_TOTAL, { source: 'hl7' })).toBe(1);
    });

    it('response shape matches JSON/FHIR routes', async () => {
        const res = await POST(HL7_INGEST_BODY);
        const body = parseApiResponse(res.body);
        expect(body).toHaveProperty('success', true);
        expect(body).toHaveProperty('data.html');
        expect(body).toHaveProperty('data.overallScore');
        expect(body).toHaveProperty('data.overallSeverity');
        expect(body).toHaveProperty('data.renderedPages');
        expect(body).toHaveProperty('data.skippedPages');
    });
});
