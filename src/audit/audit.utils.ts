import { createHash, randomUUID } from 'node:crypto';

/**
 * Generates a deterministic SHA-256 hash from an arbitrary payload.
 *
 * Object keys are sorted recursively to ensure identical logical
 * inputs always produce the same hash regardless of key insertion order.
 *
 * @param payload - Any JSON-serializable value (raw input, tenant config, etc.).
 * @returns Hex-encoded SHA-256 hash string (64 characters).
 */
export function generateInputHash(payload: unknown): string {
    const canonical = canonicalize(payload);
    return createHash('sha256').update(canonical, 'utf-8').digest('hex');
}

/**
 * Generates a new UUID v4 report identifier.
 */
export function generateReportId(): string {
    return randomUUID();
}

// ---------------------------------------------------------------------------
// Internal: canonical JSON serialization
// ---------------------------------------------------------------------------

/**
 * Produces a canonical JSON string with sorted object keys (recursive).
 * This ensures deterministic hashing regardless of property order.
 */
function canonicalize(value: unknown): string {
    if (value === null || value === undefined) {
        return JSON.stringify(value);
    }

    if (typeof value !== 'object') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        const items = value.map(canonicalize);
        return '[' + items.join(',') + ']';
    }

    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys.map(
        (key) => JSON.stringify(key) + ':' + canonicalize(obj[key]),
    );
    return '{' + pairs.join(',') + '}';
}
