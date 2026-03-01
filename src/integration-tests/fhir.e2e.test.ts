/**
 * FHIR ingestion end-to-end tests.
 * POST /ingest/fhir
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app';
import { resetMetrics, getCounterValue, METRIC } from '../metrics/metrics.service';
import { rateLimiter } from '../core/rate-limit/rate-limit.service';
import { seedPages, FHIR_INGEST_BODY, parseApiResponse } from './_helpers';

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
        url: '/ingest/fhir',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify(body),
    });

describe('POST /ingest/fhir — FHIR full flow', () => {
    it('returns 200 with HTML report', async () => {
        const res = await POST(FHIR_INGEST_BODY);
        expect(res.statusCode).toBe(200);

        const body = parseApiResponse(res.body);
        expect(body.success).toBe(true);
        expect(body.data?.html).toContain('<!DOCTYPE html>');
    });

    it('returns valid score and severity', async () => {
        const res = await POST(FHIR_INGEST_BODY);
        const body = parseApiResponse(res.body);
        expect(body.data?.overallScore).toBeGreaterThanOrEqual(0);
        expect(body.data?.overallScore).toBeLessThanOrEqual(100);
        expect(['stable', 'monitor', 'critical', 'unknown']).toContain(body.data?.overallSeverity);
    });

    it('returns renderedPages array', async () => {
        const res = await POST(FHIR_INGEST_BODY);
        const body = parseApiResponse(res.body);
        expect(Array.isArray(body.data?.renderedPages)).toBe(true);
        expect(body.data!.renderedPages!.length).toBeGreaterThan(0);
    });

    it('returns 400 for missing tenantId', async () => {
        const res = await POST({ fhirBundle: FHIR_INGEST_BODY.fhirBundle });
        expect(res.statusCode).toBe(400);
    });

    it('returns 422 for FHIR bundle with no Patient resource', async () => {
        const res = await POST({
            ...FHIR_INGEST_BODY,
            fhirBundle: {
                resourceType: 'Bundle',
                type: 'collection',
                // Has only an Observation entry — no Patient — so adapter rejects with 422
                entry: [
                    {
                        resource: {
                            resourceType: 'Observation',
                            id: 'obs-no-patient-001',
                            status: 'final',
                            code: {
                                coding: [{ code: '2093-3', display: 'Total Cholesterol' }],
                                text: 'Total Cholesterol',
                            },
                            valueQuantity: { value: 195, unit: 'mg/dL' },
                        },
                    },
                ],
            },
        });
        expect(res.statusCode).toBe(422);
        const body = parseApiResponse(res.body);
        expect(body.error?.code).toBe('FHIR_VALIDATION_FAILED');
    });

    it('returns 404 for unknown tenant', async () => {
        const res = await POST({ ...FHIR_INGEST_BODY, tenantId: 'ghost-tenant' });
        expect(res.statusCode).toBe(404);
    });

    it('increments FHIR ingestion counter', async () => {
        resetMetrics();
        await POST(FHIR_INGEST_BODY);
        expect(getCounterValue(METRIC.INGESTION_TOTAL, { source: 'fhir' })).toBe(1);
    });

    it('output matches same normalization shape as JSON route', async () => {
        const res = await POST(FHIR_INGEST_BODY);
        const body = parseApiResponse(res.body);
        // Both routes produce the same response envelope
        expect(body).toHaveProperty('success', true);
        expect(body).toHaveProperty('data.html');
        expect(body).toHaveProperty('data.overallScore');
        expect(body).toHaveProperty('data.overallSeverity');
        expect(body).toHaveProperty('data.renderedPages');
        expect(body).toHaveProperty('data.skippedPages');
    });
});
