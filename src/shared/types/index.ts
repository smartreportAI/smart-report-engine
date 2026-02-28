/**
 * Shared type utilities used across all modules.
 */

/** Makes every property in T required and non-nullable. */
export type Strict<T> = {
  [K in keyof T]-?: NonNullable<T[K]>;
};

/** Standard API response envelope. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/** Standard API error envelope. */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
  timestamp: string;
}
