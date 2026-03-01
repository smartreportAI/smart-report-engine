/**
 * Minimal HL7 v2.x type definitions for ORU^R01 ingestion.
 *
 * Only the segments and fields consumed by the parser and adapter
 * are declared here.
 */

// ---------------------------------------------------------------------------
// Raw segment representation
// ---------------------------------------------------------------------------

/** A single parsed HL7 segment: segment type + ordered field values. */
export interface HL7Segment {
    /** Three-character segment identifier, e.g. "MSH", "PID", "OBR", "OBX". */
    type: string;
    /** All pipe-delimited fields (index 0 = segment type). */
    fields: string[];
}

// ---------------------------------------------------------------------------
// Extracted data structures
// ---------------------------------------------------------------------------

export interface HL7Patient {
    patientId: string;
    familyName: string;
    givenName: string;
    dateOfBirth: string; // YYYYMMDD
    gender: string;      // M / F / O / U
}

export interface HL7Order {
    /** Set ID of the OBR segment — used to correlate OBX segments. */
    setId: string;
    /** Profile / panel name extracted from OBR-4. */
    profileName: string;
}

export interface HL7Observation {
    /** Set ID of the OBX within its OBR group. */
    setId: string;
    /** Value type (NM = numeric, ST = string, etc.). */
    valueType: string;
    /** Test code, e.g. "718-7". */
    testCode: string;
    /** Test display name, e.g. "Hemoglobin". */
    testName: string;
    /** Raw observation value. */
    value: string;
    /** Unit of measure. */
    unit: string;
    /** Raw reference range string, e.g. "13.5-17.5". */
    referenceRangeRaw: string;
    /** Abnormal flag (L, H, N, etc.). */
    abnormalFlag: string;
    /** Result status (F = final, P = preliminary, etc.). */
    resultStatus: string;
}

// ---------------------------------------------------------------------------
// Top-level parsed message
// ---------------------------------------------------------------------------

export interface HL7Message {
    /** Raw segments in order. */
    segments: HL7Segment[];
    /** Message type extracted from MSH-9, e.g. "ORU^R01". */
    messageType: string;
    /** Extracted patient data from PID. */
    patient: HL7Patient | null;
    /** Extracted orders from OBR segments. */
    orders: HL7Order[];
    /** Extracted observations from OBX segments, grouped by preceding OBR. */
    observations: Map<number, HL7Observation[]>;
}
