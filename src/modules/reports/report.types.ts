import { z } from 'zod';

/** Supported output formats for a report generation request. */
export const OutputFormatSchema = z.enum(['html', 'pdf']).default('html');
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

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
    age: z.number().int().positive(),
    gender: z.enum(['male', 'female', 'other']),
    profiles: z.array(
      z.object({
        profileName: z.string().min(1),
        parameters: z.array(
          z.object({
            testName: z.string().min(1),
            value: z.union([z.number(), z.string()]),
            unit: z.string().optional(),
            referenceRange: z
              .object({
                min: z.number().optional(),
                max: z.number().optional(),
                text: z.string().optional(),
              })
              .optional(),
          }),
        ),
      }),
    ),
  }),
});

export type GenerateReportBody = z.infer<typeof GenerateReportBodySchema>;

export interface ReportGenerationResult {
  html: string;
  overallScore: number;
  overallSeverity: string;
  renderedPages: string[];
  skippedPages: string[];
}
