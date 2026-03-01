/**
 * Minimal FHIR R4 type definitions.
 *
 * Only the resource types and fields actually consumed by the adapter
 * are declared here. This keeps the surface area small and avoids
 * importing a full FHIR type package.
 */

// ---------------------------------------------------------------------------
// Primitives / shared sub-structures
// ---------------------------------------------------------------------------

export interface FHIRCoding {
    system?: string;
    code: string;
    display?: string;
}

export interface FHIRCodeableConcept {
    coding: FHIRCoding[];
    text?: string;
}

export interface FHIRQuantity {
    value: number;
    unit?: string;
    system?: string;
    code?: string;
}

export interface FHIRReference {
    reference: string;
    display?: string;
}

export interface FHIRHumanName {
    use?: string;
    family?: string;
    given?: string[];
    text?: string;
}

export interface FHIRObservationReferenceRange {
    low?: FHIRQuantity;
    high?: FHIRQuantity;
    text?: string;
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export interface FHIRPatient {
    resourceType: 'Patient';
    id: string;
    name?: FHIRHumanName[];
    gender?: 'male' | 'female' | 'other' | 'unknown';
    birthDate?: string; // YYYY-MM-DD
}

export interface FHIRObservation {
    resourceType: 'Observation';
    id: string;
    status: string;
    code: FHIRCodeableConcept;
    valueQuantity?: FHIRQuantity;
    referenceRange?: FHIRObservationReferenceRange[];
    subject?: FHIRReference;
    interpretation?: FHIRCodeableConcept[];
}

export interface FHIRDiagnosticReport {
    resourceType: 'DiagnosticReport';
    id: string;
    code?: FHIRCodeableConcept;
    result?: FHIRReference[];
    subject?: FHIRReference;
}

// ---------------------------------------------------------------------------
// Bundle
// ---------------------------------------------------------------------------

/** Union of all resource types we handle. */
export type FHIRResource = FHIRPatient | FHIRObservation | FHIRDiagnosticReport;

export interface FHIRBundleEntry {
    resource: FHIRResource;
}

export interface FHIRBundle {
    resourceType: 'Bundle';
    type: 'collection' | 'document';
    entry: FHIRBundleEntry[];
}
