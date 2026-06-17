/**
 * Mapping Database Service — Phase 3
 *
 * Manages three collections:
 *
 *   global_test_mappings  — Master test library (seeded from id-mapping + profile-mapping).
 *                           Admins can add/edit/delete entries via admin dashboard.
 *                           Replaces the hardcoded id-mapping.ts + profile-mapping.ts long-term.
 *
 *   client_test_mappings  — Per-client code overrides. Each client lab can map their own
 *                           internal LIS codes or custom test names to standard names.
 *                           Clients see the global library and can override specific entries.
 *
 *   unmapped_log          — Tracks every test name/ID that couldn't be mapped during report
 *                           generation. Admin uses this to discover and fix missing mappings.
 */

import { getDb } from './connection';
import type { ObjectId } from 'mongodb';

/* ─────────────────────────────────────────────────────────────────────
   Collection names
   ───────────────────────────────────────────────────────────────────── */

const COL_GLOBAL   = 'global_test_mappings';
const COL_CLIENT   = 'client_test_mappings';
const COL_UNMAPPED = 'unmapped_log';

/* ─────────────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────────────── */

export interface GlobalTestMapping {
  _id?: ObjectId;
  /** Standard BioMarker ID (BM0001..BM9999). Null for non-BM tests. */
  biomarkerId: string | null;
  /** Canonical display name used throughout the engine (e.g. "Blood Sugar (Fasting)") */
  standardName: string;
  /** Profile this test belongs to (e.g. "Diabetes Monitoring") */
  profileName: string;
  /** Common alternative names and abbreviations (lowercase, for matching) */
  aliases: string[];
  /** Default unit (informational, not enforced) */
  defaultUnit?: string;
  /** Default reference range (informational, may be overridden per client) */
  defaultRange?: { min?: number; max?: number };
  /** Soft-delete flag. False = inactive, excluded from pipeline. */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientTestMapping {
  _id?: ObjectId;
  tenantId: string;
  /** The code the client's LIS sends in the observationId field */
  externalCode: string;
  /** Optional: the name the LIS sends, used as display fallback in logs */
  externalDisplay?: string;
  /** Maps to this canonical standard name */
  internalStandardName: string;
  /** Optional: override which profile this goes into (defaults to global) */
  internalProfileName?: string;
  /** Optional: override the unit */
  unitOverride?: string;
  /** Optional: override the reference range */
  rangeOverride?: { min?: number; max?: number };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface UnmappedLogEntry {
  _id?: ObjectId;
  tenantId: string;
  /** The raw observationId that was sent */
  observationId?: string;
  /** The testName that was sent */
  testName: string;
  /** Number of times this has been seen */
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}

/* ─────────────────────────────────────────────────────────────────────
   Index Bootstrap
   Call once at app startup to ensure indexes exist.
   ───────────────────────────────────────────────────────────────────── */

export async function ensureMappingIndexes(): Promise<void> {
  const db = await getDb();

  // global_test_mappings
  await db.collection(COL_GLOBAL).createIndexes([
    { key: { biomarkerId: 1 }, unique: true, sparse: true, background: true },
    { key: { standardName: 1 }, unique: true, background: true },
    { key: { aliases: 1 }, background: true },
    { key: { profileName: 1 }, background: true },
    { key: { isActive: 1 }, background: true },
  ]);

  // client_test_mappings
  await db.collection(COL_CLIENT).createIndexes([
    { key: { tenantId: 1, externalCode: 1 }, unique: true, background: true },
    { key: { tenantId: 1, isActive: 1 }, background: true },
  ]);

  // unmapped_log
  await db.collection(COL_UNMAPPED).createIndexes([
    { key: { tenantId: 1, testName: 1 }, unique: true, background: true },
    { key: { lastSeen: -1 }, background: true },
    { key: { tenantId: 1 }, background: true },
  ]);
}

/* ─────────────────────────────────────────────────────────────────────
   Global Mapping Operations
   ───────────────────────────────────────────────────────────────────── */

/** Get all active global mappings. Used to seed the in-memory cache. */
export async function getAllGlobalMappings(): Promise<GlobalTestMapping[]> {
  const db = await getDb();
  return db.collection<GlobalTestMapping>(COL_GLOBAL)
    .find({ isActive: true })
    .toArray();
}

/** Get one global mapping by BM ID. */
export async function getGlobalMappingById(biomarkerId: string): Promise<GlobalTestMapping | null> {
  const db = await getDb();
  return db.collection<GlobalTestMapping>(COL_GLOBAL).findOne({ biomarkerId, isActive: true });
}

/** Get one global mapping by standard name (case-insensitive). */
export async function getGlobalMappingByName(standardName: string): Promise<GlobalTestMapping | null> {
  const db = await getDb();
  return db.collection<GlobalTestMapping>(COL_GLOBAL).findOne({
    standardName: { $regex: new RegExp(`^${standardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    isActive: true,
  });
}

/** List all global mappings with optional profile filter and search (for admin UI). */
export async function listGlobalMappings(options?: {
  profileName?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: GlobalTestMapping[]; total: number }> {
  const db = await getDb();
  const { profileName, search, page = 1, limit = 50 } = options || {};

  const filter: Record<string, unknown> = { isActive: true };
  if (profileName) filter.profileName = profileName;
  if (search) {
    filter.$or = [
      { standardName: { $regex: search, $options: 'i' } },
      { biomarkerId: { $regex: search, $options: 'i' } },
      { aliases: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    db.collection<GlobalTestMapping>(COL_GLOBAL)
      .find(filter)
      .sort({ profileName: 1, standardName: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    db.collection(COL_GLOBAL).countDocuments(filter),
  ]);

  return { items, total };
}

/** Create or update a global mapping. Upsert by standardName. */
export async function upsertGlobalMapping(entry: Omit<GlobalTestMapping, '_id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db.collection(COL_GLOBAL).updateOne(
    { standardName: entry.standardName },
    {
      $set: { ...entry, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

/** Soft-delete a global mapping. */
export async function deactivateGlobalMapping(standardName: string): Promise<void> {
  const db = await getDb();
  await db.collection(COL_GLOBAL).updateOne(
    { standardName },
    { $set: { isActive: false, updatedAt: new Date() } },
  );
}

/** Get all distinct profile names (for filter dropdowns in admin UI). */
export async function getGlobalProfileNames(): Promise<string[]> {
  const db = await getDb();
  const result = await db.collection(COL_GLOBAL).distinct('profileName', { isActive: true });
  return (result as string[]).sort();
}

/* ─────────────────────────────────────────────────────────────────────
   Client Mapping Operations
   ───────────────────────────────────────────────────────────────────── */

/** Get all active client mappings for a tenant. */
export async function getClientMappings(tenantId: string): Promise<ClientTestMapping[]> {
  const db = await getDb();
  return db.collection<ClientTestMapping>(COL_CLIENT)
    .find({ tenantId, isActive: true })
    .sort({ externalCode: 1 })
    .toArray();
}

/** Get one client mapping by externalCode for a tenant. */
export async function getClientMapping(tenantId: string, externalCode: string): Promise<ClientTestMapping | null> {
  const db = await getDb();
  return db.collection<ClientTestMapping>(COL_CLIENT).findOne({ tenantId, externalCode, isActive: true });
}

/**
 * Create or update a client mapping.
 * Upsert by (tenantId, externalCode).
 */
export async function upsertClientMapping(
  tenantId: string,
  entry: Omit<ClientTestMapping, '_id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  createdBy?: string,
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db.collection(COL_CLIENT).updateOne(
    { tenantId, externalCode: entry.externalCode },
    {
      $set: { ...entry, tenantId, updatedAt: now },
      $setOnInsert: { createdAt: now, createdBy: createdBy || 'system' },
    },
    { upsert: true },
  );
}

/** Soft-delete a client mapping. */
export async function deactivateClientMapping(tenantId: string, externalCode: string): Promise<void> {
  const db = await getDb();
  await db.collection(COL_CLIENT).updateOne(
    { tenantId, externalCode },
    { $set: { isActive: false, updatedAt: new Date() } },
  );
}

/**
 * Build the idMappingOverrides record for a tenant.
 * Returns { externalCode → internalStandardName } — compatible with runMappingPipeline().
 */
export async function buildClientIdOverrides(tenantId: string): Promise<Record<string, string>> {
  const mappings = await getClientMappings(tenantId);
  const overrides: Record<string, string> = {};
  for (const m of mappings) {
    overrides[m.externalCode] = m.internalStandardName;
  }
  return overrides;
}

/**
 * Build the profileMappingOverrides record for a tenant.
 * Returns { standardName → profileName } — only for entries with internalProfileName override.
 */
export async function buildClientProfileOverrides(tenantId: string): Promise<Record<string, string>> {
  const mappings = await getClientMappings(tenantId);
  const overrides: Record<string, string> = {};
  for (const m of mappings) {
    if (m.internalProfileName) {
      overrides[m.internalStandardName] = m.internalProfileName;
    }
  }
  return overrides;
}

/* ─────────────────────────────────────────────────────────────────────
   Unmapped Log Operations
   ───────────────────────────────────────────────────────────────────── */

/**
 * Record an unmapped parameter (fire-and-forget).
 * Upserts by (tenantId, testName) — increments count on repeat occurrences.
 */
export async function logUnmappedParameter(
  tenantId: string,
  testName: string,
  observationId?: string,
): Promise<void> {
  try {
    const db = await getDb();
    const now = new Date();
    await db.collection(COL_UNMAPPED).updateOne(
      { tenantId, testName },
      {
        $inc: { count: 1 },
        $set: { lastSeen: now, observationId },
        $setOnInsert: { firstSeen: now },
      },
      { upsert: true },
    );
  } catch {
    // Silently swallow — unmapped log is non-critical, never block report generation
  }
}

/** List unmapped entries (newest first) — for admin dashboard monitor. */
export async function listUnmappedLog(options?: {
  tenantId?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: UnmappedLogEntry[]; total: number }> {
  const db = await getDb();
  const { tenantId, page = 1, limit = 50 } = options || {};

  const filter: Record<string, unknown> = {};
  if (tenantId) filter.tenantId = tenantId;

  const [items, total] = await Promise.all([
    db.collection<UnmappedLogEntry>(COL_UNMAPPED)
      .find(filter)
      .sort({ lastSeen: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    db.collection(COL_UNMAPPED).countDocuments(filter),
  ]);

  return { items, total };
}

/** Delete an unmapped log entry (after admin has resolved it). */
export async function deleteUnmappedEntry(tenantId: string, testName: string): Promise<void> {
  const db = await getDb();
  await db.collection(COL_UNMAPPED).deleteOne({ tenantId, testName });
}
