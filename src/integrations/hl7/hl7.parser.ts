import type {
    HL7Message,
    HL7Segment,
    HL7Patient,
    HL7Order,
    HL7Observation,
} from './hl7.types';

/**
 * Pure HL7 v2.x message parser.
 *
 * Splits a raw HL7 pipe-delimited string into typed segments and extracts
 * the data structures needed by the adapter: Patient (PID), Orders (OBR),
 * and Observations (OBX).
 *
 * Design notes:
 * - MSH-1 IS the field separator (`|`); when we split MSH by `|`,
 *   the encoding characters land at index 1 and all subsequent fields
 *   are offset by −1 compared to the HL7 spec numbering.
 *   We document field positions as 0-based array indices after split.
 * - Unknown segment types are stored in `segments` but otherwise ignored.
 * - No side effects, no env access — pure function.
 */

// ---------------------------------------------------------------------------
// Segment splitter
// ---------------------------------------------------------------------------

/**
 * Splits a raw HL7 message string into individual segment lines.
 * HL7 messages use `\r` (CR) as the official segment terminator,
 * but we also handle `\n` and `\r\n` for flexibility.
 */
function splitSegments(message: string): string[] {
    return message
        .split(/\r\n|\r|\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

/**
 * Parses a single line into an HL7Segment (type + fields).
 */
function parseSegmentLine(line: string): HL7Segment {
    const fields = line.split('|');
    return {
        type: fields[0],
        fields,
    };
}

// ---------------------------------------------------------------------------
// PID extraction
// ---------------------------------------------------------------------------

/**
 * Extracts patient data from a PID segment.
 *
 * PID field positions (0-based split index):
 *   [0] = "PID"
 *   [1] = Set ID              (PID-1)
 *   [2] = External Patient ID (PID-2)
 *   [3] = Patient ID          (PID-3)  — may contain sub-components (^^^)
 *   [4] = Alternate ID        (PID-4)
 *   [5] = Patient Name        (PID-5)  — Family^Given^Middle
 *   [6] = Mother's Maiden     (PID-6)
 *   [7] = Date of Birth       (PID-7)  — YYYYMMDD
 *   [8] = Administrative Sex  (PID-8)  — M / F / O / U
 */
function extractPatient(segment: HL7Segment): HL7Patient {
    const patientIdRaw = segment.fields[3] ?? '';
    // PID-3 can be "PAT-001^^^Hospital" — take first component
    const patientId = patientIdRaw.split('^')[0] || patientIdRaw;

    const nameRaw = segment.fields[5] ?? '';
    const nameParts = nameRaw.split('^');
    const familyName = nameParts[0] ?? '';
    const givenName = nameParts[1] ?? '';

    const dateOfBirth = segment.fields[7] ?? '';
    const gender = segment.fields[8] ?? 'U';

    return {
        patientId,
        familyName,
        givenName,
        dateOfBirth,
        gender,
    };
}

// ---------------------------------------------------------------------------
// OBR extraction
// ---------------------------------------------------------------------------

/**
 * Extracts order/panel info from an OBR segment.
 *
 * OBR field positions (0-based split index):
 *   [0] = "OBR"
 *   [1] = Set ID              (OBR-1)
 *   [2] = Placer Order Number (OBR-2)
 *   [3] = Filler Order Number (OBR-3)
 *   [4] = Universal Service ID (OBR-4) — Code^Display
 */
function extractOrder(segment: HL7Segment): HL7Order {
    const setId = segment.fields[1] ?? '1';
    const serviceIdRaw = segment.fields[4] ?? '';
    const parts = serviceIdRaw.split('^');
    const profileName = parts[1] || parts[0] || 'Unknown Panel';

    return { setId, profileName };
}

// ---------------------------------------------------------------------------
// OBX extraction
// ---------------------------------------------------------------------------

/**
 * Extracts observation data from an OBX segment.
 *
 * OBX field positions (0-based split index):
 *   [0]  = "OBX"
 *   [1]  = Set ID             (OBX-1)
 *   [2]  = Value Type         (OBX-2) — NM, ST, CE, etc.
 *   [3]  = Observation ID     (OBX-3) — Code^Display
 *   [4]  = Observation Sub-ID (OBX-4)
 *   [5]  = Observation Value  (OBX-5)
 *   [6]  = Units              (OBX-6)
 *   [7]  = Reference Range    (OBX-7) — e.g. "13.5-17.5"
 *   [8]  = Abnormal Flags     (OBX-8)
 *   [9]  = Probability        (OBX-9)
 *   [10] = Nature of Test     (OBX-10)
 *   [11] = Result Status      (OBX-11) — F, P, C, etc.
 */
function extractObservation(segment: HL7Segment): HL7Observation {
    const setId = segment.fields[1] ?? '1';
    const valueType = segment.fields[2] ?? '';

    const obsIdRaw = segment.fields[3] ?? '';
    const obsIdParts = obsIdRaw.split('^');
    const testCode = obsIdParts[0] ?? '';
    const testName = obsIdParts[1] || obsIdParts[0] || 'Unknown Test';

    const value = segment.fields[5] ?? '';
    const unit = segment.fields[6] ?? '';
    const referenceRangeRaw = segment.fields[7] ?? '';
    const abnormalFlag = segment.fields[8] ?? '';
    const resultStatus = segment.fields[11] ?? '';

    return {
        setId,
        valueType,
        testCode,
        testName,
        value,
        unit,
        referenceRangeRaw,
        abnormalFlag,
        resultStatus,
    };
}

// ---------------------------------------------------------------------------
// MSH message type extraction
// ---------------------------------------------------------------------------

/**
 * Extracts the message type from an MSH segment.
 *
 * MSH is special: MSH-1 IS the field separator (`|`), so when we
 * split by `|` the encoding chars are at index 1 and every subsequent
 * field is one position lower than the HL7 spec number.
 *
 *   split index [0] = "MSH"
 *   split index [1] = encoding chars  (MSH-2)
 *   split index [2] = sending app      (MSH-3)
 *   ...
 *   split index [8] = message type     (MSH-9) → e.g. "ORU^R01"
 */
function extractMessageType(segment: HL7Segment): string {
    return segment.fields[8] ?? '';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a raw HL7 v2.x pipe-delimited message string into a
 * structured HL7Message.
 *
 * OBX segments are grouped by the most recently encountered OBR segment
 * (using its index in the orders array). OBX segments appearing before
 * any OBR are grouped under index -1.
 *
 * @throws {Error} if the message is empty or contains no segments.
 */
export function parseHl7Message(message: string): HL7Message {
    const lines = splitSegments(message);

    if (lines.length === 0) {
        throw new Error('HL7 message is empty or contains no valid segments.');
    }

    const segments: HL7Segment[] = [];
    let messageType = '';
    let patient: HL7Patient | null = null;
    const orders: HL7Order[] = [];
    const observations = new Map<number, HL7Observation[]>();
    let currentObrIndex = -1;

    for (const line of lines) {
        const segment = parseSegmentLine(line);
        segments.push(segment);

        switch (segment.type) {
            case 'MSH':
                messageType = extractMessageType(segment);
                break;

            case 'PID':
                patient = extractPatient(segment);
                break;

            case 'OBR': {
                const order = extractOrder(segment);
                orders.push(order);
                currentObrIndex = orders.length - 1;
                if (!observations.has(currentObrIndex)) {
                    observations.set(currentObrIndex, []);
                }
                break;
            }

            case 'OBX': {
                const obs = extractObservation(segment);
                if (!observations.has(currentObrIndex)) {
                    observations.set(currentObrIndex, []);
                }
                observations.get(currentObrIndex)!.push(obs);
                break;
            }

            default:
                // Unknown segments are stored but not specifically processed.
                break;
        }
    }

    return {
        segments,
        messageType,
        patient,
        orders,
        observations,
    };
}
