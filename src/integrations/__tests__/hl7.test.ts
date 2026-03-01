import { describe, it, expect } from 'vitest';
import { parseHl7Message } from '../hl7/hl7.parser';
import {
    adaptHl7ToRawReport,
    calculateAgeFromHl7Date,
    parseReferenceRange,
} from '../hl7/hl7.adapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidOru(): string {
    return [
        'MSH|^~\\&|Lab|Hosp|Ord|Hosp|20260301||ORU^R01|MSG001|P|2.5',
        'PID|1||PAT-001^^^Hosp||Doe^John||19900115|M',
        'OBR|1||ORD-001|CBC^Complete Blood Count',
        'OBX|1|NM|718-7^Hemoglobin||14.5|g/dL|13.5-17.5|N|||F',
        'OBX|2|NM|6690-2^WBC Count||9800|cells/uL|4500-11000|N|||F',
    ].join('\r');
}

// ---------------------------------------------------------------------------
// parseHl7Message
// ---------------------------------------------------------------------------

describe('parseHl7Message', () => {
    it('parses segments from a valid ORU message', () => {
        const msg = parseHl7Message(makeValidOru());

        expect(msg.segments).toHaveLength(5);
        expect(msg.messageType).toBe('ORU^R01');
        expect(msg.patient).not.toBeNull();
        expect(msg.orders).toHaveLength(1);
    });

    it('handles \\n line endings', () => {
        const raw = [
            'MSH|^~\\&|Lab|Hosp|Ord|Hosp|20260301||ORU^R01|MSG001|P|2.5',
            'PID|1||PAT-001||Doe^John||19900115|M',
            'OBR|1||ORD-001|CBC^Complete Blood Count',
            'OBX|1|NM|718-7^Hemoglobin||14.0|g/dL|13.5-17.5|N|||F',
        ].join('\n');

        const msg = parseHl7Message(raw);
        expect(msg.messageType).toBe('ORU^R01');
        expect(msg.patient?.patientId).toBe('PAT-001');
    });

    it('extracts patient id from PID-3 with sub-components', () => {
        const msg = parseHl7Message(makeValidOru());
        expect(msg.patient?.patientId).toBe('PAT-001');
    });

    it('extracts patient name', () => {
        const msg = parseHl7Message(makeValidOru());
        expect(msg.patient?.familyName).toBe('Doe');
        expect(msg.patient?.givenName).toBe('John');
    });

    it('extracts gender', () => {
        const msg = parseHl7Message(makeValidOru());
        expect(msg.patient?.gender).toBe('M');
    });

    it('extracts DOB', () => {
        const msg = parseHl7Message(makeValidOru());
        expect(msg.patient?.dateOfBirth).toBe('19900115');
    });

    it('groups OBX under correct OBR', () => {
        const raw = [
            'MSH|^~\\&|Lab|Hosp|Ord|Hosp|20260301||ORU^R01|MSG001|P|2.5',
            'PID|1||P1||Test^User||20000101|F',
            'OBR|1||O1|CBC^CBC Panel',
            'OBX|1|NM|A^Test A||10|mg|5-15|N|||F',
            'OBX|2|NM|B^Test B||20|mg|10-30|N|||F',
            'OBR|2||O2|LIP^Lipid Panel',
            'OBX|1|NM|C^Test C||100|mg|0-200|N|||F',
        ].join('\r');

        const msg = parseHl7Message(raw);
        expect(msg.orders).toHaveLength(2);
        expect(msg.observations.get(0)).toHaveLength(2);
        expect(msg.observations.get(1)).toHaveLength(1);
    });

    it('throws on empty message', () => {
        expect(() => parseHl7Message('')).toThrow(/empty/i);
    });

    it('ignores unknown segment types', () => {
        const raw = [
            'MSH|^~\\&|Lab|Hosp|Ord|Hosp|20260301||ORU^R01|MSG001|P|2.5',
            'EVN|R01|20260301',
            'PID|1||P1||Test^User||20000101|M',
            'OBR|1||O1|CBC^CBC',
            'NTE|1||This is a note',
            'OBX|1|NM|A^Test||5|mg|1-10|N|||F',
        ].join('\r');

        const msg = parseHl7Message(raw);
        // EVN and NTE are stored but don't break parsing
        expect(msg.segments).toHaveLength(6);
        expect(msg.observations.get(0)).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// calculateAgeFromHl7Date
// ---------------------------------------------------------------------------

describe('calculateAgeFromHl7Date', () => {
    it('calculates correct age from YYYYMMDD', () => {
        const age = calculateAgeFromHl7Date('20000101');
        const expectedAge = new Date().getFullYear() - 2000;
        const today = new Date();
        const adjusted =
            today.getMonth() < 0 || (today.getMonth() === 0 && today.getDate() < 1)
                ? expectedAge - 1
                : expectedAge;
        expect(age).toBe(adjusted);
    });

    it('returns 0 for empty string', () => {
        expect(calculateAgeFromHl7Date('')).toBe(0);
    });

    it('returns 0 for short string', () => {
        expect(calculateAgeFromHl7Date('19901')).toBe(0);
    });

    it('returns 0 for non-numeric string', () => {
        expect(calculateAgeFromHl7Date('ABCDEFGH')).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// parseReferenceRange
// ---------------------------------------------------------------------------

describe('parseReferenceRange', () => {
    it('parses "min-max" format', () => {
        expect(parseReferenceRange('13.5-17.5')).toEqual({ min: 13.5, max: 17.5 });
    });

    it('parses "min - max" with spaces', () => {
        expect(parseReferenceRange('4500 - 11000')).toEqual({ min: 4500, max: 11000 });
    });

    it('parses ">value" format', () => {
        expect(parseReferenceRange('>10')).toEqual({ min: 10 });
    });

    it('parses ">=value" format', () => {
        expect(parseReferenceRange('>=40')).toEqual({ min: 40 });
    });

    it('parses "<value" format', () => {
        expect(parseReferenceRange('<200')).toEqual({ max: 200 });
    });

    it('parses "<=value" format', () => {
        expect(parseReferenceRange('<=150')).toEqual({ max: 150 });
    });

    it('returns text fallback for non-numeric range', () => {
        expect(parseReferenceRange('Normal')).toEqual({ text: 'Normal' });
    });

    it('returns undefined for empty string', () => {
        expect(parseReferenceRange('')).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// adaptHl7ToRawReport — valid messages
// ---------------------------------------------------------------------------

describe('adaptHl7ToRawReport', () => {
    it('parses a valid ORU^R01 into RawReportInput', () => {
        const result = adaptHl7ToRawReport(makeValidOru());

        expect(result.patientId).toBe('PAT-001');
        expect(result.gender).toBe('male');
        expect(result.age).toBeGreaterThan(0);
        expect(result.profiles).toHaveLength(1);
        expect(result.profiles[0].profileName).toBe('Complete Blood Count');
        expect(result.profiles[0].parameters).toHaveLength(2);
    });

    it('extracts numeric values correctly', () => {
        const result = adaptHl7ToRawReport(makeValidOru());
        const hemoglobin = result.profiles[0].parameters[0];

        expect(hemoglobin.testName).toBe('Hemoglobin');
        expect(hemoglobin.value).toBe(14.5);
        expect(hemoglobin.unit).toBe('g/dL');
    });

    it('extracts reference ranges correctly', () => {
        const result = adaptHl7ToRawReport(makeValidOru());
        const hemoglobin = result.profiles[0].parameters[0];

        expect(hemoglobin.referenceRange).toEqual({ min: 13.5, max: 17.5 });
    });

    it('groups observations by OBR panels', () => {
        const raw = [
            'MSH|^~\\&|Lab|Hosp|Ord|Hosp|20260301||ORU^R01|MSG001|P|2.5',
            'PID|1||P1||Test^User||20000101|F',
            'OBR|1||O1|CBC^CBC Panel',
            'OBX|1|NM|A^Test A||10|mg|5-15|N|||F',
            'OBR|2||O2|LIP^Lipid Panel',
            'OBX|1|NM|B^Test B||200|mg|0-250|N|||F',
        ].join('\r');

        const result = adaptHl7ToRawReport(raw);
        expect(result.profiles).toHaveLength(2);
        expect(result.profiles[0].profileName).toBe('CBC Panel');
        expect(result.profiles[1].profileName).toBe('Lipid Panel');
    });

    it('maps F gender to female', () => {
        const raw = [
            'MSH|^~\\&|Lab|Hosp|Ord|Hosp|20260301||ORU^R01|MSG001|P|2.5',
            'PID|1||P1||Test^User||20000101|F',
            'OBR|1||O1|CBC^CBC',
            'OBX|1|NM|A^Test||10|mg|5-15|N|||F',
        ].join('\r');

        const result = adaptHl7ToRawReport(raw);
        expect(result.gender).toBe('female');
    });

    it('maps unknown gender to other', () => {
        const raw = [
            'MSH|^~\\&|Lab|Hosp|Ord|Hosp|20260301||ORU^R01|MSG001|P|2.5',
            'PID|1||P1||Test^User||20000101|U',
            'OBR|1||O1|CBC^CBC',
            'OBX|1|NM|A^Test||10|mg|5-15|N|||F',
        ].join('\r');

        const result = adaptHl7ToRawReport(raw);
        expect(result.gender).toBe('other');
    });

    it('falls back to General Panel when no OBR exists', () => {
        const raw = [
            'MSH|^~\\&|Lab|Hosp|Ord|Hosp|20260301||ORU^R01|MSG001|P|2.5',
            'PID|1||P1||Test^User||20000101|M',
            'OBX|1|NM|A^Test A||10|mg|5-15|N|||F',
            'OBX|2|NM|B^Test B||20|mg|10-30|N|||F',
        ].join('\r');

        const result = adaptHl7ToRawReport(raw);
        expect(result.profiles).toHaveLength(1);
        expect(result.profiles[0].profileName).toBe('General Panel');
        expect(result.profiles[0].parameters).toHaveLength(2);
    });
});

// ---------------------------------------------------------------------------
// adaptHl7ToRawReport — validation failures
// ---------------------------------------------------------------------------

describe('adaptHl7ToRawReport — validation failures', () => {
    it('rejects non-ORU^R01 messages', () => {
        const raw = [
            'MSH|^~\\&|Lab|Hosp|Ord|Hosp|20260301||ADT^A01|MSG001|P|2.5',
            'PID|1||P1||Test^User||20000101|M',
        ].join('\r');

        expect(() => adaptHl7ToRawReport(raw)).toThrow(/ORU\^R01/);
    });

    it('rejects messages without PID', () => {
        const raw = [
            'MSH|^~\\&|Lab|Hosp|Ord|Hosp|20260301||ORU^R01|MSG001|P|2.5',
            'OBR|1||O1|CBC^CBC',
            'OBX|1|NM|A^Test||10|mg|5-15|N|||F',
        ].join('\r');

        expect(() => adaptHl7ToRawReport(raw)).toThrow(/PID/);
    });

    it('rejects messages without OBX', () => {
        const raw = [
            'MSH|^~\\&|Lab|Hosp|Ord|Hosp|20260301||ORU^R01|MSG001|P|2.5',
            'PID|1||P1||Test^User||20000101|M',
            'OBR|1||O1|CBC^CBC',
        ].join('\r');

        expect(() => adaptHl7ToRawReport(raw)).toThrow(/OBX/);
    });

    it('rejects empty messages', () => {
        expect(() => adaptHl7ToRawReport('')).toThrow(/empty/i);
    });
});
