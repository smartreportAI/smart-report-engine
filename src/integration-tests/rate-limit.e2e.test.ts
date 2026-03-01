/**
 * Rate limit end-to-end tests.
 *
 * The global rate limiter allows 20 requests per tenant per minute.
 * We send 21 requests and verify the 21st is rejected with 429.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../app';
import { rateLimiter } from '../core/rate-limit/rate-limit.service';
import { resetMetrics } from '../metrics/metrics.service';
import { seedPages, JSON_REPORT_BODY } from './_helpers';

const app = buildApp();
const TEST_TENANT = 'tenant-alpha';
const RATE_LIMIT = 20;

beforeAll(async () => {
    seedPages();
    await app.ready();
});

afterAll(async () => {
    await app.close();
});

beforeEach(() => {
    // Flush the window for the test tenant so each test starts clean
    rateLimiter.reset(TEST_TENANT);
    resetMetrics();
});

const POST = (body: unknown) =>
    app.inject({
        method: 'POST',
        url: '/reports/generate',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify(body),
    });

// Use a unique patient per test to avoid cache hits (which skip rate-limit counting)
let patientCounter = 1000;
function nextPayload() {
    return {
        ...JSON_REPORT_BODY,
        reportData: {
            ...JSON_REPORT_BODY.reportData,
            patientId: `PAT-RL-${patientCounter++}`,
        },
    };
}

describe('Rate limiting', () => {
    it(`allows exactly ${RATE_LIMIT} requests within the window`, async () => {
        const requests = Array.from({ length: RATE_LIMIT }, () => POST(nextPayload()));
        const results = await Promise.all(requests);

        const statuses = results.map((r) => r.statusCode);
        expect(statuses.every((s) => s === 200)).toBe(true);
    });

    it('returns 429 on the request that exceeds the limit', async () => {
        // Exhaust the limit
        for (let i = 0; i < RATE_LIMIT; i++) {
            await POST(nextPayload());
        }

        // This one should be rejected
        const res = await POST(nextPayload());
        expect(res.statusCode).toBe(429);

        const body = JSON.parse(res.body);
        expect(body.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('sets X-RateLimit-* headers on every response', async () => {
        const res = await POST(nextPayload());
        expect(res.statusCode).toBe(200);
        expect(res.headers['x-ratelimit-limit']).toBe('20');
        expect(res.headers['x-ratelimit-remaining']).toBeDefined();
        expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('X-RateLimit-Remaining decrements with each request', async () => {
        const res1 = await POST(nextPayload());
        const res2 = await POST(nextPayload());

        const rem1 = Number(res1.headers['x-ratelimit-remaining']);
        const rem2 = Number(res2.headers['x-ratelimit-remaining']);

        // Remaining should be less after the second call
        expect(rem2).toBeLessThan(rem1);
    });

    it('different tenants have independent limits', async () => {
        // Exhaust tenant-alpha's limit
        for (let i = 0; i < RATE_LIMIT; i++) {
            await POST(nextPayload());
        }
        const alphaRes = await POST(nextPayload());
        expect(alphaRes.statusCode).toBe(429);

        // tenant-beta should still work (separate window)
        rateLimiter.reset('tenant-beta');
        const betaRes = await POST({
            ...nextPayload(),
            tenantId: 'tenant-beta',
        });
        expect(betaRes.statusCode).toBe(200);
    });
});
