/**
 * MongoDB Connection Service
 *
 * Singleton pattern — connects once, reuses across Lambda invocations.
 * Lambda keeps the connection alive during warm starts.
 */

import { MongoClient, type Db } from 'mongodb';
import { config } from '../core/config/config.service';

let client: MongoClient | null = null;
let db: Db | null = null;

const DB_NAME = 'smart_report_engine';

/**
 * Get database connection. Creates connection on first call, reuses after.
 */
export async function getDb(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(config.mongodbUri);
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
