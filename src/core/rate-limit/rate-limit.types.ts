/**
 * In-memory rate limiter types.
 */

export interface RateLimitConfig {
    /** Maximum number of requests allowed in the window. */
    maxRequests: number;
    /** Window duration in milliseconds. */
    windowMs: number;
}

export interface RateLimitResult {
    /** Whether the request is allowed. */
    allowed: boolean;
    /** Number of requests remaining in the current window. */
    remaining: number;
    /** Timestamp (ms) when the current window resets. */
    resetsAt: number;
}
