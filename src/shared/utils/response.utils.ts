import type { ApiResponse, ApiError } from '../types';

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(code: string, message: string): ApiError {
  return {
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString(),
  };
}
