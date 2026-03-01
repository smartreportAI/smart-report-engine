/**
 * Cache idempotency end-to-end tests.
 *
 * Verifies that:
 * 1. First call generates the report (cache miss).
 * 2. Second identical call returns the cached result (cache hit).
 * 3. Audit is NOT duplicated on cache hit.
 * 4. HTML response is byte-for-byte identical between calls.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildApp } from '../app';
import { resetMetrics, getCounterValue, METRIC } from '../metrics/metrics.service';
import { rateLimiter } from '../core/rate-limit/rate-limit.service';
import { seedPages, JSON_REPORT_BODY, parseApiResponse } from './_helpers';

/** Purge all on-disk cache files so every test run starts cold. */
function clearCache() {
    try {
        rmSync(resolve(process.cwd(), 'cache'), { recursive: true, force: true });
    } catch {
        // Ignore if directory doesn't exist
    }
}

const app = buildApp();

beforeAll(async () => {
    seedPages();
    clearCache(); // ← cold cache guaranteed
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
        url: '/reports/generate',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify(body),
    });

describe('Cache idempotency', () => {
    it('first request is a cache miss, second is a cache hit', async () => {
        // Use a unique patient so this test does not collide with json.e2e.test.ts
        const payload = {
            ...JSON_REPORT_BODY,
            reportData: { ...JSON_REPORT_BODY.reportData, patientId: 'PAT-CACHE-E2E-001' },
        };

        resetMetrics();

        // First call — must be a miss
        const res1 = await POST(payload);
        expect(res1.statusCode).toBe(200);
        expect(getCounterValue(METRIC.CACHE_MISS_TOTAL, { source: 'json' })).toBe(1);
        expect(getCounterValue(METRIC.CACHE_HIT_TOTAL, { source: 'json' })).toBe(0);

        // Second call — must be a hit
        const res2 = await POST(payload);
        expect(res2.statusCode).toBe(200);
        expect(getCounterValue(METRIC.CACHE_HIT_TOTAL, { source: 'json' })).toBe(1);
        expect(getCounterValue(METRIC.CACHE_MISS_TOTAL, { source: 'json' })).toBe(1); // unchanged
    });

    it('cached response HTML is identical to the original', async () => {
        const payload = {
            ...JSON_REPORT_BODY,
            reportData: { ...JSON_REPORT_BODY.reportData, patientId: 'PAT-CACHE-E2E-002' },
        };

        const res1 = await POST(payload);
        const res2 = await POST(payload);

        const body1 = parseApiResponse(res1.body);
        const body2 = parseApiResponse(res2.body);

        expect(body1.data?.html).toBeDefined();
        expect(body1.data?.html).toBe(body2.data?.html);
        expect(body1.data?.overallScore).toBe(body2.data?.overallScore);
        expect(body1.data?.overallSeverity).toBe(body2.data?.overallSeverity);
    });

    it('audit is not duplicated on cache hit', async () => {
        const payload = {
            ...JSON_REPORT_BODY,
            reportData: { ...JSON_REPORT_BODY.reportData, patientId: 'PAT-CACHE-E2E-003' },
        };

        resetMetrics();
        await POST(payload); // first — creates audit
        await POST(payload); // second — cache hit, skips audit

        // Only 1 audit should be created (for the first call)
        expect(getCounterValue(METRIC.AUDIT_TOTAL, { source: 'json' })).toBe(1);
    });

    it('different inputs produce separate cache entries', async () => {
        const payload1 = {
            ...JSON_REPORT_BODY,
            reportData: { ...JSON_REPORT_BODY.reportData, patientId: 'PAT-CACHE-A', age: 30 },
        };
        const payload2 = {
            ...JSON_REPORT_BODY,
            reportData: { ...JSON_REPORT_BODY.reportData, patientId: 'PAT-CACHE-B', age: 60 },
        };

        resetMetrics();
        await POST(payload1);
        await POST(payload2);

        // Both are cache misses — separate entries
        expect(getCounterValue(METRIC.CACHE_MISS_TOTAL, { source: 'json' })).toBe(2);
        expect(getCounterValue(METRIC.CACHE_HIT_TOTAL, { source: 'json' })).toBe(0);
    });
});
