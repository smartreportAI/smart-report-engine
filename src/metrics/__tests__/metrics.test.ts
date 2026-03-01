import { describe, it, expect, beforeEach } from 'vitest';
import {
    incrementCounter,
    observeDuration,
    getMetricsText,
    getCounterValue,
    getDurationStats,
    resetMetrics,
    METRIC,
} from '../metrics.service';

// Reset the global in-memory store before every test
beforeEach(() => {
    resetMetrics();
});

// ---------------------------------------------------------------------------
// Counter tests
// ---------------------------------------------------------------------------

describe('incrementCounter', () => {
    it('starts at zero for unknown keys', () => {
        expect(getCounterValue('sre_unknown')).toBe(0);
    });

    it('increments by 1 by default', () => {
        incrementCounter(METRIC.INGESTION_TOTAL, { source: 'json' });
        expect(getCounterValue(METRIC.INGESTION_TOTAL, { source: 'json' })).toBe(1);
    });

    it('increments by custom amount', () => {
        incrementCounter(METRIC.MAPPING_WARNING_TOTAL, { source: 'fhir' }, 3);
        expect(getCounterValue(METRIC.MAPPING_WARNING_TOTAL, { source: 'fhir' })).toBe(3);
    });

    it('accumulates across multiple calls', () => {
        incrementCounter(METRIC.INGESTION_TOTAL, { source: 'hl7' });
        incrementCounter(METRIC.INGESTION_TOTAL, { source: 'hl7' });
        incrementCounter(METRIC.INGESTION_TOTAL, { source: 'hl7' });
        expect(getCounterValue(METRIC.INGESTION_TOTAL, { source: 'hl7' })).toBe(3);
    });

    it('tracks labels independently', () => {
        incrementCounter(METRIC.INGESTION_TOTAL, { source: 'json' });
        incrementCounter(METRIC.INGESTION_TOTAL, { source: 'fhir' });
        incrementCounter(METRIC.INGESTION_TOTAL, { source: 'fhir' });

        expect(getCounterValue(METRIC.INGESTION_TOTAL, { source: 'json' })).toBe(1);
        expect(getCounterValue(METRIC.INGESTION_TOTAL, { source: 'fhir' })).toBe(2);
        expect(getCounterValue(METRIC.INGESTION_TOTAL, { source: 'hl7' })).toBe(0);
    });

    it('handles no-label counters', () => {
        incrementCounter('sre_test_no_labels');
        expect(getCounterValue('sre_test_no_labels')).toBe(1);
    });

    it('label key order does not affect bucketing', () => {
        incrementCounter('sre_test', { b: '2', a: '1' });
        const val = getCounterValue('sre_test', { a: '1', b: '2' });
        expect(val).toBe(1);
    });

    it('tracks cache hits and misses separately', () => {
        incrementCounter(METRIC.CACHE_HIT_TOTAL, { source: 'json' });
        incrementCounter(METRIC.CACHE_HIT_TOTAL, { source: 'json' });
        incrementCounter(METRIC.CACHE_MISS_TOTAL, { source: 'json' });

        expect(getCounterValue(METRIC.CACHE_HIT_TOTAL, { source: 'json' })).toBe(2);
        expect(getCounterValue(METRIC.CACHE_MISS_TOTAL, { source: 'json' })).toBe(1);
    });

    it('tracks severity distribution', () => {
        incrementCounter(METRIC.SEVERITY_TOTAL, { severity: 'stable' });
        incrementCounter(METRIC.SEVERITY_TOTAL, { severity: 'stable' });
        incrementCounter(METRIC.SEVERITY_TOTAL, { severity: 'monitor' });
        incrementCounter(METRIC.SEVERITY_TOTAL, { severity: 'critical' });

        expect(getCounterValue(METRIC.SEVERITY_TOTAL, { severity: 'stable' })).toBe(2);
        expect(getCounterValue(METRIC.SEVERITY_TOTAL, { severity: 'monitor' })).toBe(1);
        expect(getCounterValue(METRIC.SEVERITY_TOTAL, { severity: 'critical' })).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Duration observation tests
// ---------------------------------------------------------------------------

describe('observeDuration', () => {
    it('returns null before any observation', () => {
        expect(getDurationStats(METRIC.PDF_DURATION_MS)).toBeNull();
    });

    it('stores first observation correctly', () => {
        observeDuration(METRIC.PDF_DURATION_MS, 500, { source: 'json' });
        const stats = getDurationStats(METRIC.PDF_DURATION_MS, { source: 'json' });
        expect(stats).not.toBeNull();
        expect(stats!.count).toBe(1);
        expect(stats!.sum).toBe(500);
        expect(stats!.min).toBe(500);
        expect(stats!.max).toBe(500);
    });

    it('accumulates multiple observations', () => {
        observeDuration(METRIC.REPORT_DURATION_MS, 100, { source: 'fhir' });
        observeDuration(METRIC.REPORT_DURATION_MS, 300, { source: 'fhir' });
        observeDuration(METRIC.REPORT_DURATION_MS, 200, { source: 'fhir' });

        const stats = getDurationStats(METRIC.REPORT_DURATION_MS, { source: 'fhir' });
        expect(stats!.count).toBe(3);
        expect(stats!.sum).toBe(600);
        expect(stats!.min).toBe(100);
        expect(stats!.max).toBe(300);
    });

    it('tracks different label groups independently', () => {
        observeDuration(METRIC.PDF_DURATION_MS, 1000, { source: 'json' });
        observeDuration(METRIC.PDF_DURATION_MS, 2000, { source: 'fhir' });

        const jsonStats = getDurationStats(METRIC.PDF_DURATION_MS, { source: 'json' });
        const fhirStats = getDurationStats(METRIC.PDF_DURATION_MS, { source: 'fhir' });

        expect(jsonStats!.sum).toBe(1000);
        expect(fhirStats!.sum).toBe(2000);
    });
});

// ---------------------------------------------------------------------------
// resetMetrics
// ---------------------------------------------------------------------------

describe('resetMetrics', () => {
    it('clears all counters and durations', () => {
        incrementCounter(METRIC.INGESTION_TOTAL, { source: 'json' });
        observeDuration(METRIC.PDF_DURATION_MS, 500, { source: 'json' });

        resetMetrics();

        expect(getCounterValue(METRIC.INGESTION_TOTAL, { source: 'json' })).toBe(0);
        expect(getDurationStats(METRIC.PDF_DURATION_MS, { source: 'json' })).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Prometheus text output
// ---------------------------------------------------------------------------

describe('getMetricsText', () => {
    it('returns empty string when no metrics recorded', () => {
        const text = getMetricsText();
        // Only newlines/whitespace from empty groups
        expect(text.trim()).toBe('');
    });

    it('includes HELP and TYPE lines for counters', () => {
        incrementCounter(METRIC.INGESTION_TOTAL, { source: 'json' });
        const text = getMetricsText();
        expect(text).toContain('# HELP sre_ingestion_total');
        expect(text).toContain('# TYPE sre_ingestion_total counter');
    });

    it('includes counter value in output', () => {
        incrementCounter(METRIC.INGESTION_TOTAL, { source: 'json' });
        incrementCounter(METRIC.INGESTION_TOTAL, { source: 'json' });
        const text = getMetricsText();
        expect(text).toContain('sre_ingestion_total{source="json"} 2');
    });

    it('includes HELP and TYPE lines for duration summaries', () => {
        observeDuration(METRIC.PDF_DURATION_MS, 300, { source: 'json' });
        const text = getMetricsText();
        expect(text).toContain('# HELP sre_pdf_duration_ms');
        expect(text).toContain('# TYPE sre_pdf_duration_ms summary');
    });

    it('includes _count, _sum, _min, _max, _avg for durations', () => {
        observeDuration(METRIC.PDF_DURATION_MS, 400, { source: 'json' });
        observeDuration(METRIC.PDF_DURATION_MS, 600, { source: 'json' });
        const text = getMetricsText();
        expect(text).toContain('sre_pdf_duration_ms{source="json"}_count 2');
        expect(text).toContain('sre_pdf_duration_ms{source="json"}_sum 1000.0');
        expect(text).toContain('sre_pdf_duration_ms{source="json"}_min 400.0');
        expect(text).toContain('sre_pdf_duration_ms{source="json"}_max 600.0');
        expect(text).toContain('sre_pdf_duration_ms{source="json"}_avg 500.0');
    });

    it('includes multiple metric families in the same output', () => {
        incrementCounter(METRIC.INGESTION_TOTAL, { source: 'json' });
        incrementCounter(METRIC.CACHE_HIT_TOTAL, { source: 'json' });
        observeDuration(METRIC.REPORT_DURATION_MS, 150, { source: 'json' });

        const text = getMetricsText();
        expect(text).toContain('sre_ingestion_total');
        expect(text).toContain('sre_cache_hit_total');
        expect(text).toContain('sre_report_duration_ms');
    });

    it('includes all predefined metric help texts', () => {
        incrementCounter(METRIC.INGESTION_TOTAL, { source: 'json' });
        incrementCounter(METRIC.PDF_GENERATION_TOTAL, { source: 'json' });
        incrementCounter(METRIC.AUDIT_TOTAL, { source: 'json' });
        observeDuration(METRIC.PDF_DURATION_MS, 200, { source: 'json' });

        const text = getMetricsText();
        expect(text).toContain('Total number of report ingestion requests');
        expect(text).toContain('Total number of PDF generations');
        expect(text).toContain('Total audit records saved');
        expect(text).toContain('PDF generation duration in milliseconds');
    });
});
