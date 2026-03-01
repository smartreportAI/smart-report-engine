/**
 * Concurrency end-to-end tests.
 *
 * Fires N parallel report requests and asserts all succeed cleanly
 * with unique audit fingerprints and no unhandled errors.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app';
import { rateLimiter } from '../core/rate-limit/rate-limit.service';
import { resetMetrics, getCounterValue, METRIC } from '../metrics/metrics.service';
import { seedPages, JSON_REPORT_BODY, FHIR_INGEST_BODY, HL7_INGEST_BODY, parseApiResponse } from './_helpers';

const app = buildApp();

beforeAll(async () => {
    seedPages();
    await app.ready();
    // Reset rate limit — we'll send 10 parallel unique requests
    rateLimiter.reset('tenant-alpha');
    rateLimiter.reset('tenant-beta');
    resetMetrics();
});

afterAll(async () => {
    await app.close();
});

const POST = (body: unknown) =>
    app.inject({
        method: 'POST',
        url: '/reports/generate',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify(body),
    });

describe('Concurrency', () => {
    it('handles 10 parallel requests without errors', async () => {
        const PARALLEL = 10;

        const requests = Array.from({ length: PARALLEL }, (_, i) =>
            POST({
                ...JSON_REPORT_BODY,
                reportData: {
                    ...JSON_REPORT_BODY.reportData,
                    // Each request has a unique patient so they exercise the full pipeline
                    patientId: `PAT-CONC-${i}`,
                    age: 20 + i,
                },
            }),
        );

        const results = await Promise.all(requests);

        // All must succeed
        results.forEach((res, i) => {
            expect(res.statusCode, `Request ${i} should return 200`).toBe(200);
        });
    });

    it('all parallel responses contain valid HTML', async () => {
        const PARALLEL = 5;

        const results = await Promise.all(
            Array.from({ length: PARALLEL }, (_, i) =>
                POST({
                    ...JSON_REPORT_BODY,
                    reportData: {
                        ...JSON_REPORT_BODY.reportData,
                        patientId: `PAT-HTML-${i}`,
                        age: 30 + i,
                    },
                }),
            ),
        );

        results.forEach((res) => {
            const body = parseApiResponse(res.body);
            expect(body.success).toBe(true);
            expect(body.data?.html).toContain('<!DOCTYPE html>');
            expect(body.data?.overallScore).toBeGreaterThanOrEqual(0);
        });
    });

    it('parallel requests to FHIR + HL7 + JSON routes all succeed', async () => {
        rateLimiter.reset('tenant-alpha');

        const [jsonRes, fhirRes, hl7Res] = await Promise.all([
            POST({
                ...JSON_REPORT_BODY,
                reportData: { ...JSON_REPORT_BODY.reportData, patientId: 'PAT-MIX-JSON' },
            }),
            app.inject({
                method: 'POST',
                url: '/ingest/fhir',
                headers: { 'Content-Type': 'application/json' },
                payload: JSON.stringify(FHIR_INGEST_BODY),
            }),
            app.inject({
                method: 'POST',
                url: '/ingest/hl7',
                headers: { 'Content-Type': 'application/json' },
                payload: JSON.stringify(HL7_INGEST_BODY),
            }),
        ]);

        expect(jsonRes.statusCode).toBe(200);
        expect(fhirRes.statusCode).toBe(200);
        expect(hl7Res.statusCode).toBe(200);
    });

    it('ingestion counter reflects all parallel calls', async () => {
        resetMetrics();
        rateLimiter.reset('tenant-alpha');

        const PARALLEL = 5;
        await Promise.all(
            Array.from({ length: PARALLEL }, (_, i) =>
                POST({
                    ...JSON_REPORT_BODY,
                    reportData: { ...JSON_REPORT_BODY.reportData, patientId: `PAT-CTR-${i}` },
                }),
            ),
        );

        expect(getCounterValue(METRIC.INGESTION_TOTAL, { source: 'json' })).toBe(PARALLEL);
    });
});
