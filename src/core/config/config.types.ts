export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  pdfTimeoutMs?: number;
  mongodbUri: string;
}
