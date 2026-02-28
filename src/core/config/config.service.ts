import 'dotenv/config';
import { configSchema } from './config.schema';
import type { AppConfig } from './config.types';

function loadConfig(): AppConfig {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    throw new Error(
      `Invalid environment configuration:\n${JSON.stringify(formatted, null, 2)}`,
    );
  }

  const env = result.data;

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    host: env.HOST,
    logLevel: env.LOG_LEVEL,
  };
}

export const config: AppConfig = loadConfig();
