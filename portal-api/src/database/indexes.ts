/**
 * Database Indexes
 *
 * Creates required indexes on startup. Idempotent — safe to run every time.
 * Ensures fast queries for the most common access patterns.
 */

import { getDb } from './connection';
import { COLLECTIONS } from './collections';

export async function ensureIndexes(): Promise<void> {
  const db = await getDb();

  // ── Users ──
  const users = db.collection(COLLECTIONS.USERS);
  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ tenantId: 1 });
  await users.createIndex({ role: 1 });
  await users.createIndex({ isActive: 1 });

  // ── Clients ──
  const clients = db.collection(COLLECTIONS.CLIENTS);
  await clients.createIndex({ tenantId: 1 }, { unique: true });
  await clients.createIndex({ isLive: 1 });
  await clients.createIndex({ status: 1 });
  await clients.createIndex({ remainingCredits: 1 });
  await clients.createIndex({ subscriptionEndDate: 1 });
  await clients.createIndex({ createdAt: -1 });

  // ── Reports ──
  const reports = db.collection(COLLECTIONS.REPORTS);
  await reports.createIndex({ tenantId: 1, createdAt: -1 });
  await reports.createIndex({ labNo: 1, tenantId: 1 });
  await reports.createIndex({ status: 1 });
  await reports.createIndex({ createdAt: -1 });
  await reports.createIndex({ 'abnormalCount': 1 });

  // ── Audit Logs ──
  const auditLogs = db.collection(COLLECTIONS.AUDIT_LOGS);
  await auditLogs.createIndex({ userId: 1, createdAt: -1 });
  await auditLogs.createIndex({ action: 1 });
  await auditLogs.createIndex({ targetTenantId: 1 });
  await auditLogs.createIndex({ createdAt: -1 });

  // ── Notifications ──
  const notifications = db.collection(COLLECTIONS.NOTIFICATIONS);
  await notifications.createIndex({ userId: 1, isRead: 1, createdAt: -1 });
  await notifications.createIndex({ tenantId: 1, createdAt: -1 });
}
