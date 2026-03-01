import { describe, it, expect } from 'vitest';
import { mapRawReportInput } from '../mapping/mapping.service';
import { buildMappingIndex, findMappingEntry } from '../mapping/mapping.utils';
import type { TenantConfig } from '../../modules/tenants/tenant.types';
import type { RawReportInput } from '../../domain/types/input.types';
import type { MappingEntry } from '../mapping/mapping.types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTenant(overrides?: Partial<TenantConfig>): TenantConfig {
    return {
        tenantId: 'test-tenant',
        reportType: 'essential',
        pageOrder: ['master-overview'],
        branding: {
            labName: 'Test Lab',
            logoUrl: 'https://cdn.example.com/logo.png',
            primaryColor: '#1A73E8',
        },
        ...overrides,
    };
}

function makeRawReport(overrides?: Partial<RawReportInput>): RawReportInput {
    return {
        patientId: 'PAT-001',
        age: 35,
        gender: 'male',
        profiles: [
            {
                profileName: 'Lab Panel',
                parameters: [
                    {
                        testName: 'HGB',
                        value: 14.0,
                        unit: 'g/dL',
                        referenceRange: { min: 13.5, max: 17.5 },
                    },
                    {
                        testName: 'WBC',
                        value: 9800,
                        unit: 'cells/uL',
                        referenceRange: { min: 4500, max: 11000 },
                    },
                    {
                        testName: 'PLT',
                        value: 250000,
                        unit: '/uL',
                        referenceRange: { min: 150000, max: 400000 },
                    },
                ],
            },
        ],
        ...overrides,
    };
}

const SAMPLE_MAPPINGS: MappingEntry[] = [
    {
        externalCode: 'HGB',
        externalDisplay: 'Hemoglobin',
        internalParameterId: 'hemoglobin',
        internalProfileName: 'Complete Blood Count',
    },
    {
        externalCode: 'WBC',
        externalDisplay: 'WBC Count',
        internalParameterId: 'wbc-count',
        internalProfileName: 'Complete Blood Count',
    },
    {
        externalCode: 'PLT',
        internalParameterId: 'platelet-count',
        internalProfileName: 'Complete Blood Count',
        unitOverride: 'x10^3/uL',
    },
    {
        externalCode: 'TSH',
        internalParameterId: 'tsh',
        internalProfileName: 'Thyroid Panel',
        rangeOverride: { min: 0.4, max: 4.0 },
    },
];

// ---------------------------------------------------------------------------
// buildMappingIndex + findMappingEntry
// ---------------------------------------------------------------------------

