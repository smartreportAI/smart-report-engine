import { z } from 'zod';

/** Supported output formats. PDF is the default and primary output. HTML is for debugging only. */
export const OutputFormatSchema = z.enum(['pdf', 'html']).default('pdf');
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

/**
 * Raw Lab Input schema — the format that labs actually send.
 * Labs send: org, Centre, PName, Gender, Age, results[].investigation[].observations[]
 * The engine normalizes this internally.
 */
export const LabInputBodySchema = z.object({
  tenantId: z.string().min(1),
  output: OutputFormatSchema,
  /** Raw lab JSON (same format as Remedies accepts) */
  labData: z.object({
    org: z.string().min(1),
    Centre: z.string().min(1),
    WorkOrderID: z.string().optional(),
    LabNo: z.string().optional(),
    PName: z.string().min(1),
    Gender: z.string().min(1),
    Age: z.union([z.string(), z.number()]),
    ReferredBy: z.string().optional(),
    patientMobile: z.string().optional(),
    patientCategory: z.string().optional(),
    qrURL: z.string().optional(),
    hasPastData: z.boolean().optional(),
    results: z.array(z.object({
      Package_name: z.string().optional(),
      Package_book_code: z.string().optional(),
      investigation: z.array(z.object({
        test_name: z.string().optional().default(''),
        test_code: z.string().optional(),
        barcodeNo: z.string().optional(),
        SampleType: z.string().optional(),
        SampleCollDate: z.string().optional(),
        SampleRcvDate: z.string().optional(),
        ApprovalDate: z.string().optional(),
        ApprovedByDoctorID: z.string().optional(),
        isNABL: z.number().optional(),
        Comments: z.string().optional(),
        observations: z.array(z.object({
          name: z.string().default(''),
          id: z.string().default(''),
          value: z.string().default(''),
          MinValue: z.string().default(''),
          MaxValue: z.string().default(''),
          unit: z.string().default(''),
          method: z.string().optional(),
          observation_time: z.string().optional(),
          impression: z.string().optional(),
          DisplayValue: z.string().optional(),
          isCAP: z.number().optional(),
          isNGSP: z.number().optional(),
          flag: z.string().optional(),
          pastObservation: z.array(z.object({
            value: z.string(),
            date: z.string(),
            MinValue: z.string().optional(),
            MaxValue: z.string().optional(),
          })).optional(),
        })).default([]),
      })).default([]),
      /** Some labs use capital "Investigation" */
      Investigation: z.array(z.object({
        test_name: z.string().optional().default(''),
        test_code: z.string().optional(),
        barcodeNo: z.string().optional(),
        SampleType: z.string().optional(),
        SampleCollDate: z.string().optional(),
        ApprovalDate: z.string().optional(),
        ApprovedByDoctorID: z.string().optional(),
        isNABL: z.number().optional(),
        observations: z.array(z.object({
          name: z.string().default(''),
          id: z.string().default(''),
          value: z.string().default(''),
          MinValue: z.string().default(''),
          MaxValue: z.string().default(''),
          unit: z.string().default(''),
          method: z.string().optional(),
          observation_time: z.string().optional(),
          impression: z.string().optional(),
          isCAP: z.number().optional(),
          isNGSP: z.number().optional(),
          pastObservation: z.array(z.object({
            value: z.string(),
            date: z.string(),
          })).optional(),
        })).default([]),
      })).optional(),
    })).min(1),
  }),
});

export type LabInputBody = z.infer<typeof LabInputBodySchema>;

export interface ReportGenerationResult {
  html?: string;
  pdfBase64?: string;
  overallScore: number;
  overallSeverity: string;
  renderedPages: string[];
  skippedPages: string[];
}
