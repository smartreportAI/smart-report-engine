/**
 * Standard API Response Format
 *
 * All endpoints return this shape for consistency:
 *   Success: { success: true, data: {...}, meta?: {...} }
 *   Error:   { success: false, error: { code, message }, timestamp }
 */

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export function successResponse<T>(data: T, meta?: SuccessResponse['meta']): SuccessResponse<T> {
  return { success: true, data, ...(meta && { meta }) };
}

export function errorResponse(code: string, message: string, details?: unknown): ErrorResponse {
  const error: ErrorResponse['error'] = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  };
}