describe('mapping utils', () => {
    it('builds an index keyed by lowercase externalCode', () => {
        const index = buildMappingIndex(SAMPLE_MAPPINGS);
        expect(index.byCode.has('hgb')).toBe(true);
        expect(index.byCode.has('wbc')).toBe(true);
        expect(index.byCode.has('plt')).toBe(true);
        expect(index.byCode.has('tsh')).toBe(true);
    });

    it('builds an index keyed by lowercase externalDisplay', () => {
        const index = buildMappingIndex(SAMPLE_MAPPINGS);
        expect(index.byDisplay.has('hemoglobin')).toBe(true);
        expect(index.byDisplay.has('wbc count')).toBe(true);
        // PLT has no externalDisplay
        expect(index.byDisplay.has('platelet-count')).toBe(false);
    });

    it('findMappingEntry matches by externalCode (case-insensitive)', () => {
        const index = buildMappingIndex(SAMPLE_MAPPINGS);
        const entry = findMappingEntry('HGB', index);
        expect(entry?.internalParameterId).toBe('hemoglobin');
    });

    it('findMappingEntry matches by externalDisplay when code misses', () => {
        const index = buildMappingIndex(SAMPLE_MAPPINGS);
        // "Hemoglobin" is the display name, not the code
        const entry = findMappingEntry('Hemoglobin', index);
        expect(entry?.internalParameterId).toBe('hemoglobin');
    });

    it('findMappingEntry prefers code over display', () => {
        const entries: MappingEntry[] = [
            {
                externalCode: 'HGB',
                internalParameterId: 'from-code',
                internalProfileName: 'Panel A',
            },
            {
                externalCode: 'OTHER',
                externalDisplay: 'HGB',
                internalParameterId: 'from-display',
                internalProfileName: 'Panel B',
            },
        ];
        const index = buildMappingIndex(entries);
        const entry = findMappingEntry('HGB', index);
        // byCode match takes priority
        expect(entry?.internalParameterId).toBe('from-code');
    });

    it('findMappingEntry returns undefined for unknown test', () => {
        const index = buildMappingIndex(SAMPLE_MAPPINGS);
        expect(findMappingEntry('UNKNOWN_TEST', index)).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// mapRawReportInput — no mapping config
// ---------------------------------------------------------------------------

describe('mapRawReportInput — no mapping', () => {
    it('passes through unchanged when tenant has no mapping', () => {
        const tenant = makeTenant();
        const raw = makeRawReport();
        const result = mapRawReportInput(raw, tenant);

        expect(result.report).toStrictEqual(raw);
        expect(result.unmappedParameters).toHaveLength(0);
    });

    it('passes through unchanged when mapping.parameters is empty', () => {
        const tenant = makeTenant({ mapping: { parameters: [] } });
        const raw = makeRawReport();
        const result = mapRawReportInput(raw, tenant);

        expect(result.report).toStrictEqual(raw);
        expect(result.unmappedParameters).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// mapRawReportInput — code matching
// ---------------------------------------------------------------------------

describe('mapRawReportInput — code matching', () => {
    it('renames testName to internalParameterId on code match', () => {
        const tenant = makeTenant({ mapping: { parameters: SAMPLE_MAPPINGS } });
        const raw = makeRawReport();
        const result = mapRawReportInput(raw, tenant);

        const params = result.report.profiles.flatMap((p) => p.parameters);
        const hemoglobin = params.find((p) => p.testName === 'hemoglobin');
        expect(hemoglobin).toBeDefined();
        expect(hemoglobin!.value).toBe(14.0);
    });

    it('groups parameters under internalProfileName', () => {
        const tenant = makeTenant({ mapping: { parameters: SAMPLE_MAPPINGS } });
        const raw = makeRawReport();
        const result = mapRawReportInput(raw, tenant);

        const cbcProfile = result.report.profiles.find(
            (p) => p.profileName === 'Complete Blood Count',
        );
        expect(cbcProfile).toBeDefined();
        expect(cbcProfile!.parameters).toHaveLength(3);
    });
});

// ---------------------------------------------------------------------------
// mapRawReportInput — display matching
// ---------------------------------------------------------------------------

describe('mapRawReportInput — display matching', () => {
    it('matches by externalDisplay when code does not match', () => {
        const mapping: MappingEntry[] = [
            {
                externalCode: 'LOINC-718-7',
                externalDisplay: 'Hemoglobin',
                internalParameterId: 'hemoglobin',
                internalProfileName: 'CBC',
            },
        ];
        const tenant = makeTenant({ mapping: { parameters: mapping } });
        const raw = makeRawReport({
            profiles: [
                {
                    profileName: 'Lab',
                    parameters: [
                        { testName: 'Hemoglobin', value: 14.0, unit: 'g/dL' },
                    ],
                },
            ],
        });
        const result = mapRawReportInput(raw, tenant);

        expect(result.report.profiles[0].profileName).toBe('CBC');
        expect(result.report.profiles[0].parameters[0].testName).toBe('hemoglobin');
    });
});

// ---------------------------------------------------------------------------
// mapRawReportInput — overrides
// ---------------------------------------------------------------------------

describe('mapRawReportInput — overrides', () => {
    it('applies unitOverride when provided', () => {
        const tenant = makeTenant({ mapping: { parameters: SAMPLE_MAPPINGS } });
        const raw = makeRawReport();
        const result = mapRawReportInput(raw, tenant);

        const platelet = result.report.profiles
            .flatMap((p) => p.parameters)
            .find((p) => p.testName === 'platelet-count');
        expect(platelet?.unit).toBe('x10^3/uL');
    });

    it('preserves original unit when no unitOverride', () => {
        const tenant = makeTenant({ mapping: { parameters: SAMPLE_MAPPINGS } });
        const raw = makeRawReport();
        const result = mapRawReportInput(raw, tenant);

        const hemoglobin = result.report.profiles
            .flatMap((p) => p.parameters)
            .find((p) => p.testName === 'hemoglobin');
        expect(hemoglobin?.unit).toBe('g/dL');
    });

    it('applies rangeOverride when provided', () => {
        const tenant = makeTenant({ mapping: { parameters: SAMPLE_MAPPINGS } });
        const raw = makeRawReport({
            profiles: [
                {
                    profileName: 'Labs',
                    parameters: [
                        {
                            testName: 'TSH',
                            value: 2.5,
                            unit: 'mIU/L',
                            referenceRange: { min: 0.3, max: 5.0 },
                        },
                    ],
                },
            ],
        });
        const result = mapRawReportInput(raw, tenant);

        const tsh = result.report.profiles
            .flatMap((p) => p.parameters)
            .find((p) => p.testName === 'tsh');
        expect(tsh?.referenceRange).toEqual({ min: 0.4, max: 4.0 });
    });

    it('preserves original range when no rangeOverride', () => {
        const tenant = makeTenant({ mapping: { parameters: SAMPLE_MAPPINGS } });
        const raw = makeRawReport();
        const result = mapRawReportInput(raw, tenant);

        const hemoglobin = result.report.profiles
            .flatMap((p) => p.parameters)
            .find((p) => p.testName === 'hemoglobin');
        expect(hemoglobin?.referenceRange).toEqual({ min: 13.5, max: 17.5 });
    });
});

// ---------------------------------------------------------------------------
// mapRawReportInput — profile reassignment
// ---------------------------------------------------------------------------

describe('mapRawReportInput — profile reassignment', () => {
    it('moves parameters from original profile to mapped profile', () => {
        const mapping: MappingEntry[] = [
            {
                externalCode: 'A',
                internalParameterId: 'test-a',
                internalProfileName: 'Profile X',
            },
            {
                externalCode: 'B',
                internalParameterId: 'test-b',
                internalProfileName: 'Profile Y',
            },
        ];
        const tenant = makeTenant({ mapping: { parameters: mapping } });
        const raw: RawReportInput = {
            patientId: 'P1',
            age: 30,
            gender: 'male',
            profiles: [
                {
                    profileName: 'Original',
                    parameters: [
                        { testName: 'A', value: 10 },
                        { testName: 'B', value: 20 },
                    ],
                },
            ],
        };

        const result = mapRawReportInput(raw, tenant);

        expect(result.report.profiles).toHaveLength(2);
        const profileX = result.report.profiles.find((p) => p.profileName === 'Profile X');
        const profileY = result.report.profiles.find((p) => p.profileName === 'Profile Y');
        expect(profileX?.parameters).toHaveLength(1);
        expect(profileY?.parameters).toHaveLength(1);
        expect(profileX?.parameters[0].testName).toBe('test-a');
        expect(profileY?.parameters[0].testName).toBe('test-b');
    });

    it('merges parameters into existing profile when names match', () => {
        const mapping: MappingEntry[] = [
            {
                externalCode: 'A',
                internalParameterId: 'test-a',
                internalProfileName: 'Merged Panel',
            },
            {
                externalCode: 'B',
                internalParameterId: 'test-b',
                internalProfileName: 'Merged Panel',
            },
        ];
        const tenant = makeTenant({ mapping: { parameters: mapping } });
        const raw: RawReportInput = {
            patientId: 'P1',
            age: 30,
            gender: 'female',
            profiles: [
                { profileName: 'Panel 1', parameters: [{ testName: 'A', value: 10 }] },
                { profileName: 'Panel 2', parameters: [{ testName: 'B', value: 20 }] },
            ],
        };

        const result = mapRawReportInput(raw, tenant);

        expect(result.report.profiles).toHaveLength(1);
        expect(result.report.profiles[0].profileName).toBe('Merged Panel');
        expect(result.report.profiles[0].parameters).toHaveLength(2);
    });
});

// ---------------------------------------------------------------------------
// mapRawReportInput — partial mapping (unmapped allowed)
// ---------------------------------------------------------------------------

describe('mapRawReportInput — partial mapping', () => {
    it('keeps unmapped parameters in their original profile', () => {
        const mapping: MappingEntry[] = [
            {
                externalCode: 'HGB',
                internalParameterId: 'hemoglobin',
                internalProfileName: 'CBC',
            },
        ];
        const tenant = makeTenant({ mapping: { parameters: mapping } });
        const raw = makeRawReport();
        const result = mapRawReportInput(raw, tenant);

        // HGB is mapped to CBC; WBC and PLT are unmapped → stay in "Lab Panel"
        expect(result.unmappedParameters).toEqual(['WBC', 'PLT']);

        const cbcProfile = result.report.profiles.find((p) => p.profileName === 'CBC');
        const labProfile = result.report.profiles.find((p) => p.profileName === 'Lab Panel');
        expect(cbcProfile?.parameters).toHaveLength(1);
        expect(labProfile?.parameters).toHaveLength(2);
    });

    it('preserves patient data unchanged', () => {
        const tenant = makeTenant({ mapping: { parameters: SAMPLE_MAPPINGS } });
        const raw = makeRawReport();
        const result = mapRawReportInput(raw, tenant);

        expect(result.report.patientId).toBe('PAT-001');
        expect(result.report.age).toBe(35);
        expect(result.report.gender).toBe('male');
    });
});

// ---------------------------------------------------------------------------
// mapRawReportInput — strict mode
// ---------------------------------------------------------------------------

describe('mapRawReportInput — strict mode', () => {
    it('throws when unmapped parameters exist in strict mode', () => {
        const mapping: MappingEntry[] = [
            {
                externalCode: 'HGB',
                internalParameterId: 'hemoglobin',
                internalProfileName: 'CBC',
            },
        ];
        const tenant = makeTenant({
            mapping: { parameters: mapping },
            strictMapping: true,
        });
        const raw = makeRawReport();

        // WBC and PLT have no mapping → strict mode should throw
        expect(() => mapRawReportInput(raw, tenant)).toThrow(/WBC/);
    });

    it('does not throw when all parameters are mapped in strict mode', () => {
        const tenant = makeTenant({
            mapping: { parameters: SAMPLE_MAPPINGS },
            strictMapping: true,
        });
        const raw = makeRawReport();

        // All 3 parameters (HGB, WBC, PLT) have mappings
        expect(() => mapRawReportInput(raw, tenant)).not.toThrow();

        const result = mapRawReportInput(raw, tenant);
        expect(result.unmappedParameters).toHaveLength(0);
    });

    it('does not throw in non-strict mode even with unmapped params', () => {
        const mapping: MappingEntry[] = [
            {
                externalCode: 'HGB',
                internalParameterId: 'hemoglobin',
                internalProfileName: 'CBC',
            },
        ];
        const tenant = makeTenant({
            mapping: { parameters: mapping },
            strictMapping: false,
        });
        const raw = makeRawReport();

        expect(() => mapRawReportInput(raw, tenant)).not.toThrow();

        const result = mapRawReportInput(raw, tenant);
        expect(result.unmappedParameters).toEqual(['WBC', 'PLT']);
    });
});
