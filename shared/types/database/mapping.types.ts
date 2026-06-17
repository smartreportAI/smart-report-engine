import type { ObjectId } from 'mongodb';

/**
 * Global Test Mapping
 *
 * One document per standard test name in the system.
 * Seeded from the engine's id-mapping + profile-mapping tables.
 * Admins can add/edit/soft-delete via Portal API.
 *
 * Used by:
 *   - Smart Report Engine (reads, for mapping pipeline)
 *   - Portal API (reads + writes, for admin management)
 */
export interface GlobalTestMapping {
  _id?: ObjectId;
  /** Standard BioMarker ID (BM0001..BM9999). Null for non-BM tests. */
  biomarkerId: string | null;
  /** Canonical display name used throughout the engine */
  standardName: string;
  /** Profile this test belongs to */
  profileName: string;
  /** Common alternative names and abbreviations (all lowercase, for matching) */
  aliases: string[];
  /** Default unit (informational) */
  defaultUnit?: string | null;
  /** Default reference range (informational) */
  defaultRange?: { min?: number; max?: number } | null;
  /** Soft-delete flag — false = inactive, excluded from pipeline */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Client Test Mapping
 *
 * Per-client LIS code overrides. A client lab can map their own
 * internal observation IDs to our standard names.
 *
 * Example: client sends "GLUF" → maps to "Blood Sugar (Fasting)"
 *
 * Used by:
 *   - Smart Report Engine (reads, for client ID override step)
 *   - Portal API (reads + writes, for admin/client management)
 */
export interface ClientTestMapping {
  _id?: ObjectId;
  tenantId: string;
  /** The code the client's LIS sends in the observationId field */
  externalCode: string;
  /** Optional: the name the LIS sends — used for display in admin UI */
  externalDisplay?: string;
  /** Maps to this canonical standard name */
  internalStandardName: string;
  /** Optional: override which profile this goes into */
  internalProfileName?: string;
  /** Optional: override the unit for this client */
  unitOverride?: string;
  /** Optional: override the reference range for this client */
  rangeOverride?: { min?: number; max?: number };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Who created this override (userId) */
  createdBy?: string;
}

/**
 * Unmapped Log Entry
 *
 * Records every test name/ID that could not be mapped during report
 * generation. Admins use this to discover gaps and fix mappings.
 *
 * Upserted per (tenantId, testName) — count increments on each miss.
 *
 * Used by:
 *   - Smart Report Engine (writes, fire-and-forget after pipeline)
 *   - Portal API (reads + deletes, for admin unmapped monitor)
 */
export interface UnmappedLogEntry {
  _id?: ObjectId;
  tenantId: string;
  /** The raw observationId that was sent (may equal testName for portal/AI input) */
  observationId?: string;
  /** The testName that was sent */
  testName: string;
  /** Number of times this combination has been seen */
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}
