import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateInputHash, generateReportId } from '../audit.utils';
import { createAuditRecord, recordAudit } from '../audit.service';
import type { NormalizedReport } from '../../domain/models/report.model';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TEST_AUDIT_DIR = resolve(process.cwd(), 'tmp', 'test-audit');

function makeNormalizedReport(): NormalizedReport {
    return {
        patientId: 'PAT-TEST',
        age: 35,
        gender: 'male',
        profiles: [
            {
                id: 'cbc',
                name: 'Complete Blood Count',
                parameters: [
                    {
                        id: 'hemoglobin',
                        name: 'Hemoglobin',
                        value: 14.0,
                        unit: 'g/dL',
                        range: { min: 13.5, max: 17.5 },
                        status: 'normal',
                        signalScore: 100,
                    },
                    {
                        id: 'wbc',
                        name: 'WBC Count',
                        value: 9800,
                        unit: 'cells/uL',
                        range: { min: 4500, max: 11000 },
                        status: 'normal',
                        signalScore: 100,
                    },
                ],
                abnormalCount: 0,
                normalCount: 2,
                profileScore: 100,
                severity: 'healthy',
            },
        ],
        overallScore: 100,
        overallSeverity: 'stable',
    };
}

// Cleanup test audit directory after each test
afterEach(() => {
    try {
        rmSync(TEST_AUDIT_DIR, { recursive: true, force: true });
    } catch {
        // Ignore cleanup errors
    }
});

// ---------------------------------------------------------------------------
// generateInputHash
// ---------------------------------------------------------------------------

describe('generateInputHash', () => {
    it('produces a 64-character hex string', () => {
        const hash = generateInputHash({ foo: 'bar' });
        expect(hash).toHaveLength(64);
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic — same input produces same hash', () => {
        const input = { tenantId: 'test', data: [1, 2, 3] };
        const hash1 = generateInputHash(input);
        const hash2 = generateInputHash(input);
        expect(hash1).toBe(hash2);
    });

    it('is deterministic — key order does not matter', () => {
        const hash1 = generateInputHash({ a: 1, b: 2, c: 3 });
        const hash2 = generateInputHash({ c: 3, a: 1, b: 2 });
        expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different inputs', () => {
        const hash1 = generateInputHash({ value: 1 });
        const hash2 = generateInputHash({ value: 2 });
        expect(hash1).not.toBe(hash2);
    });

    it('handles nested objects with sorted keys', () => {
        const hash1 = generateInputHash({ outer: { b: 2, a: 1 } });
        const hash2 = generateInputHash({ outer: { a: 1, b: 2 } });
        expect(hash1).toBe(hash2);
    });

    it('handles null and undefined values', () => {
        const hash1 = generateInputHash(null);
        const hash2 = generateInputHash(null);
        expect(hash1).toBe(hash2);
    });

    it('handles arrays (preserves order)', () => {
        const hash1 = generateInputHash([1, 2, 3]);
        const hash2 = generateInputHash([3, 2, 1]);
        expect(hash1).not.toBe(hash2);
    });
});

// ---------------------------------------------------------------------------
// generateReportId
// ---------------------------------------------------------------------------

describe('generateReportId', () => {
    it('produces a valid UUID v4', () => {
        const id = generateReportId();
        expect(id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
    });

    it('produces unique IDs on each call', () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateReportId()));
        expect(ids.size).toBe(100);
    });
});

// ---------------------------------------------------------------------------
// createAuditRecord
// ---------------------------------------------------------------------------

