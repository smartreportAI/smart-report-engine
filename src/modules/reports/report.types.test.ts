import { describe, it, expect } from 'vitest';
import { GenerateReportBodySchema } from './report.types';

describe('GenerateReportBodySchema — null and string reference ranges', () => {
    const base = {
        tenantId: 'demo',
        output: 'html' as const,
        reportData: {
            patientId: 'P1',
            age: 30,
            gender: 'male' as const,
            profiles: [{
                profileName: 'Panel',
                parameters: [{ testName: 'Test', value: 10, unit: 'mg/dL' }],
            }],
        },
    };

    it('accepts referenceRange: null', () => {
        const result = GenerateReportBodySchema.safeParse({
            ...base,
            reportData: {
                ...base.reportData,
                profiles: [{
                    profileName: 'Panel',
                    parameters: [{
                        testName: 'CRP',
                        value: 2,
                        unit: 'mg/L',
                        referenceRange: null,
                    }],
                }],
            },
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.reportData.profiles[0].parameters[0].referenceRange).toBeUndefined();
        }
    });

    it('accepts referenceRange with string min/max and coerces to number', () => {
        const result = GenerateReportBodySchema.safeParse({
            ...base,
            reportData: {
                ...base.reportData,
                profiles: [{
                    profileName: 'Panel',
                    parameters: [{
                        testName: 'Glucose',
                        value: 95,
                        unit: 'mg/dL',
                        referenceRange: { min: '70', max: '100' },
                    }],
                }],
            },
        });
        expect(result.success).toBe(true);
        if (result.success) {
            const range = result.data.reportData.profiles[0].parameters[0].referenceRange;
            expect(range).toEqual({ min: 70, max: 100, text: undefined });
        }
    });

    it('accepts referenceRange with null min (only max)', () => {
        const result = GenerateReportBodySchema.safeParse({
            ...base,
            reportData: {
                ...base.reportData,
                profiles: [{
                    profileName: 'Panel',
                    parameters: [{
                        testName: 'CRP',
                        value: 1.5,
                        unit: 'mg/L',
                        referenceRange: { min: null, max: 5 },
                    }],
                }],
            },
        });
        expect(result.success).toBe(true);
        if (result.success) {
            const range = result.data.reportData.profiles[0].parameters[0].referenceRange;
            expect(range).toEqual({ min: undefined, max: 5, text: undefined });
        }
    });

    it('accepts non-numeric string min/max and coerces to undefined', () => {
        const result = GenerateReportBodySchema.safeParse({
            ...base,
            reportData: {
                ...base.reportData,
                profiles: [{
                    profileName: 'Panel',
                    parameters: [{
                        testName: 'Qual',
                        value: 1,
                        unit: 'U/mL',
                        referenceRange: { min: 'N/A', max: 'See comment' },
                    }],
                }],
            },
        });
        expect(result.success).toBe(true);
        if (result.success) {
            const range = result.data.reportData.profiles[0].parameters[0].referenceRange;
            expect(range).toBeUndefined();
        }
    });
});
