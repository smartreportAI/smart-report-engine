export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  host: string;
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  /** Comma-separated CORS origins (optional). */
  corsOrigin?: string;
  /** Optional default timeout for PDF generation in milliseconds. */
  pdfTimeoutMs?: number;
  /**
   * Base URL for the patient mobile viewer (embedded in QR codes).
   * When absent, QR codes are decorative placeholders.
   */
  viewerBaseUrl?: string;
  /** Viewer token TTL in days (default: 90). */
  viewerTokenTtlDays: number;
}
