import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateInputHash } from '../audit/audit.utils';
import type { PatientStripInfo } from '../rendering/html-layout';

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
    coverHtml?: string | null;
    contentHtml?: string;
    backHtml?: string | null;
    overallScore: number;
    overallSeverity: string;
    renderedPages: string[];
    skippedPages: string[];
    createdAt: string;
    patient?: PatientStripInfo;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_CACHE_DIR = resolve(process.cwd(), 'cache', 'reports');

/** Cache TTL: default 1 day, overridable with CACHE_TTL_DAYS env var. */
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_DAYS ?? '1', 10) * 24 * 60 * 60 * 1000;

/**
 * Cache version stamp — pulled from env var CACHE_VERSION.
 * Change this value in Railway Variables to immediately invalidate all
 * existing cached reports (they'll regenerate fresh on next request).
 * Example: set CACHE_VERSION=2 in Railway → all old cache is bypassed.
 */
const CACHE_VERSION = process.env.CACHE_VERSION ?? '1';

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
    // Include CACHE_VERSION so changing it in Railway env vars
    // instantly invalidates all stale cached reports.
    return generateInputHash({ data: mappedInput, tenant: tenantId, v: CACHE_VERSION });
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
        const entry = JSON.parse(content) as CachedReportEntry;

        // Expire entries older than CACHE_TTL_MS
        if (Date.now() - new Date(entry.createdAt).getTime() > CACHE_TTL_MS) {
            return null;
        }

        return entry;
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
