import { FHIRBundleSchema, FHIRObservationSchema } from './fhir.schema';
import type {
    FHIRBundle,
    FHIRPatient,
    FHIRObservation,
    FHIRDiagnosticReport,
} from './fhir.types';
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
 * Calculates age in whole years from a YYYY-MM-DD date string.
 * Returns 0 if the date is unparsable or in the future.
 */
export function calculateAge(birthDate: string): number {
    const birth = new Date(birthDate);
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
 * Maps FHIR gender values to the domain Gender type.
 */
function mapGender(fhirGender: string | undefined): Gender {
    switch (fhirGender) {
        case 'male':
            return 'male';
        case 'female':
            return 'female';
        default:
            return 'other';
    }
}

/**
 * Extracts a human-readable test name from a FHIR CodeableConcept.
 * Prefers `display`, then `text`, then `code`.
 */
function resolveTestName(observation: FHIRObservation): string {
    const firstCoding = observation.code.coding[0];
    return (
        firstCoding?.display ??
        observation.code.text ??
        firstCoding?.code ??
        'Unknown Test'
    );
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function isPatient(resource: { resourceType: string }): resource is FHIRPatient {
    return resource.resourceType === 'Patient';
}

function isObservation(resource: { resourceType: string }): resource is FHIRObservation {
    return resource.resourceType === 'Observation';
}

function isDiagnosticReport(resource: { resourceType: string }): resource is FHIRDiagnosticReport {
    return resource.resourceType === 'DiagnosticReport';
}

// ---------------------------------------------------------------------------
// Observation → RawParameterInput
// ---------------------------------------------------------------------------

function adaptObservation(obs: FHIRObservation): RawParameterInput {
    const referenceRange: RawReferenceRange | undefined =
        obs.referenceRange && obs.referenceRange.length > 0
            ? {
                min: obs.referenceRange[0].low?.value,
                max: obs.referenceRange[0].high?.value,
                text: obs.referenceRange[0].text,
            }
            : undefined;

    return {
        testName: resolveTestName(obs),
        value: obs.valueQuantity?.value ?? 0,
        unit: obs.valueQuantity?.unit,
        referenceRange,
    };
}

// ---------------------------------------------------------------------------
// Grouping observations into profiles
// ---------------------------------------------------------------------------

/**
 * Groups Observations into profiles using DiagnosticReports when available.
 *
 * Strategy:
 *   1. If DiagnosticReport(s) exist, each report becomes a profile.
 *      Observations referenced by `DiagnosticReport.result[]` are grouped
 *      under `DiagnosticReport.code.text` (or a fallback name).
 *   2. Any observations NOT claimed by a DiagnosticReport go into
 *      a "General Panel" catch-all profile.
 *   3. If no DiagnosticReports exist, ALL observations go into
 *      "General Panel".
 */
function groupIntoProfiles(
    observations: FHIRObservation[],
    diagnosticReports: FHIRDiagnosticReport[],
): RawProfileInput[] {
    if (diagnosticReports.length === 0) {
        return [
            {
                profileName: 'General Panel',
                parameters: observations.map(adaptObservation),
            },
        ];
    }

    const claimedObservationIds = new Set<string>();
    const profiles: RawProfileInput[] = [];

    for (const report of diagnosticReports) {
        const profileName =
            report.code?.text ??
            report.code?.coding?.[0]?.display ??
            `Diagnostic Report ${report.id}`;

        const referencedIds = new Set(
            (report.result ?? []).map((ref) => {
                // reference is typically "Observation/<id>"
                const parts = ref.reference.split('/');
                return parts[parts.length - 1];
            }),
        );

        const matchedObservations = observations.filter((obs) =>
            referencedIds.has(obs.id),
        );

        for (const obs of matchedObservations) {
            claimedObservationIds.add(obs.id);
        }

        if (matchedObservations.length > 0) {
            profiles.push({
                profileName,
                parameters: matchedObservations.map(adaptObservation),
            });
        }
    }

    // Collect unclaimed observations into a General Panel
    const unclaimed = observations.filter(
        (obs) => !claimedObservationIds.has(obs.id),
    );

    if (unclaimed.length > 0) {
        profiles.push({
            profileName: 'General Panel',
            parameters: unclaimed.map(adaptObservation),
        });
    }

    return profiles;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Converts a FHIR Bundle (JSON object) into the engine's RawReportInput.
 *
 * This is a **pure transformation** — no side effects, no env access.
 *
 * @throws {ZodError} if the bundle fails schema validation.
 * @throws {Error}    if no Patient resource is found.
 * @throws {Error}    if no Observation resources are found.
 */
export function adaptFhirBundleToRawReport(bundle: FHIRBundle): RawReportInput {
    // 1. Validate
    const validated = FHIRBundleSchema.parse(bundle);

    // 2. Extract resources by type
    const patients: FHIRPatient[] = [];
    const observations: FHIRObservation[] = [];
    const diagnosticReports: FHIRDiagnosticReport[] = [];

    for (const entry of validated.entry) {
        const resource = entry.resource;
        if (isPatient(resource)) {
            patients.push(resource);
        } else if (isObservation(resource)) {
            // Re-validate each Observation individually to catch resources
            // that matched the fallback UnknownResourceSchema due to missing
            // required fields (e.g. valueQuantity).
            const validatedObs = FHIRObservationSchema.parse(resource);
            observations.push(validatedObs as unknown as FHIRObservation);
        } else if (isDiagnosticReport(resource)) {
            diagnosticReports.push(resource);
        }
        // All other resource types are silently ignored.
    }

    // 3. Require exactly one patient
    if (patients.length === 0) {
        throw new Error('FHIR Bundle must contain at least one Patient resource.');
    }
    const patient = patients[0];

    // 4. Require at least one observation
    if (observations.length === 0) {
        throw new Error(
            'FHIR Bundle must contain at least one Observation resource with valueQuantity.',
        );
    }

    // 5. Build patient fields
    const patientId = patient.id;
    const age = patient.birthDate ? calculateAge(patient.birthDate) : 0;
    const gender = mapGender(patient.gender);

    // 6. Group observations into profiles
    const profiles = groupIntoProfiles(observations, diagnosticReports);

    return {
        patientId,
        age,
        gender,
        profiles,
    };
}
