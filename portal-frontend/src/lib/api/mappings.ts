"use client";

/**
 * Mappings API Layer
 *
 * Typed wrappers + query-key factory for all /admin/mappings/* endpoints
 * (plus the client list used by the picker). Mirrors the shared types,
 * with ObjectId/Date serialized as strings since the API returns JSON.
 */

import { apiClient } from "./client";

/* ---------------------------------------------------------------
   Response envelopes
   --------------------------------------------------------------- */

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface Single<T> {
  success: boolean;
  data: T;
}

/* ---------------------------------------------------------------
   Row types (mirror shared/types/database/mapping.types.ts)
   --------------------------------------------------------------- */

export interface RangeValue {
  min?: number;
  max?: number;
}

export interface GlobalMappingRow {
  _id: string;
  biomarkerId: string | null;
  standardName: string;
  profileName: string;
  aliases: string[];
  defaultUnit?: string | null;
  defaultRange?: RangeValue | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientMappingRow {
  _id: string;
  tenantId: string;
  externalCode: string;
  externalDisplay?: string;
  internalStandardName: string;
  internalProfileName?: string;
  unitOverride?: string;
  rangeOverride?: RangeValue;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface UnmappedRow {
  _id: string;
  tenantId: string;
  observationId?: string;
  testName: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

export interface UnmappedSummaryRow {
  testName: string;
  totalCount: number;
  tenantCount: number;
  tenants: string[];
  lastSeen: string;
}

export interface ClientLite {
  _id: string;
  tenantId: string;
  labName: string;
  isLive?: boolean;
}

/* ---------------------------------------------------------------
   Input types (mirror the zod schemas in mapping.route.ts)
   --------------------------------------------------------------- */

export interface GlobalMappingInput {
  biomarkerId?: string | null;
  standardName: string;
  profileName: string;
  aliases: string[];
  defaultUnit?: string | null;
  defaultRange?: RangeValue | null;
  isActive: boolean;
}

export interface ClientMappingInput {
  externalCode: string;
  externalDisplay?: string;
  internalStandardName: string;
  internalProfileName?: string;
  unitOverride?: string;
  rangeOverride?: RangeValue;
  isActive: boolean;
}

export interface MapGlobalInput {
  standardName: string;
  profileName: string;
  aliases?: string[];
}

export interface MapClientInput {
  internalStandardName: string;
}

/* ---------------------------------------------------------------
   Filter shapes (used in query keys)
   --------------------------------------------------------------- */

export interface GlobalFilters {
  search?: string;
  profileName?: string;
  isActive?: string; // "" | "true" | "false"
  page?: number;
}

export interface ClientFilters {
  search?: string;
  page?: number;
}

export interface ListFilters {
  search?: string;
  page?: number;
}

/* ---------------------------------------------------------------
   Query-key factory — stable keys for cache control
   --------------------------------------------------------------- */

export const mappingKeys = {
  all: ["mappings"] as const,
  global: (f: GlobalFilters) => ["mappings", "global", f] as const,
  globalProfiles: () => ["mappings", "global", "profiles"] as const,
  client: (tenantId: string, f: ClientFilters) =>
    ["mappings", "client", tenantId, f] as const,
  unmappedSummary: () => ["mappings", "unmapped", "summary"] as const,
  unmappedByTenant: (tenantId: string, f: ListFilters) =>
    ["mappings", "unmapped", tenantId, f] as const,
  clientPicker: (search: string) => ["mappings", "client-picker", search] as const,
};

const PLACEHOLDER_TENANT = "_global";
export { PLACEHOLDER_TENANT };

/* ---------------------------------------------------------------
   Query string helper
   --------------------------------------------------------------- */

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) sp.set(k, String(v));
  }
  return sp.toString();
}

/* ---------------------------------------------------------------
   Global mappings
   --------------------------------------------------------------- */

