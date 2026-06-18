/**
 * MongoDB Connection Service
 *
 * Singleton pattern — connects once, reuses across requests.
 * Connects to the SAME database as the Report Engine (smart_report_engine).
 */

import { MongoClient, type Db } from 'mongodb';
import { config } from '../config/env.config';

let client: MongoClient | null = null;
let db: Db | null = null;
let connected = false;

const DB_NAME = 'smart_report_engine';

/**
 * Whether the database has successfully connected at least once and the
 * client is still considered usable. Used by the readiness guard so routes
 * can return a clear 503 instead of a generic 500 when the DB is unavailable.
 */
export function isDbConnected(): boolean {
  return connected;
}

/**
 * Get database connection. Creates on first call, reuses after.
 */
export async function getDb(): Promise<Db> {
  if (db) return db;

  /**
   * In development, some local networks (corporate firewalls, antivirus
   * with TLS inspection, certain VPNs) intercept the MongoDB Atlas TLS
   * handshake and present their own certificate, causing ECONNRESET.
   * Relaxing cert validation locally works around this. This is NEVER
   * applied in production.
   */
  const devTlsWorkaround = config.nodeEnv === 'development'
    ? { tls: true, tlsAllowInvalidCertificates: true }
    : {};

  client = new MongoClient(config.mongodbUri, {
    serverSelectionTimeoutMS: 30000,
    ...devTlsWorkaround,
  });

  // Reflect live connectivity so the readiness guard and /health stay accurate.
  client.on('serverHeartbeatSucceeded', () => { connected = true; });
  client.on('serverHeartbeatFailed', () => { connected = false; });
  client.on('close', () => { connected = false; });

  try {
    await client.connect();
    db = client.db(DB_NAME);
    connected = true;
  } catch (err) {
    // Reset so a later call retries a fresh connection instead of reusing a
    // half-initialized client.
    connected = false;
    const failed = client;
    client = null;
    db = null;
    void failed.close().catch(() => {});
    throw err;
  }

  return db;
}

/**
 * Close connection gracefully.
 */
export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    connected = false;
  }
}

/**
 * Check if the database is connected and responsive.
 */
export async function pingDb(): Promise<boolean> {
  try {
    const database = await getDb();
    await database.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
