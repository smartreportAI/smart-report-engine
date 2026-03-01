import { parseHl7Message } from './hl7.parser';
import type { HL7Observation } from './hl7.types';
import type {
    RawReportInput,
    RawProfileInput,
    RawParameterInput,
    RawReferenceRange,
    Gender,
} from '../../domain/types/input.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculates age in whole years from a YYYYMMDD date string.
 * Returns 0 if the date is unparsable or in the future.
 */
export function calculateAgeFromHl7Date(dateStr: string): number {
    if (!dateStr || dateStr.length < 8) return 0;

    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1; // JS months are 0-based
    const day = parseInt(dateStr.substring(6, 8), 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return 0;

    const birth = new Date(year, month, day);
    if (isNaN(birth.getTime())) return 0;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return Math.max(age, 0);
}

/**
 * Maps HL7 administrative sex codes to domain Gender.
 *
 *   M → male
 *   F → female
 *   O / U / anything else → other
 */
function mapGender(hl7Gender: string): Gender {
    switch (hl7Gender.toUpperCase()) {
        case 'M':
            return 'male';
        case 'F':
            return 'female';
        default:
            return 'other';
    }
}

/**
 * Parses an HL7 reference range string into numeric min/max.
 *
 * Supported formats:
 *   "13.5-17.5"   → { min: 13.5, max: 17.5 }
 *   "13.5 - 17.5" → { min: 13.5, max: 17.5 }
 *   ">10"         → { min: 10 }
 *   ">=10"        → { min: 10 }
 *   "<200"        → { max: 200 }
 *   "<=200"       → { max: 200 }
 *   ""            → undefined
 *   "Normal"      → { text: "Normal" }
 */
export function parseReferenceRange(raw: string): RawReferenceRange | undefined {
    if (!raw || raw.trim().length === 0) return undefined;

    const trimmed = raw.trim();

    // Try "min-max" format (handles negative numbers carefully)
    // Pattern: optional whitespace, number, dash, number
    const rangeMatch = trimmed.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/);
    if (rangeMatch) {
        return {
            min: parseFloat(rangeMatch[1]),
            max: parseFloat(rangeMatch[2]),
        };
    }

    // Try ">=" or ">" prefix
    const gtMatch = trimmed.match(/^>=?\s*(\d+\.?\d*)$/);
    if (gtMatch) {
        return { min: parseFloat(gtMatch[1]) };
    }

    // Try "<=" or "<" prefix
    const ltMatch = trimmed.match(/^<=?\s*(\d+\.?\d*)$/);
    if (ltMatch) {
        return { max: parseFloat(ltMatch[1]) };
    }

    // Fall back to text
    return { text: trimmed };
}

// ---------------------------------------------------------------------------
// OBX → RawParameterInput
// ---------------------------------------------------------------------------

function adaptObservation(obs: HL7Observation): RawParameterInput {
    const numericValue = parseFloat(obs.value);
    const value = isNaN(numericValue) ? obs.value : numericValue;
    const referenceRange = parseReferenceRange(obs.referenceRangeRaw);

    return {
        testName: obs.testName,
        value,
        unit: obs.unit || undefined,
        referenceRange,
    };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Converts a raw HL7 v2.x ORU^R01 message string into the engine's
 * RawReportInput.
 *
 * This is a **pure transformation** — no side effects, no env access.
 *
 * @throws {Error} if message type is not ORU^R01.
 * @throws {Error} if no PID segment is found.
 * @throws {Error} if no OBX segments are found.
 */
export function adaptHl7ToRawReport(message: string): RawReportInput {
    // 1. Parse
    const parsed = parseHl7Message(message);

    // 2. Validate message type
    if (parsed.messageType !== 'ORU^R01') {
        throw new Error(
            `Unsupported HL7 message type: "${parsed.messageType}". Only ORU^R01 is supported.`,
        );
    }

    // 3. Require patient
    if (!parsed.patient) {
        throw new Error('HL7 message must contain a PID segment.');
    }

    // 4. Collect all OBX observations
    let totalObservations = 0;
    for (const [, obsList] of parsed.observations) {
        totalObservations += obsList.length;
    }

    if (totalObservations === 0) {
        throw new Error('HL7 message must contain at least one OBX segment.');
    }

    // 5. Build patient fields
    const patientId = parsed.patient.patientId;
    const age = calculateAgeFromHl7Date(parsed.patient.dateOfBirth);
    const gender = mapGender(parsed.patient.gender);

    // 6. Group OBX segments into profiles by OBR
    const profiles: RawProfileInput[] = [];

    if (parsed.orders.length > 0) {
        // Group observations by their OBR order
        for (let i = 0; i < parsed.orders.length; i++) {
            const order = parsed.orders[i];
            const obsList = parsed.observations.get(i) ?? [];

            if (obsList.length > 0) {
                profiles.push({
                    profileName: order.profileName,
                    parameters: obsList.map(adaptObservation),
                });
            }
        }

        // Handle any OBX segments that appeared before the first OBR
        const unclaimedObs = parsed.observations.get(-1);
        if (unclaimedObs && unclaimedObs.length > 0) {
            profiles.push({
                profileName: 'General Panel',
                parameters: unclaimedObs.map(adaptObservation),
            });
        }
    } else {
        // No OBR segments — all observations go to General Panel
        const allObs: HL7Observation[] = [];
        for (const [, obsList] of parsed.observations) {
            allObs.push(...obsList);
        }
        profiles.push({
            profileName: 'General Panel',
            parameters: allObs.map(adaptObservation),
        });
    }

    return {
        patientId,
        age,
        gender,
        profiles,
    };
}
