import type { RateLimitConfig, RateLimitResult } from './rate-limit.types';

/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Each key (e.g. tenantId) gets its own request counter and window.
 * When the window expires, the counter resets.
 *
 * This is suitable for single-process deployments. For multi-instance
 * deployments, replace with Redis-backed rate limiting.
 */

interface WindowState {
    /** Number of requests made in the current window. */
    count: number;
    /** Timestamp (ms) when the current window started. */
    windowStart: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
    maxRequests: 20,
    windowMs: 60_000, // 1 minute
};

export class RateLimiter {
    private readonly config: RateLimitConfig;
    private readonly windows = new Map<string, WindowState>();
    private cleanupTimer: ReturnType<typeof setInterval> | null = null;

    constructor(config: Partial<RateLimitConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.startCleanup();
    }

    /**
     * Checks and records a request for the given key.
     *
     * @param key - Typically the tenantId.
     * @returns RateLimitResult indicating whether the request is allowed.
     */
    check(key: string): RateLimitResult {
        const now = Date.now();
        let state = this.windows.get(key);

        // Create or reset window if expired
        if (!state || now - state.windowStart >= this.config.windowMs) {
            state = { count: 0, windowStart: now };
            this.windows.set(key, state);
        }

        const resetsAt = state.windowStart + this.config.windowMs;

        if (state.count >= this.config.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetsAt,
            };
        }

        state.count++;

        return {
            allowed: true,
            remaining: this.config.maxRequests - state.count,
            resetsAt,
        };
    }

    /**
     * Resets the counter for a specific key.
     * Useful for testing or manual override.
     */
    reset(key: string): void {
        this.windows.delete(key);
    }

    /**
     * Clears all rate limit state.
     */
    resetAll(): void {
        this.windows.clear();
    }

    /**
     * Shuts down the cleanup timer.
     */
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.windows.clear();
    }

    /** Current number of tracked keys. */
    get size(): number {
        return this.windows.size;
    }

    // -----------------------------------------------------------------------
    // Private
    // -----------------------------------------------------------------------

    /**
     * Periodically cleans up expired windows to prevent memory leaks.
     */
    private startCleanup(): void {
        this.cleanupTimer = setInterval(() => {
            const now = Date.now();
            for (const [key, state] of this.windows) {
                if (now - state.windowStart >= this.config.windowMs * 2) {
                    this.windows.delete(key);
                }
            }
        }, this.config.windowMs);

        // Don't block Node.js shutdown
        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }
}

// ---------------------------------------------------------------------------
// Singleton instance for the application
// ---------------------------------------------------------------------------

/**
 * Global rate limiter: 20 reports per tenant per minute.
 */
export const rateLimiter = new RateLimiter();
