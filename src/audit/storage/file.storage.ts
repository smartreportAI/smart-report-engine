import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { AuditRecord } from '../audit.types';

/**
 * Default directory for audit record storage.
 * Relative to process.cwd() — typically the project root.
 */
const DEFAULT_AUDIT_DIR = resolve(process.cwd(), 'audit', 'reports');

/**
 * Persists an AuditRecord as a JSON file on disk.
 *
 * File path: `<baseDir>/<reportId>.json`
 *
 * The directory is created recursively if it does not exist.
 *
 * @param record  - The audit record to persist.
 * @param baseDir - Directory to write into. Defaults to `./audit/reports/`.
 * @returns Absolute path to the written file.
 */
export function saveAuditRecord(
    record: AuditRecord,
    baseDir: string = DEFAULT_AUDIT_DIR,
): string {
    const filePath = resolve(baseDir, `${record.reportId}.json`);

    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');

    return filePath;
}
