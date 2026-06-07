import 'dotenv/config';
import { z } from 'zod';

/* ---------------------------------------------------------------
   Environment Schema
   --------------------------------------------------------------- */

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

/* ---------------------------------------------------------------
   Load & Validate
   --------------------------------------------------------------- */

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    console.error('❌ Invalid environment configuration:');
    console.error(JSON.stringify(formatted, null, 2));
    process.exit(1);
  }

  return result.data;
}

export const env = loadConfig();

/* ---------------------------------------------------------------
   Typed Config Export
   --------------------------------------------------------------- */

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  mongodbUri: env.MONGODB_URI,
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  corsOrigin: env.CORS_ORIGIN,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
} as const;
