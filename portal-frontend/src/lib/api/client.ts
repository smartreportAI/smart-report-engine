"use client";

/**
 * API Client — Handles all HTTP requests to the Portal API.
 * 
 * Features:
 * - Automatic Bearer token injection
 * - Token refresh on 401
 * - Typed responses
 * - Works with both local dev (localhost:3001) and production (env var)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Token state (in-memory — lost on page refresh, re-populated from login)
let accessToken: string | null = null;
let refreshToken: string | null = null;

// Persist tokens to sessionStorage for page refreshes
function persistTokens() {
  if (typeof window === "undefined") return;
  if (accessToken) sessionStorage.setItem("accessToken", accessToken);
  if (refreshToken) sessionStorage.setItem("refreshToken", refreshToken);
}

function loadTokens() {
  if (typeof window === "undefined") return;
  accessToken = sessionStorage.getItem("accessToken");
  refreshToken = sessionStorage.getItem("refreshToken");
}

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  persistTokens();
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
  }
}

export function getAccessToken(): string | null {
  if (!accessToken) loadTokens();
  return accessToken;
}

export function hasTokens(): boolean {
  if (!accessToken) loadTokens();
  return !!accessToken;
}

// Refresh attempt
async function attemptRefresh(): Promise<boolean> {
  if (!refreshToken) {
    loadTokens();
    if (!refreshToken) return false;
  }

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    accessToken = data.data.accessToken;
    refreshToken = data.data.refreshToken;
    persistTokens();
    return true;
  } catch {
    return false;
  }
}

// API error type
export interface ApiError {
  status: number;
  code: string;
  message: string;
}

/**
 * Main API client function.
 * Handles auth headers, token refresh on 401, and error parsing.
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!accessToken) loadTokens();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle expired token — try refresh
  if (response.status === 401 && refreshToken) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${accessToken}`;
      response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    } else {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw { status: 401, code: "SESSION_EXPIRED", message: "Session expired" } as ApiError;
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw {
      status: response.status,
      code: body?.error?.code || "UNKNOWN_ERROR",
      message: body?.error?.message || "Something went wrong",
    } as ApiError;
  }

  return response.json();
}
