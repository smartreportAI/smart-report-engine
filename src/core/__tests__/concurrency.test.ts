import { describe, it, expect, beforeEach, afterAll, afterEach } from 'vitest';
import { RateLimiter } from '../rate-limit/rate-limit.service';
import { BrowserPool } from '../../rendering/pdf/browser-pool';
import { generatePdfFromHtml, shutdownPdfService } from '../../rendering/pdf/pdf.service';

// ---------------------------------------------------------------------------
// Rate Limiter
// ---------------------------------------------------------------------------

describe('RateLimiter', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
        limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
    });

    afterEach(() => {
        limiter?.destroy();
    });

    it('allows requests within the limit', () => {
        const r1 = limiter.check('tenant-a');
        expect(r1.allowed).toBe(true);
        expect(r1.remaining).toBe(2);

        const r2 = limiter.check('tenant-a');
        expect(r2.allowed).toBe(true);
        expect(r2.remaining).toBe(1);

        const r3 = limiter.check('tenant-a');
        expect(r3.allowed).toBe(true);
        expect(r3.remaining).toBe(0);
    });

    it('rejects requests over the limit', () => {
        limiter.check('tenant-a');
        limiter.check('tenant-a');
        limiter.check('tenant-a');

        const r4 = limiter.check('tenant-a');
        expect(r4.allowed).toBe(false);
        expect(r4.remaining).toBe(0);
    });

    it('tracks tenants independently', () => {
        limiter.check('tenant-a');
        limiter.check('tenant-a');
        limiter.check('tenant-a');

        expect(limiter.check('tenant-a').allowed).toBe(false);

        const r = limiter.check('tenant-b');
        expect(r.allowed).toBe(true);
        expect(r.remaining).toBe(2);
    });

    it('resets window after expiry', async () => {
        const fastLimiter = new RateLimiter({ maxRequests: 1, windowMs: 100 });

        fastLimiter.check('tenant-x');
        expect(fastLimiter.check('tenant-x').allowed).toBe(false);

        await new Promise((resolve) => setTimeout(resolve, 150));

        const r = fastLimiter.check('tenant-x');
        expect(r.allowed).toBe(true);
        fastLimiter.destroy();
    });

    it('provides a resetsAt timestamp', () => {
        const now = Date.now();
        const r = limiter.check('tenant-time');
        expect(r.resetsAt).toBeGreaterThanOrEqual(now);
        expect(r.resetsAt).toBeLessThanOrEqual(now + 2000);
    });

    it('reset() clears a specific tenant', () => {
        limiter.check('tenant-a');
        limiter.check('tenant-a');
        limiter.check('tenant-a');
        expect(limiter.check('tenant-a').allowed).toBe(false);

        limiter.reset('tenant-a');
        expect(limiter.check('tenant-a').allowed).toBe(true);
    });

    it('resetAll() clears all tenants', () => {
        limiter.check('a');
        limiter.check('b');
        expect(limiter.size).toBe(2);

        limiter.resetAll();
        expect(limiter.size).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Browser Pool (each test creates and destroys its own pool)
// ---------------------------------------------------------------------------

describe('BrowserPool', () => {
    it('starts with zero browsers', async () => {
        const pool = new BrowserPool({ maxBrowsers: 2, maxPagesPerBrowser: 3, idleTimeoutMs: 60_000 });
        expect(pool.size).toBe(0);
        await pool.shutdown();
    });

    it('launches a browser on first getBrowser()', async () => {
        const pool = new BrowserPool({ maxBrowsers: 2, maxPagesPerBrowser: 3, idleTimeoutMs: 60_000 });
        const browser = await pool.getBrowser();
        expect(pool.size).toBe(1);
        await pool.releaseBrowser(browser);
        await pool.shutdown();
    }, 15_000);

    it('reuses existing browser on subsequent calls', async () => {
        const pool = new BrowserPool({ maxBrowsers: 2, maxPagesPerBrowser: 5, idleTimeoutMs: 60_000 });
        const b1 = await pool.getBrowser();
        await pool.releaseBrowser(b1);

        const b2 = await pool.getBrowser();
        expect(b1).toBe(b2);
        expect(pool.size).toBe(1);
        await pool.releaseBrowser(b2);
        await pool.shutdown();
    }, 15_000);

    it('shutdown() closes all browsers', async () => {
        const pool = new BrowserPool({ maxBrowsers: 2, maxPagesPerBrowser: 5, idleTimeoutMs: 60_000 });
        await pool.getBrowser();
        expect(pool.size).toBe(1);

        await pool.shutdown();
        expect(pool.size).toBe(0);
    }, 15_000);
});

// ---------------------------------------------------------------------------
// PDF Timeout (uses the singleton pool via generatePdfFromHtml)
// ---------------------------------------------------------------------------

describe('PDF timeout', () => {
    afterAll(async () => {
        await shutdownPdfService();
    });

    it('generates PDF normally with sufficient timeout', async () => {
        const html = '<!DOCTYPE html><html><body><h1>Test</h1></body></html>';
        const buffer = await generatePdfFromHtml(html, { timeoutMs: 30_000 });
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(1000);
    }, 30_000);

    it('rejects with timeout error when timeout is too short', async () => {
        const html = '<!DOCTYPE html><html><body><h1>Test</h1></body></html>';
        // 1ms timeout — practically impossible to complete
        await expect(
            generatePdfFromHtml(html, { timeoutMs: 1 }),
        ).rejects.toThrow(/timed out/i);
    }, 30_000);
});