describe('createAuditRecord', () => {
    it('creates a complete audit record with all fields', () => {
        const normalized = makeNormalizedReport();
        const record = createAuditRecord({
            tenantId: 'tenant-test',
            rawInput: { data: 'test' },
            mappingWarnings: ['unmapped-param'],
            normalized,
            source: 'json',
        });

        expect(record.reportId).toBeDefined();
        expect(record.tenantId).toBe('tenant-test');
        expect(record.inputHash).toHaveLength(64);
        expect(record.engineMetadata.engineVersion).toBe('1.0.0');
        expect(record.engineMetadata.nodeVersion).toMatch(/^v\d+/);
        expect(record.mappingWarnings).toEqual(['unmapped-param']);
        expect(record.normalizedSummary.overallScore).toBe(100);
        expect(record.normalizedSummary.overallSeverity).toBe('stable');
        expect(record.normalizedSummary.profileCount).toBe(1);
        expect(record.normalizedSummary.parameterCount).toBe(2);
        expect(record.source).toBe('json');
        expect(record.timestamp).toBeDefined();
    });

    it('stores the correct source format', () => {
        const normalized = makeNormalizedReport();

        for (const source of ['json', 'fhir', 'hl7', 'cli'] as const) {
            const record = createAuditRecord({
                tenantId: 'test',
                rawInput: {},
                mappingWarnings: [],
                normalized,
                source,
            });
            expect(record.source).toBe(source);
        }
    });

    it('generates unique reportIds for each call', () => {
        const normalized = makeNormalizedReport();
        const params = {
            tenantId: 'test',
            rawInput: {},
            mappingWarnings: [],
            normalized,
            source: 'json' as const,
        };

        const id1 = createAuditRecord(params).reportId;
        const id2 = createAuditRecord(params).reportId;
        expect(id1).not.toBe(id2);
    });

    it('stores empty mapping warnings when none present', () => {
        const normalized = makeNormalizedReport();
        const record = createAuditRecord({
            tenantId: 'test',
            rawInput: {},
            mappingWarnings: [],
            normalized,
            source: 'fhir',
        });
        expect(record.mappingWarnings).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// recordAudit — file persistence
// ---------------------------------------------------------------------------

describe('recordAudit — file persistence', () => {
    it('writes audit record to disk as JSON', () => {
        const normalized = makeNormalizedReport();
        const record = createAuditRecord({
            tenantId: 'tenant-test',
            rawInput: { sample: true },
            mappingWarnings: [],
            normalized,
            source: 'json',
        });

        const filePath = recordAudit(record, TEST_AUDIT_DIR);

        expect(existsSync(filePath)).toBe(true);
        expect(filePath).toContain(record.reportId);
        expect(filePath).toMatch(/\.json$/);
    });

    it('persists all audit fields correctly', () => {
        const normalized = makeNormalizedReport();
        const record = createAuditRecord({
            tenantId: 'tenant-persist',
            rawInput: { test: 'data' },
            mappingWarnings: ['warning-1', 'warning-2'],
            normalized,
            source: 'hl7',
        });

        const filePath = recordAudit(record, TEST_AUDIT_DIR);
        const fileContent = readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);

        expect(parsed.reportId).toBe(record.reportId);
        expect(parsed.tenantId).toBe('tenant-persist');
        expect(parsed.inputHash).toBe(record.inputHash);
        expect(parsed.engineMetadata.engineVersion).toBe('1.0.0');
        expect(parsed.mappingWarnings).toEqual(['warning-1', 'warning-2']);
        expect(parsed.normalizedSummary.overallScore).toBe(100);
        expect(parsed.source).toBe('hl7');
        expect(parsed.timestamp).toBeDefined();
    });

    it('creates directory if it does not exist', () => {
        const nestedDir = resolve(TEST_AUDIT_DIR, 'nested', 'deep');
        const normalized = makeNormalizedReport();
        const record = createAuditRecord({
            tenantId: 'test',
            rawInput: {},
            mappingWarnings: [],
            normalized,
            source: 'cli',
        });

        const filePath = recordAudit(record, nestedDir);
        expect(existsSync(filePath)).toBe(true);

        // Cleanup nested dir
        rmSync(nestedDir, { recursive: true, force: true });
    });
});
