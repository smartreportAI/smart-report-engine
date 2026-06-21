/**
 * MongoDB Connection Service
 *
 * Singleton pattern — connects once, reuses across Lambda invocations.
 * Lambda keeps the connection alive during warm starts.
 *
 * Pre-warm: On Lambda, we kick off the connection at module load time
 * so it's ready before the first request arrives. Non-blocking — errors
 * are handled gracefully by getDb() on first call.
 */

import { MongoClient, type Db } from 'mongodb';
import { config } from '../core/config/config.service';

let client: MongoClient | null = null;
let db: Db | null = null;

const DB_NAME = 'smart_report_engine';
const IS_LAMBDA = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

/**
 * Get database connection. Creates connection on first call, reuses after.
 */
export async function getDb(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(config.mongodbUri, {
    // Optimized for Lambda: shorter timeouts, no keep-alive overhead
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: IS_LAMBDA ? 1 : 10, // Lambda: 1 connection is enough
    minPoolSize: 0,
  });
  await client.connect();
  db = client.db(DB_NAME);

  return db;
}

/**
 * Close connection (for graceful shutdown in dev server).
 */
export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

// ─── Lambda pre-warm ──────────────────────────────────────────────────────────
// On Lambda, kick off MongoDB connection in the background at module load.
// By the time the first request arrives, the connection is already established.
// This eliminates the ~1.5s connection delay from the critical request path.
if (IS_LAMBDA) {
  getDb().catch(() => {
    // Pre-warm failure is silent — getDb() will retry on the actual request
  });
}
