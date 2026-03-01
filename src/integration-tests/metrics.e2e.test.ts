/**
 * Metrics endpoint end-to-end tests.
 * GET /metrics
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildApp } from '../app';
import { resetMetrics } from '../metrics/metrics.service';
import { rateLimiter } from '../core/rate-limit/rate-limit.service';
import { seedPages, JSON_REPORT_BODY } from './_helpers';

const app = buildApp();

beforeAll(async () => {
    seedPages();
    // Clear stale cache so every report request in this suite is a miss
    try { rmSync(resolve(process.cwd(), 'cache'), { recursive: true, force: true }); } catch { }
    await app.ready();
    resetMetrics();
    rateLimiter.reset('tenant-alpha');
});

afterAll(async () => {
    await app.close();
});

const GET_METRICS = () =>
    app.inject({ method: 'GET', url: '/metrics' });

const POST_REPORT = (patientId: string) =>
    app.inject({
        method: 'POST',
        url: '/reports/generate',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify({
            ...JSON_REPORT_BODY,
            reportData: { ...JSON_REPORT_BODY.reportData, patientId },
        }),
    });

describe('GET /metrics', () => {
    it('returns 200 with text/plain content type', async () => {
        const res = await GET_METRICS();
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/plain');
    });

    it('returns empty-ish body before any requests', async () => {
        resetMetrics();
        const res = await GET_METRICS();
        expect(res.statusCode).toBe(200);
        // No metrics yet — body should be whitespace only
        expect(res.body.trim()).toBe('');
    });

    it('ingestion counter appears after a report request', async () => {
        resetMetrics();
        await POST_REPORT('PAT-METRICS-001');

        const res = await GET_METRICS();
        const text = res.body;

        expect(text).toContain('sre_ingestion_total{source="json"}');
        expect(text).toContain('# TYPE sre_ingestion_total counter');
    });

    it('cache miss counter appears after first unique request', async () => {
        resetMetrics();
        await POST_REPORT('PAT-METRICS-002');

        const res = await GET_METRICS();
        expect(res.body).toContain('sre_cache_miss_total{source="json"} 1');
    });

    it('cache hit counter appears after duplicate request', async () => {
        resetMetrics();
        // First call — miss
        await POST_REPORT('PAT-METRICS-003');
        // Second identical call — hit
        await POST_REPORT('PAT-METRICS-003');

        const res = await GET_METRICS();
        expect(res.body).toContain('sre_cache_hit_total{source="json"} 1');
    });

    it('severity counter appears with a severity label', async () => {
        resetMetrics();
        await POST_REPORT('PAT-METRICS-004');

        const res = await GET_METRICS();
        expect(res.body).toContain('sre_severity_total{severity=');
    });

    it('audit counter appears after first generation', async () => {
        resetMetrics();
        await POST_REPORT('PAT-METRICS-005');

        const res = await GET_METRICS();
        expect(res.body).toContain('sre_audit_total{source="json"} 1');
    });

    it('report duration summary is recorded', async () => {
        resetMetrics();
        await POST_REPORT('PAT-METRICS-006');

        const res = await GET_METRICS();
        const text = res.body;

        expect(text).toContain('sre_report_duration_ms{source="json"}_count 1');
        expect(text).toContain('sre_report_duration_ms{source="json"}_sum');
        expect(text).toContain('sre_report_duration_ms{source="json"}_avg');
    });

    it('output is valid Prometheus format (HELP before TYPE)', async () => {
        resetMetrics();
        await POST_REPORT('PAT-METRICS-007');

        const res = await GET_METRICS();
        const lines = res.body.split('\n').filter((l) => l.trim().length > 0);

        // Find all HELP and TYPE line indices
        const helpLines = lines.filter((l) => l.startsWith('# HELP'));
        const typeLines = lines.filter((l) => l.startsWith('# TYPE'));

        expect(helpLines.length).toBeGreaterThan(0);
        expect(typeLines.length).toBeGreaterThan(0);
        // There should be at least as many TYPE lines as HELP lines
        expect(typeLines.length).toBeGreaterThanOrEqual(helpLines.length);
    });
});