export function fetchGlobalMappings(
  filters: GlobalFilters & { limit?: number }
): Promise<Paginated<GlobalMappingRow>> {
  const query = qs({
    page: filters.page ?? 1,
    limit: filters.limit ?? 25,
    search: filters.search,
    profileName: filters.profileName,
    isActive: filters.isActive,
  });
  return apiClient<Paginated<GlobalMappingRow>>(`/admin/mappings/global?${query}`);
}

export function fetchGlobalProfiles(): Promise<Single<string[]>> {
  return apiClient<Single<string[]>>(`/admin/mappings/global/profiles`);
}

export function upsertGlobalMapping(body: GlobalMappingInput) {
  return apiClient(`/admin/mappings/global`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deactivateGlobalMapping(standardName: string) {
  return apiClient(`/admin/mappings/global/${encodeURIComponent(standardName)}`, {
    method: "DELETE",
  });
}

/* ---------------------------------------------------------------
   Client mappings
   --------------------------------------------------------------- */

export function fetchClientMappings(
  tenantId: string,
  filters: ClientFilters & { limit?: number }
): Promise<Paginated<ClientMappingRow>> {
  const query = qs({
    page: filters.page ?? 1,
    limit: filters.limit ?? 25,
    search: filters.search,
  });
  return apiClient<Paginated<ClientMappingRow>>(
    `/admin/mappings/clients/${encodeURIComponent(tenantId)}?${query}`
  );
}

export function upsertClientMapping(tenantId: string, body: ClientMappingInput) {
  return apiClient(`/admin/mappings/clients/${encodeURIComponent(tenantId)}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteClientMapping(tenantId: string, externalCode: string) {
  return apiClient(
    `/admin/mappings/clients/${encodeURIComponent(tenantId)}/${encodeURIComponent(externalCode)}`,
    { method: "DELETE" }
  );
}

/* ---------------------------------------------------------------
   Unmapped log & monitoring
   --------------------------------------------------------------- */

export function fetchUnmappedSummary(): Promise<Single<UnmappedSummaryRow[]>> {
  return apiClient<Single<UnmappedSummaryRow[]>>(`/admin/mappings/unmapped/summary`);
}

export function fetchUnmappedByTenant(
  tenantId: string,
  filters: ListFilters & { limit?: number }
): Promise<Paginated<UnmappedRow>> {
  const query = qs({
    page: filters.page ?? 1,
    limit: filters.limit ?? 25,
    search: filters.search,
  });
  return apiClient<Paginated<UnmappedRow>>(
    `/admin/mappings/unmapped/${encodeURIComponent(tenantId)}?${query}`
  );
}

export function mapUnmappedToGlobal(
  tenantId: string,
  testName: string,
  body: MapGlobalInput
) {
  return apiClient(
    `/admin/mappings/unmapped/${encodeURIComponent(tenantId)}/${encodeURIComponent(testName)}/map-global`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export function mapUnmappedToClient(
  tenantId: string,
  testName: string,
  body: MapClientInput
) {
  return apiClient(
    `/admin/mappings/unmapped/${encodeURIComponent(tenantId)}/${encodeURIComponent(testName)}/map-client`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export function dismissUnmapped(tenantId: string, testName: string) {
  return apiClient(
    `/admin/mappings/unmapped/${encodeURIComponent(tenantId)}/${encodeURIComponent(testName)}`,
    { method: "DELETE" }
  );
}

export function notifyClientUnmapped(tenantId: string) {
  return apiClient<Single<{ message: string }>>(
    `/admin/mappings/unmapped/${encodeURIComponent(tenantId)}/notify`,
    { method: "POST" }
  );
}

/* ---------------------------------------------------------------
   Client picker source
   --------------------------------------------------------------- */

export function fetchClientsForPicker(search: string): Promise<Paginated<ClientLite>> {
  const query = qs({ page: 1, limit: 50, search });
  return apiClient<Paginated<ClientLite>>(`/admin/clients?${query}`);
}
