import { describe, it, expect } from 'vitest';
import { adaptFhirBundleToRawReport, calculateAge } from '../fhir/fhir.adapter';
import type { FHIRBundle } from '../fhir/fhir.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMinimalBundle(overrides?: Partial<FHIRBundle>): FHIRBundle {
    return {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
            {
                resource: {
                    resourceType: 'Patient',
                    id: 'patient-1',
                    gender: 'male',
                    birthDate: '1990-01-15',
                },
            },
            {
                resource: {
                    resourceType: 'Observation',
                    id: 'obs-1',
                    status: 'final',
                    code: {
                        coding: [
                            { system: 'http://loinc.org', code: '718-7', display: 'Hemoglobin' },
                        ],
                    },
                    valueQuantity: { value: 14.0, unit: 'g/dL' },
                    referenceRange: [
                        {
                            low: { value: 13.5, unit: 'g/dL' },
                            high: { value: 17.5, unit: 'g/dL' },
                        },
                    ],
                    subject: { reference: 'Patient/patient-1' },
                },
            },
        ],
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// calculateAge
// ---------------------------------------------------------------------------

describe('calculateAge', () => {
    it('calculates correct age from a past date', () => {
        // Use a fixed known date in the past for deterministic testing
        const age = calculateAge('2000-01-01');
        const expectedAge = new Date().getFullYear() - 2000;
        const today = new Date();
        // Account for birthday not yet occurred this year
        const adjustedExpected =
            today.getMonth() < 0 || (today.getMonth() === 0 && today.getDate() < 1)
                ? expectedAge - 1
                : expectedAge;
        expect(age).toBe(adjustedExpected);
    });

    it('returns 0 for an invalid date string', () => {
        expect(calculateAge('not-a-date')).toBe(0);
    });

    it('returns 0 for a future date', () => {
        expect(calculateAge('2099-01-01')).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// adaptFhirBundleToRawReport — valid bundles
// ---------------------------------------------------------------------------

describe('adaptFhirBundleToRawReport', () => {
    it('parses a valid minimal bundle into RawReportInput', () => {
        const bundle = makeMinimalBundle();
        const result = adaptFhirBundleToRawReport(bundle);

        expect(result.patientId).toBe('patient-1');
        expect(result.gender).toBe('male');
        expect(result.age).toBeGreaterThan(0);
        expect(result.profiles).toHaveLength(1);
        expect(result.profiles[0].profileName).toBe('General Panel');
        expect(result.profiles[0].parameters).toHaveLength(1);
        expect(result.profiles[0].parameters[0].testName).toBe('Hemoglobin');
        expect(result.profiles[0].parameters[0].value).toBe(14.0);
        expect(result.profiles[0].parameters[0].unit).toBe('g/dL');
    });

    it('groups observations under DiagnosticReport profile names', () => {
        const bundle: FHIRBundle = {
            resourceType: 'Bundle',
            type: 'collection',
            entry: [
                {
                    resource: {
                        resourceType: 'Patient',
                        id: 'p1',
                        gender: 'female',
                        birthDate: '1985-03-20',
                    },
                },
                {
                    resource: {
                        resourceType: 'Observation',
                        id: 'obs-a',
                        status: 'final',
                        code: { coding: [{ code: 'A', display: 'Test A' }] },
                        valueQuantity: { value: 10, unit: 'mg/dL' },
                        subject: { reference: 'Patient/p1' },
                    },
                },
                {
                    resource: {
                        resourceType: 'Observation',
                        id: 'obs-b',
                        status: 'final',
                        code: { coding: [{ code: 'B', display: 'Test B' }] },
                        valueQuantity: { value: 20, unit: 'mg/dL' },
                        subject: { reference: 'Patient/p1' },
                    },
                },
                {
                    resource: {
                        resourceType: 'DiagnosticReport',
                        id: 'dr-1',
                        code: { coding: [{ code: 'DR1', display: 'My Panel' }], text: 'My Custom Panel' },
                        result: [
                            { reference: 'Observation/obs-a' },
                            { reference: 'Observation/obs-b' },
                        ],
                        subject: { reference: 'Patient/p1' },
                    },
                },
            ],
        };

        const result = adaptFhirBundleToRawReport(bundle);
        expect(result.profiles).toHaveLength(1);
        expect(result.profiles[0].profileName).toBe('My Custom Panel');
        expect(result.profiles[0].parameters).toHaveLength(2);
    });

    it('maps unknown gender to "other"', () => {
        const bundle: FHIRBundle = {
            resourceType: 'Bundle',
            type: 'collection',
            entry: [
                {
                    resource: {
                        resourceType: 'Patient',
                        id: 'p1',
                        gender: 'unknown',
                        birthDate: '1990-01-01',
                    },
                },
                {
                    resource: {
                        resourceType: 'Observation',
                        id: 'obs-1',
                        status: 'final',
                        code: { coding: [{ code: 'X', display: 'Test' }] },
                        valueQuantity: { value: 5 },
                        subject: { reference: 'Patient/p1' },
                    },
                },
            ],
        };

        const result = adaptFhirBundleToRawReport(bundle);
        expect(result.gender).toBe('other');
    });

    it('extracts reference range min and max', () => {
        const bundle = makeMinimalBundle();
        const result = adaptFhirBundleToRawReport(bundle);

        expect(result.profiles[0].parameters[0].referenceRange).toEqual({
            min: 13.5,
            max: 17.5,
            text: undefined,
        });
    });
});

// ---------------------------------------------------------------------------
// adaptFhirBundleToRawReport — invalid bundles
// ---------------------------------------------------------------------------

describe('adaptFhirBundleToRawReport — validation failures', () => {
    it('throws on missing resourceType', () => {
        const invalid = { type: 'collection', entry: [] };
        expect(() => adaptFhirBundleToRawReport(invalid as unknown as FHIRBundle)).toThrow();
    });

    it('throws on empty entry array', () => {
        const invalid: FHIRBundle = {
            resourceType: 'Bundle',
            type: 'collection',
            entry: [],
        };
        expect(() => adaptFhirBundleToRawReport(invalid)).toThrow();
    });

    it('throws when no Patient resource is present', () => {
        const bundle: FHIRBundle = {
            resourceType: 'Bundle',
            type: 'collection',
            entry: [
                {
                    resource: {
                        resourceType: 'Observation',
                        id: 'obs-1',
                        status: 'final',
                        code: { coding: [{ code: 'X', display: 'Test' }] },
                        valueQuantity: { value: 5 },
                        subject: { reference: 'Patient/unknown' },
                    },
                },
            ],
        };
        expect(() => adaptFhirBundleToRawReport(bundle)).toThrow(
            /Patient/,
        );
    });

    it('throws when no Observation resources are present', () => {
        const bundle: FHIRBundle = {
            resourceType: 'Bundle',
            type: 'collection',
            entry: [
                {
                    resource: {
                        resourceType: 'Patient',
                        id: 'p1',
                        gender: 'male',
                        birthDate: '1990-01-01',
                    },
                },
            ],
        };
        expect(() => adaptFhirBundleToRawReport(bundle)).toThrow(
            /Observation/,
        );
    });

    it('throws when Observation is missing valueQuantity', () => {
        const bundle = {
            resourceType: 'Bundle',
            type: 'collection',
            entry: [
                {
                    resource: {
                        resourceType: 'Patient',
                        id: 'p1',
                        gender: 'male',
                        birthDate: '1990-01-01',
                    },
                },
                {
                    resource: {
                        resourceType: 'Observation',
                        id: 'obs-no-value',
                        status: 'final',
                        code: { coding: [{ code: 'X', display: 'Test' }] },
                        // valueQuantity is missing
                        subject: { reference: 'Patient/p1' },
                    },
                },
            ],
        };
        expect(() =>
            adaptFhirBundleToRawReport(bundle as unknown as FHIRBundle),
        ).toThrow();
    });
});
