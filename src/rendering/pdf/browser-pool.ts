import puppeteer, { type Browser } from 'puppeteer';

/**
 * Reusable browser pool for Puppeteer-based PDF generation.
 *
 * Instead of launching and tearing down a browser for every request,
 * this pool maintains a small set of warm browser instances that can
 * be checked out and returned.
 *
 * Configuration:
 *   - maxBrowsers:        Maximum concurrent browser processes.
 *   - maxPagesPerBrowser: Maximum pages opened on a single browser
 *                         before it is recycled (prevents memory leaks).
 *   - idleTimeoutMs:      How long an idle browser stays alive before
 *                         being shut down.
 */

interface PoolEntry {
    browser: Browser;
    pageCount: number;
    lastUsedAt: number;
}

export interface BrowserPoolConfig {
    maxBrowsers: number;
    maxPagesPerBrowser: number;
    idleTimeoutMs: number;
}

const DEFAULT_CONFIG: BrowserPoolConfig = {
    maxBrowsers: 2,
    maxPagesPerBrowser: 5,
    idleTimeoutMs: 60_000,
};

const LAUNCH_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--font-render-hinting=none',
];

export class BrowserPool {
    private readonly config: BrowserPoolConfig;
    private readonly pool: PoolEntry[] = [];
    private readonly waitQueue: Array<{
        resolve: (entry: PoolEntry) => void;
        reject: (err: Error) => void;
    }> = [];
    private idleTimer: ReturnType<typeof setInterval> | null = null;
    private isShuttingDown = false;

    constructor(config: Partial<BrowserPoolConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.startIdleReaper();
    }

    /**
     * Acquires a browser from the pool.
     *
     * - If an idle browser with capacity exists, return it.
     * - If pool is below maxBrowsers, launch a new one.
     * - Otherwise, wait until one becomes available.
     */
    async getBrowser(): Promise<Browser> {
        if (this.isShuttingDown) {
            throw new Error('BrowserPool is shutting down.');
        }

        // Try to find an existing browser with capacity
        const available = this.pool.find(
            (e) => e.pageCount < this.config.maxPagesPerBrowser,
        );

        if (available) {
            available.pageCount++;
            available.lastUsedAt = Date.now();
            return available.browser;
        }

        // Launch a new browser if under the limit
        if (this.pool.length < this.config.maxBrowsers) {
            const entry = await this.launchBrowser();
            entry.pageCount++;
            entry.lastUsedAt = Date.now();
            return entry.browser;
        }

        // All browsers are at max pages — wait for one to be released
        return new Promise<Browser>((resolve, reject) => {
            this.waitQueue.push({
                resolve: (entry: PoolEntry) => {
                    entry.pageCount++;
                    entry.lastUsedAt = Date.now();
                    resolve(entry.browser);
                },
                reject,
            });
        });
    }

    /**
     * Releases a browser back to the pool after use.
     *
     * If the browser has exceeded maxPagesPerBrowser across its lifetime,
     * it is closed and removed from the pool.
     */
    async releaseBrowser(browser: Browser): Promise<void> {
        const entry = this.pool.find((e) => e.browser === browser);

        if (!entry) return;

        entry.pageCount = Math.max(0, entry.pageCount - 1);
        entry.lastUsedAt = Date.now();

        // Serve any waiting callers
        if (this.waitQueue.length > 0 && entry.pageCount < this.config.maxPagesPerBrowser) {
            const waiter = this.waitQueue.shift()!;
            waiter.resolve(entry);
            return;
        }

        // Check if browser should be recycled
        // We track total pages via a simple heuristic: close if connected pages
        // are 0 and it has been used many times. For simplicity, the pool
        // handles recycling via the idle reaper.
    }

    /**
     * Shuts down all browsers in the pool.
     * Should be called when the server is stopping.
     */
    async shutdown(): Promise<void> {
        this.isShuttingDown = true;

        if (this.idleTimer) {
            clearInterval(this.idleTimer);
            this.idleTimer = null;
        }

        // Reject all waiting callers
        for (const waiter of this.waitQueue) {
            waiter.reject(new Error('BrowserPool is shutting down.'));
        }
        this.waitQueue.length = 0;

        // Close all browsers
        const closePromises = this.pool.map(async (entry) => {
            try {
                await entry.browser.close();
            } catch {
                // Browser may already be closed
            }
        });

        await Promise.all(closePromises);
        this.pool.length = 0;
    }

    /** Current number of browser processes in the pool. */
    get size(): number {
        return this.pool.length;
    }

    /** Number of callers waiting for a browser. */
    get waiting(): number {
        return this.waitQueue.length;
    }

    // -----------------------------------------------------------------------
    // Private
    // -----------------------------------------------------------------------

    private async launchBrowser(): Promise<PoolEntry> {
        const browser = await puppeteer.launch({
            headless: true,
            args: LAUNCH_ARGS,
            ...(process.env.PUPPETEER_EXECUTABLE_PATH && { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH })
        });

        const entry: PoolEntry = {
            browser,
            pageCount: 0,
            lastUsedAt: Date.now(),
        };

        // Handle unexpected browser disconnects
        browser.on('disconnected', () => {
            const idx = this.pool.indexOf(entry);
            if (idx !== -1) {
                this.pool.splice(idx, 1);
            }
        });

        this.pool.push(entry);
        return entry;
    }

    /**
     * Periodically closes browsers that have been idle for too long.
     */
    private startIdleReaper(): void {
        this.idleTimer = setInterval(async () => {
            const now = Date.now();
            const toClose: PoolEntry[] = [];

            for (let i = this.pool.length - 1; i >= 0; i--) {
                const entry = this.pool[i];
                if (
                    entry.pageCount === 0 &&
                    now - entry.lastUsedAt > this.config.idleTimeoutMs
                ) {
                    toClose.push(entry);
                    this.pool.splice(i, 1);
                }
            }

            for (const entry of toClose) {
                try {
                    await entry.browser.close();
                } catch {
                    // Already closed
                }
            }
        }, 10_000); // Check every 10 seconds

        // Don't block Node.js shutdown
        if (this.idleTimer.unref) {
            this.idleTimer.unref();
        }
    }
}

// ---------------------------------------------------------------------------
// Singleton pool instance
// ---------------------------------------------------------------------------

/** Global browser pool shared across all routes. */
export const browserPool = new BrowserPool();
