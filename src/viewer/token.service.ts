import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ViewerTokenRecord, ViewerPayload } from './viewer.types';

const VIEWER_DIR    = join(process.cwd(), 'viewer');
const TOKENS_DIR    = join(VIEWER_DIR, 'tokens');
const DATA_DIR      = join(VIEWER_DIR, 'data');

function ensureDirs(): void {
    if (!existsSync(TOKENS_DIR)) mkdirSync(TOKENS_DIR, { recursive: true });
    if (!existsSync(DATA_DIR))   mkdirSync(DATA_DIR,   { recursive: true });
}

function getTtlMs(): number {
    const days = parseInt(process.env.VIEWER_TOKEN_TTL_DAYS ?? '90', 10);
    return days * 24 * 60 * 60 * 1000;
}

/**
 * Creates a viewer token, persists the token record and viewer payload to disk.
 * Returns the 64-char hex token string.
 */
export function createViewerToken(params: {
    fingerprint: string;
    tenantId: string;
    patientId: string;
    reportDisplayId: string;
    reportDate: string;
    payload: ViewerPayload;
}): string {
    ensureDirs();
    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + getTtlMs());

    const record: ViewerTokenRecord = {
        token,
        fingerprint: params.fingerprint,
        tenantId: params.tenantId,
        patientId: params.patientId,
        reportDisplayId: params.reportDisplayId,
        reportDate: params.reportDate,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
    };

    writeFileSync(join(TOKENS_DIR, `${token}.json`), JSON.stringify(record, null, 2), 'utf8');
    writeFileSync(join(DATA_DIR, `${token}.json`),   JSON.stringify(params.payload, null, 2), 'utf8');

    return token;
}

/**
 * Looks up a viewer token. Returns { record, payload } if valid and not expired.
 * Returns null for invalid, missing, or expired tokens (and lazily deletes expired files).
 */
export function lookupViewerToken(token: string): {
    record: ViewerTokenRecord;
    payload: ViewerPayload;
} | null {
    // Only accept well-formed 64-char hex tokens
    if (!/^[0-9a-f]{64}$/.test(token)) return null;

    const tokenPath = join(TOKENS_DIR, `${token}.json`);
    const dataPath  = join(DATA_DIR,   `${token}.json`);

    if (!existsSync(tokenPath) || !existsSync(dataPath)) return null;

    try {
        const record = JSON.parse(readFileSync(tokenPath, 'utf8')) as ViewerTokenRecord;

        // Lazy expiry: clean up and return null
        if (Date.now() > new Date(record.expiresAt).getTime()) {
            try { unlinkSync(tokenPath); } catch { /* ignore */ }
            try { unlinkSync(dataPath); }  catch { /* ignore */ }
            return null;
        }

        const payload = JSON.parse(readFileSync(dataPath, 'utf8')) as ViewerPayload;
        return { record, payload };
    } catch {
        return null;
    }
}

/**
 * Scans viewer/tokens/ and deletes all expired token + data file pairs.
 * Safe to call at startup or on a periodic interval.
 */
export function deleteExpiredTokens(): void {
    ensureDirs();
    try {
        const files = readdirSync(TOKENS_DIR).filter(f => f.endsWith('.json'));
        for (const file of files) {
            const tokenPath = join(TOKENS_DIR, file);
            try {
                const record = JSON.parse(readFileSync(tokenPath, 'utf8')) as ViewerTokenRecord;
                if (Date.now() > new Date(record.expiresAt).getTime()) {
                    unlinkSync(tokenPath);
                    const dataPath = join(DATA_DIR, file);
                    if (existsSync(dataPath)) unlinkSync(dataPath);
                }
            } catch { /* skip corrupted files */ }
        }
    } catch { /* viewer dir may not exist yet */ }
}
