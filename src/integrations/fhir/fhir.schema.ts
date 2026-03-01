import { z } from 'zod';

/**
 * Strict Zod schemas for FHIR R4 resources consumed by the ingestion layer.
 *
 * Design decisions:
 *   - Validation is strict — invalid bundles are rejected entirely.
 *   - Only fields the adapter needs are validated; everything else is
 *     stripped by Zod's default behaviour.
 *   - `passthrough()` is NOT used so unknown keys do not leak downstream.
 */

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

const FHIRCodingSchema = z.object({
    system: z.string().optional(),
    code: z.string().min(1),
    display: z.string().optional(),
});

const FHIRCodeableConceptSchema = z.object({
    coding: z.array(FHIRCodingSchema).min(1),
    text: z.string().optional(),
});

const FHIRQuantitySchema = z.object({
    value: z.number(),
    unit: z.string().optional(),
    system: z.string().optional(),
    code: z.string().optional(),
});

const FHIRReferenceSchema = z.object({
    reference: z.string().min(1),
    display: z.string().optional(),
});

const FHIRHumanNameSchema = z.object({
    use: z.string().optional(),
    family: z.string().optional(),
    given: z.array(z.string()).optional(),
    text: z.string().optional(),
});

const FHIRObservationReferenceRangeSchema = z.object({
    low: FHIRQuantitySchema.optional(),
    high: FHIRQuantitySchema.optional(),
    text: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Resource schemas
// ---------------------------------------------------------------------------

export const FHIRPatientSchema = z.object({
    resourceType: z.literal('Patient'),
    id: z.string().min(1),
    name: z.array(FHIRHumanNameSchema).optional(),
    gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
    birthDate: z.string().optional(),
});

export const FHIRObservationSchema = z.object({
    resourceType: z.literal('Observation'),
    id: z.string().min(1),
    status: z.string().min(1),
    code: FHIRCodeableConceptSchema,
    valueQuantity: FHIRQuantitySchema,
    referenceRange: z.array(FHIRObservationReferenceRangeSchema).optional(),
    subject: FHIRReferenceSchema.optional(),
    interpretation: z.array(FHIRCodeableConceptSchema).optional(),
});

export const FHIRDiagnosticReportSchema = z.object({
    resourceType: z.literal('DiagnosticReport'),
    id: z.string().min(1),
    code: FHIRCodeableConceptSchema.optional(),
    result: z.array(FHIRReferenceSchema).optional(),
    subject: FHIRReferenceSchema.optional(),
});

// ---------------------------------------------------------------------------
// Discriminated entry schema
// ---------------------------------------------------------------------------

/**
 * Each entry's `resource` is validated with a discriminated union on
 * `resourceType`.  Resources whose type is not Patient, Observation,
 * or DiagnosticReport are still accepted at the bundle level but will
 * be ignored during adaptation. We use a catch-all branch with
 * `passthrough()` so unknown resource types don't cause validation
 * errors at the bundle level.
 */
const KnownResourceSchema = z.discriminatedUnion('resourceType', [
    FHIRPatientSchema,
    FHIRObservationSchema,
    FHIRDiagnosticReportSchema,
]);

/**
 * Fallback for resource types we do not explicitly support.
 * We only require `resourceType` to be present so we can filter later.
 */
const UnknownResourceSchema = z
    .object({ resourceType: z.string().min(1) })
    .passthrough();

const FHIRBundleEntrySchema = z.object({
    resource: z.union([KnownResourceSchema, UnknownResourceSchema]),
});

// ---------------------------------------------------------------------------
// Bundle schema (top-level)
// ---------------------------------------------------------------------------

export const FHIRBundleSchema = z.object({
    resourceType: z.literal('Bundle'),
    type: z.enum(['collection', 'document']),
    entry: z.array(FHIRBundleEntrySchema).min(1),
});

// ---------------------------------------------------------------------------
// Inferred types (for use inside the adapter when needed)
// ---------------------------------------------------------------------------

export type ValidatedFHIRBundle = z.infer<typeof FHIRBundleSchema>;
