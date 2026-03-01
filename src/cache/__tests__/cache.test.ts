import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    generateReportFingerprint,
    getCachedReport,
    getCachedPdf,
    storeCachedReport,
    storeCachedPdf,
} from '../report-cache.service';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TEST_CACHE_DIR = resolve(process.cwd(), 'tmp', 'test-cache');

afterEach(() => {
    try {
        rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
    } catch {
        // Ignore cleanup errors
    }
});

// ---------------------------------------------------------------------------
// Fingerprint determinism
// ---------------------------------------------------------------------------

describe('generateReportFingerprint', () => {
    it('produces a 64-character hex string', () => {
        const fp = generateReportFingerprint({ test: true }, 'tenant-a');
        expect(fp).toHaveLength(64);
        expect(fp).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic — same input + tenant = same fingerprint', () => {
        const input = { patientId: 'P1', age: 30, profiles: [] };
        const fp1 = generateReportFingerprint(input, 'tenant-a');
        const fp2 = generateReportFingerprint(input, 'tenant-a');
        expect(fp1).toBe(fp2);
    });

    it('is deterministic — key order does not matter', () => {
        const fp1 = generateReportFingerprint({ b: 2, a: 1 }, 'tenant-a');
        const fp2 = generateReportFingerprint({ a: 1, b: 2 }, 'tenant-a');
        expect(fp1).toBe(fp2);
    });

    it('produces different fingerprints for different inputs', () => {
        const fp1 = generateReportFingerprint({ patientId: 'P1' }, 'tenant-a');
        const fp2 = generateReportFingerprint({ patientId: 'P2' }, 'tenant-a');
        expect(fp1).not.toBe(fp2);
    });

    it('produces different fingerprints for different tenants', () => {
        const input = { patientId: 'P1' };
        const fp1 = generateReportFingerprint(input, 'tenant-a');
        const fp2 = generateReportFingerprint(input, 'tenant-b');
        expect(fp1).not.toBe(fp2);
    });
});

// ---------------------------------------------------------------------------
// Store and retrieve
// ---------------------------------------------------------------------------

