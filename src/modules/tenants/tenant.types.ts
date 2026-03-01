import { z } from 'zod';
import { TenantMappingConfigSchema } from '../../core/mapping/mapping.schema';

/* ---------------------------------------------------------------
   Reusable validators
   --------------------------------------------------------------- */

const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const HexColorSchema = z
   .string()
   .regex(hexColorRegex, 'Must be a valid hex color (e.g. #1A73E8)');

/* ---------------------------------------------------------------
   Branding sub-schema
   --------------------------------------------------------------- */

export const TenantBrandingConfigSchema = z.object({
   /** Display name shown in header, footer, and page title. */
   labName: z.string().min(1),
   /** URL to the lab logo image. */
   logoUrl: z.string().url(),

   /** Primary brand color — used for rings, accents, header strip. */
   primaryColor: HexColorSchema,
   /** Optional secondary brand color for future use. */
   secondaryColor: HexColorSchema.optional(),
   /** Optional distinct cover page color. Falls back to primaryColor. */
   coverColor: HexColorSchema.optional(),

   /** Override the default healthy accent (#2E7D32). */
   accentHealthy: HexColorSchema.optional(),
   /** Override the default monitor accent (#F9A825). */
   accentMonitor: HexColorSchema.optional(),
   /** Override the default attention accent (#C62828). */
   accentAttention: HexColorSchema.optional(),

   /** Custom footer text. Falls back to labName if not provided. */
   footerText: z.string().optional(),
   /** Contact email shown in footer / cover page. */
   contactEmail: z.string().email().optional(),
   /** Contact phone shown in footer / cover page. */
   contactPhone: z.string().optional(),

   /** Whether to show "Powered by Smart Health Engine" badge. Defaults to false. */
   showPoweredBy: z.boolean().optional(),
   /** Google Font family for headings (e.g. "Outfit"). */
   fontFamilyHeading: z.string().optional(),
   /** Google Font family for body text (e.g. "Inter"). */
   fontFamilyBody: z.string().optional(),

   /** Height of the header (e.g. "120px" or "30mm"). Default handles sizes automatically. */
   headerHeight: z.string().optional(),
   /** Extra margin below the header (e.g. "20px"). */
   headerMargin: z.string().optional(),
   /** Height of the footer (e.g. "100px" or "25mm"). Default handles sizes automatically. */
   footerHeight: z.string().optional(),
   /** Extra margin above the footer (e.g. "20px"). */
   footerMargin: z.string().optional(),
});

export type TenantBrandingConfig = z.infer<typeof TenantBrandingConfigSchema>;

/* ---------------------------------------------------------------
   Report type
   --------------------------------------------------------------- */

export const ReportTypeSchema = z.enum(['essential', 'inDepth']);
export type ReportType = z.infer<typeof ReportTypeSchema>;

/* ---------------------------------------------------------------
   Tenant config — top-level
   --------------------------------------------------------------- */

export const TenantConfigSchema = z.object({
   tenantId: z.string().min(1),
   reportType: ReportTypeSchema,
   pageOrder: z.array(z.string().min(1)).min(1),
   branding: TenantBrandingConfigSchema,

   /**
    * Optional parameter mapping table.
    * When present, raw parameters are mapped through this table
    * before entering normalizeReport().
    */
   mapping: TenantMappingConfigSchema.optional(),

   /**
    * If true, all parameters MUST have a mapping entry.
    * Unmapped parameters cause an error instead of passing through.
    * Defaults to false (lenient mode).
    */
   strictMapping: z.boolean().optional(),
});

export type TenantConfig = z.infer<typeof TenantConfigSchema>;

