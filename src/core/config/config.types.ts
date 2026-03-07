export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  host: string;
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  /** Comma-separated CORS origins (optional). */
  corsOrigin?: string;
  /** Optional default timeout for PDF generation in milliseconds. */
  pdfTimeoutMs?: number;
}
