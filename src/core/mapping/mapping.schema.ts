import { z } from 'zod';

/**
 * Zod schemas for tenant parameter mapping configuration.
 *
 * These are imported by TenantConfigSchema to extend tenant
 * definitions with optional mapping rules.
 */

export const MappingRangeOverrideSchema = z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    text: z.string().optional(),
});

export const MappingEntrySchema = z.object({
    externalCode: z.string().min(1),
    externalDisplay: z.string().optional(),
    internalParameterId: z.string().min(1),
    internalProfileName: z.string().min(1),
    unitOverride: z.string().optional(),
    rangeOverride: MappingRangeOverrideSchema.optional(),
});

export const TenantMappingConfigSchema = z.object({
    parameters: z.array(MappingEntrySchema).min(1),
});
