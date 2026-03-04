import { z } from 'zod';

/** Supported output formats for a report generation request. */
export const OutputFormatSchema = z.enum(['html', 'pdf']).default('html');
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

/**
 * Coerces a value that may be number, string, or null/undefined into a number
 * for reference range bounds. Invalid or non-numeric strings become undefined
 * so report generation never fails on missing or malformed ranges.
 */
function coerceOptionalNumber(
  v: unknown,
): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isNaN(n) ? undefined : n;
}

const OptionalRangeBoundSchema = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform(coerceOptionalNumber);

/** Reference range: accepts null, missing, or string min/max (e.g. "<5", "N/A"). */
const ReferenceRangeSchema = z
  .object({
    min: OptionalRangeBoundSchema,
    max: OptionalRangeBoundSchema,
    text: z.string().nullable().optional(),
  })
  .optional()
  .nullable()
  .transform((v) => {
    if (v === null || v === undefined) return undefined;
    const min = coerceOptionalNumber(v.min);
    const max = coerceOptionalNumber(v.max);
    if (min === undefined && max === undefined) return undefined;
    return { min, max, text: v.text ?? undefined };
  });

export const GenerateReportBodySchema = z.object({
  tenantId: z.string().min(1),
  /**
   * Requested output format.
   * - "html" (default) → returns JSON envelope with HTML string
   * - "pdf"            → returns raw A4 PDF binary (application/pdf)
   */
  output: OutputFormatSchema,
  reportData: z.object({
    patientId: z.string().min(1),
    patientName: z.string().optional(),
    age: z.number().int().positive(),
    gender: z.enum(['male', 'female', 'other']),
    profiles: z.array(
      z.object({
        profileName: z.string().min(1),
        parameters: z.array(
          z.object({
            testName: z.string().min(1),
            value: z.union([z.number(), z.string()]),
            unit: z.string().nullable().optional(),
            referenceRange: ReferenceRangeSchema,
          }),
        ),
      }),
    ),
    aiAssessment: z.object({
      healthScore: z.number(),
      overallRecommendations: z.array(z.string()),
    }).optional(),
  }),
});

export type GenerateReportBody = z.infer<typeof GenerateReportBodySchema>;

export interface ReportGenerationResult {
  html?: string;
  pdfBase64?: string;
  overallScore: number;
  overallSeverity: string;
  renderedPages: string[];
  skippedPages: string[];
}
