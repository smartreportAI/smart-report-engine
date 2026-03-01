import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateInputHash } from '../audit/audit.utils';

/**
 * Deterministic report cache.
 *
 * Uses SHA-256 fingerprints of the mapped input + tenantId to detect
 * duplicate report generation requests. Identical inputs always produce
 * the same fingerprint, enabling safe cache lookups.
 *
 * Storage layout:
 *   cache/reports/<fingerprint>.json  — metadata + HTML
 *   cache/reports/<fingerprint>.pdf   — PDF buffer (optional)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedReportEntry {
    fingerprint: string;
    tenantId: string;
    html: string;
    overallScore: number;
    overallSeverity: string;
    renderedPages: string[];
    skippedPages: string[];
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_CACHE_DIR = resolve(process.cwd(), 'cache', 'reports');

// ---------------------------------------------------------------------------
// Fingerprint generation
// ---------------------------------------------------------------------------

/**
 * Generates a deterministic fingerprint from the mapped report input
 * and tenant ID.
 *
 * Same mapped data + same tenant = same fingerprint (always).
 * Different tenant = different fingerprint (even with same data,
 * because different branding produces different HTML).
 */
export function generateReportFingerprint(
    mappedInput: unknown,
    tenantId: string,
): string {
    return generateInputHash({ data: mappedInput, tenant: tenantId });
}

// ---------------------------------------------------------------------------
// Cache operations
// ---------------------------------------------------------------------------

/**
 * Retrieves a cached report by fingerprint.
 * Returns null if not cached or unreadable.
 */
export function getCachedReport(
    fingerprint: string,
    cacheDir: string = DEFAULT_CACHE_DIR,
): CachedReportEntry | null {
    if (process.env.DISABLE_CACHE === 'true') return null;

    const jsonPath = resolve(cacheDir, `${fingerprint}.json`);

    if (!existsSync(jsonPath)) return null;

    try {
        const content = readFileSync(jsonPath, 'utf-8');
        return JSON.parse(content) as CachedReportEntry;
    } catch {
        return null;
    }
}

/**
 * Retrieves a cached PDF buffer by fingerprint.
 * Returns null if not cached.
 */
export function getCachedPdf(
    fingerprint: string,
    cacheDir: string = DEFAULT_CACHE_DIR,
): Buffer | null {
    if (process.env.DISABLE_CACHE === 'true') return null;

    const pdfPath = resolve(cacheDir, `${fingerprint}.pdf`);

    if (!existsSync(pdfPath)) return null;

    try {
        return readFileSync(pdfPath);
    } catch {
        return null;
    }
}

/**
 * Stores a report in the cache.
 *
 * @param fingerprint - SHA-256 fingerprint of the mapped input.
 * @param metadata    - Report output metadata (without fingerprint/createdAt).
 * @param pdfBuffer   - Optional PDF buffer to cache alongside.
 * @param cacheDir    - Override cache directory (for testing).
 */
export function storeCachedReport(
    fingerprint: string,
    metadata: Omit<CachedReportEntry, 'fingerprint' | 'createdAt'>,
    pdfBuffer?: Buffer,
    cacheDir: string = DEFAULT_CACHE_DIR,
): void {
    if (process.env.DISABLE_CACHE === 'true') return;

    mkdirSync(cacheDir, { recursive: true });

    const record: CachedReportEntry = {
        fingerprint,
        ...metadata,
        createdAt: new Date().toISOString(),
    };

    const jsonPath = resolve(cacheDir, `${fingerprint}.json`);
    writeFileSync(jsonPath, JSON.stringify(record, null, 2), 'utf-8');

    if (pdfBuffer) {
        const pdfPath = resolve(cacheDir, `${fingerprint}.pdf`);
        writeFileSync(pdfPath, pdfBuffer);
    }
}

/**
 * Stores only a PDF buffer in the cache (for late PDF generation
 * from a previously cached HTML report).
 */
export function storeCachedPdf(
    fingerprint: string,
    pdfBuffer: Buffer,
    cacheDir: string = DEFAULT_CACHE_DIR,
): void {
    if (process.env.DISABLE_CACHE === 'true') return;

    mkdirSync(cacheDir, { recursive: true });
    const pdfPath = resolve(cacheDir, `${fingerprint}.pdf`);
    writeFileSync(pdfPath, pdfBuffer);
}
