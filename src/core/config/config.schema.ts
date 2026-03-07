import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  /** Comma-separated allowed origins for CORS (e.g. "http://localhost:3000,https://myapp.vercel.app"). Default allows localhost. */
  CORS_ORIGIN: z.string().optional(),
  /**
   * Optional override for PDF generation timeout in milliseconds.
   * If not set, the engine falls back to 30_000ms.
   */
  PDF_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
});

export type RawEnv = z.input<typeof configSchema>;
export type ValidatedEnv = z.output<typeof configSchema>;
