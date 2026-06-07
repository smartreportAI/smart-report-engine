import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  PDF_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  MONGODB_URI: z.string().min(1),
});

export type RawEnv = z.input<typeof configSchema>;
export type ValidatedEnv = z.output<typeof configSchema>;
