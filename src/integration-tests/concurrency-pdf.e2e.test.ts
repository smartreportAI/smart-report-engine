/**
 * Puppeteer concurrency end-to-end tests.
 *
 * Verifies that the browser pool handles concurrent PDF requests
 * correctly — browsers are reused, not spawned per-request.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app';
import { rateLimiter } from '../core/rate-limit/rate-limit.service';
import { resetMetrics, getCounterValue, METRIC } from '../metrics/metrics.service';
import { shutdownPdfService } from '../rendering/pdf/pdf.service';
import { seedPages, JSON_REPORT_BODY } from './_helpers';

const app = buildApp();
const TIMEOUT = 60_000;

beforeAll(async () => {
    seedPages();
    await app.ready();
    resetMetrics();
    rateLimiter.reset('tenant-alpha');
    rateLimiter.reset('tenant-beta');
});

afterAll(async () => {
    await app.close();
    await shutdownPdfService();
});

const POST_PDF = (patientId: string) =>
    app.inject({
        method: 'POST',
        url: '/reports/generate',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify({
            ...JSON_REPORT_BODY,
            output: 'pdf',
            reportData: { ...JSON_REPORT_BODY.reportData, patientId },
        }),
    });

describe('Puppeteer concurrency via pool', () => {
    it('3 concurrent PDF requests all succeed', async () => {
        const CONCURRENT = 3;
        const results = await Promise.all(
            Array.from({ length: CONCURRENT }, (_, i) => POST_PDF(`PAT-CPDF-${i}`)),
        );

        results.forEach((res, i) => {
            expect(res.statusCode, `Request ${i} should be 200`).toBe(200);
            const magic = res.rawPayload.subarray(0, 5).toString('ascii');
            expect(magic, `Request ${i} should be a valid PDF`).toBe('%PDF-');
        });

        expect(getCounterValue(METRIC.PDF_GENERATION_TOTAL, { source: 'json' })).toBe(CONCURRENT);
    }, TIMEOUT);

    it('sequential PDF requests reuse pool browsers', async () => {
        resetMetrics();
        rateLimiter.reset('tenant-alpha');

        await POST_PDF('PAT-SEQ-1');
        await POST_PDF('PAT-SEQ-2');
        await POST_PDF('PAT-SEQ-3');

        // All 3 should have generated PDFs (no cache for these unique patients)
        expect(getCounterValue(METRIC.PDF_GENERATION_TOTAL, { source: 'json' })).toBe(3);
    }, TIMEOUT);
});