describe('storeCachedReport + getCachedReport', () => {
    it('stores and retrieves a cached HTML report', () => {
        const fingerprint = 'test-fp-001';

        storeCachedReport(
            fingerprint,
            {
                tenantId: 'tenant-test',
                html: '<html><body>cached</body></html>',
                overallScore: 85,
                overallSeverity: 'stable',
                renderedPages: ['master-overview'],
                skippedPages: [],
            },
            undefined,
            TEST_CACHE_DIR,
        );

        const cached = getCachedReport(fingerprint, TEST_CACHE_DIR);
        expect(cached).not.toBeNull();
        expect(cached!.fingerprint).toBe(fingerprint);
        expect(cached!.tenantId).toBe('tenant-test');
        expect(cached!.html).toBe('<html><body>cached</body></html>');
        expect(cached!.overallScore).toBe(85);
        expect(cached!.overallSeverity).toBe('stable');
        expect(cached!.renderedPages).toEqual(['master-overview']);
        expect(cached!.skippedPages).toEqual([]);
        expect(cached!.createdAt).toBeDefined();
    });

    it('returns null for uncached fingerprint', () => {
        const cached = getCachedReport('nonexistent', TEST_CACHE_DIR);
        expect(cached).toBeNull();
    });

    it('creates directory if it does not exist', () => {
        const nestedDir = resolve(TEST_CACHE_DIR, 'deep', 'nested');

        storeCachedReport(
            'nested-test',
            {
                tenantId: 'test',
                html: '<html></html>',
                overallScore: 100,
                overallSeverity: 'stable',
                renderedPages: [],
                skippedPages: [],
            },
            undefined,
            nestedDir,
        );

        expect(existsSync(resolve(nestedDir, 'nested-test.json'))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// PDF caching
// ---------------------------------------------------------------------------

describe('PDF caching', () => {
    it('stores and retrieves a PDF buffer alongside report', () => {
        const fingerprint = 'pdf-cache-001';
        const pdfBuffer = Buffer.from('%PDF-1.4 fake content');

        storeCachedReport(
            fingerprint,
            {
                tenantId: 'test',
                html: '<html></html>',
                overallScore: 70,
                overallSeverity: 'monitor',
                renderedPages: ['page-1'],
                skippedPages: [],
            },
            pdfBuffer,
            TEST_CACHE_DIR,
        );

        const cachedPdf = getCachedPdf(fingerprint, TEST_CACHE_DIR);
        expect(cachedPdf).not.toBeNull();
        expect(cachedPdf!.toString()).toBe('%PDF-1.4 fake content');

        // HTML should also be cached
        const cachedReport = getCachedReport(fingerprint, TEST_CACHE_DIR);
        expect(cachedReport).not.toBeNull();
    });

    it('returns null for uncached PDF', () => {
        expect(getCachedPdf('no-pdf', TEST_CACHE_DIR)).toBeNull();
    });

    it('stores a PDF separately via storeCachedPdf', () => {
        const fingerprint = 'late-pdf';

        // First store just HTML
        storeCachedReport(
            fingerprint,
            {
                tenantId: 'test',
                html: '<html>html-only</html>',
                overallScore: 90,
                overallSeverity: 'stable',
                renderedPages: [],
                skippedPages: [],
            },
            undefined,
            TEST_CACHE_DIR,
        );

        // No PDF yet
        expect(getCachedPdf(fingerprint, TEST_CACHE_DIR)).toBeNull();

        // Now store PDF separately
        storeCachedPdf(fingerprint, Buffer.from('late-pdf-data'), TEST_CACHE_DIR);

        const cachedPdf = getCachedPdf(fingerprint, TEST_CACHE_DIR);
        expect(cachedPdf).not.toBeNull();
        expect(cachedPdf!.toString()).toBe('late-pdf-data');
    });
});

// ---------------------------------------------------------------------------
// Idempotency simulation
// ---------------------------------------------------------------------------

describe('idempotency', () => {
    it('second call with same fingerprint reads cached data (no regeneration)', () => {
        const input = { patientId: 'PAT-IDEM', age: 35, profiles: [] };
        const fingerprint = generateReportFingerprint(input, 'tenant-alpha');

        // Simulate first generation: store result
        storeCachedReport(
            fingerprint,
            {
                tenantId: 'tenant-alpha',
                html: '<html>generated-on-first-call</html>',
                overallScore: 72,
                overallSeverity: 'monitor',
                renderedPages: ['master-overview'],
                skippedPages: ['profile-detail'],
            },
            undefined,
            TEST_CACHE_DIR,
        );

        // Simulate second call: lookup should succeed
        const cached = getCachedReport(fingerprint, TEST_CACHE_DIR);
        expect(cached).not.toBeNull();
        expect(cached!.html).toBe('<html>generated-on-first-call</html>');
        expect(cached!.overallScore).toBe(72);
    });

    it('different input creates a separate cache entry', () => {
        const inputA = { patientId: 'PAT-A', age: 30 };
        const inputB = { patientId: 'PAT-B', age: 40 };

        const fpA = generateReportFingerprint(inputA, 'tenant-alpha');
        const fpB = generateReportFingerprint(inputB, 'tenant-alpha');

        storeCachedReport(
            fpA,
            {
                tenantId: 'tenant-alpha',
                html: '<html>report-A</html>',
                overallScore: 80,
                overallSeverity: 'stable',
                renderedPages: [],
                skippedPages: [],
            },
            undefined,
            TEST_CACHE_DIR,
        );

        storeCachedReport(
            fpB,
            {
                tenantId: 'tenant-alpha',
                html: '<html>report-B</html>',
                overallScore: 60,
                overallSeverity: 'monitor',
                renderedPages: [],
                skippedPages: [],
            },
            undefined,
            TEST_CACHE_DIR,
        );

        const cachedA = getCachedReport(fpA, TEST_CACHE_DIR);
        const cachedB = getCachedReport(fpB, TEST_CACHE_DIR);

        expect(cachedA!.html).toBe('<html>report-A</html>');
        expect(cachedB!.html).toBe('<html>report-B</html>');
        expect(cachedA!.overallScore).not.toBe(cachedB!.overallScore);
    });
});
