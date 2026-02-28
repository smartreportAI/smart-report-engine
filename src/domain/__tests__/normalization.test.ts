import { describe, it, expect } from 'vitest';
import { classifyParameter } from '../../domain/normalization/classification';
import { normalizeReport } from '../../domain/normalization/normalize-report';
import type { RawReportInput } from '../../domain/types/input.types';

/* ---------------------------------------------------------------
   classifyParameter
   --------------------------------------------------------------- */

describe('classifyParameter', () => {
    it('returns normal when value is within range', () => {
        const result = classifyParameter(14.5, 13.5, 17.5);
        expect(result.status).toBe('normal');
        expect(result.signalScore).toBe(100);
    });

    it('returns normal when value equals min bound', () => {
        const result = classifyParameter(13.5, 13.5, 17.5);
        expect(result.status).toBe('normal');
    });

    it('returns normal when value equals max bound', () => {
        const result = classifyParameter(17.5, 13.5, 17.5);
        expect(result.status).toBe('normal');
    });

    it('returns high when value is above max', () => {
        const result = classifyParameter(12000, 4500, 11000);
        expect(result.status).toBe('high');
        expect(result.signalScore).toBeLessThan(100);
        expect(result.signalScore).toBeGreaterThanOrEqual(20);
    });

    it('returns low when value is below min', () => {
        const result = classifyParameter(11.2, 13.5, 17.5);
        expect(result.status).toBe('low');
        expect(result.signalScore).toBeLessThan(100);
    });

    it('returns critical when value deviates more than 50% below min', () => {
        // min=100, 50% deviation → value < 100 - (0.5 * 100) = 50
        const result = classifyParameter(40, 100, 200);
        expect(result.status).toBe('critical');
        expect(result.signalScore).toBe(10);
    });

    it('returns critical when value deviates more than 50% above max', () => {
        // max=200, 50% deviation → value > 200 + (0.5 * 200) = 300
        const result = classifyParameter(350, 100, 200);
        expect(result.status).toBe('critical');
        expect(result.signalScore).toBe(10);
    });

    it('returns normal when no reference range is provided', () => {
        const result = classifyParameter(999, undefined, undefined);
        expect(result.status).toBe('normal');
        expect(result.signalScore).toBe(100);
    });

    it('classifies against only min when max is undefined', () => {
        const result = classifyParameter(3, 10, undefined);
        expect(result.status).toBe('critical'); // deviation = 7/10 = 0.7 > 0.5
    });

    it('classifies against only max when min is undefined', () => {
        const result = classifyParameter(210, undefined, 200);
        expect(result.status).toBe('high');
    });
});

/* ---------------------------------------------------------------
   Severity derivation (via normalizeReport)
   --------------------------------------------------------------- */

describe('severity derivation', () => {
    function makeReport(profiles: { name: string; params: Array<{ val: number; min: number; max: number }> }[]): RawReportInput {
        return {
            patientId: 'TEST',
            age: 30,
            gender: 'male',
            profiles: profiles.map((p) => ({
                profileName: p.name,
                parameters: p.params.map((param, i) => ({
                    testName: `Param ${i + 1}`,
                    value: param.val,
                    unit: 'units',
                    referenceRange: { min: param.min, max: param.max },
                })),
            })),
        };
    }

    it('returns stable severity when all parameters are normal', () => {
        const report = normalizeReport(
            makeReport([{ name: 'CBC', params: [{ val: 15, min: 13, max: 18 }] }]),
        );
        expect(report.overallSeverity).toBe('stable');
        expect(report.overallScore).toBe(100);
    });

    it('returns monitor severity when 15–39% of params are abnormal', () => {
        // 5 params, 1 abnormal = 20% → profile severity = monitor
        const report = normalizeReport(
            makeReport([{
                name: 'Panel',
                params: [
                    { val: 15, min: 13, max: 18 },  // normal
                    { val: 15, min: 13, max: 18 },  // normal
                    { val: 15, min: 13, max: 18 },  // normal
                    { val: 15, min: 13, max: 18 },  // normal
                    { val: 22, min: 13, max: 18 },  // high
                ],
            }]),
        );
        expect(report.overallSeverity).toBe('monitor');
    });

    it('returns critical severity when >= 40% of params are abnormal', () => {
        // 5 params, 2 abnormal = 40% → profile severity = attention → overall = critical
        const report = normalizeReport(
            makeReport([{
                name: 'Panel',
                params: [
                    { val: 15, min: 13, max: 18 },  // normal
                    { val: 15, min: 13, max: 18 },  // normal
                    { val: 15, min: 13, max: 18 },  // normal
                    { val: 22, min: 13, max: 18 },  // high
                    { val: 5, min: 13, max: 18 },   // low (deviation 8/13 = 0.61 → critical)
                ],
            }]),
        );
        expect(report.overallSeverity).toBe('critical');
    });

    it('escalates to critical when any profile has a critical parameter', () => {
        const report = normalizeReport(
            makeReport([
                { name: 'Normal Profile', params: [{ val: 15, min: 13, max: 18 }] },
                { name: 'Critical Profile', params: [{ val: 1, min: 100, max: 200 }] }, // way below
            ]),
        );
        expect(report.overallSeverity).toBe('critical');
    });

    it('computes overall score as mean of profile scores', () => {
        const report = normalizeReport(
            makeReport([
                { name: 'Perfect', params: [{ val: 15, min: 13, max: 18 }] },
                { name: 'Perfect2', params: [{ val: 50, min: 10, max: 90 }] },
            ]),
        );
        // Both profiles have score 100 → overall = 100
        expect(report.overallScore).toBe(100);
    });
});
