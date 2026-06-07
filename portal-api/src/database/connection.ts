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

const DB_NAME = 'smart_report_engine';

/**
 * Get database connection. Creates on first call, reuses after.
 */
export async function getDb(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(config.mongodbUri);
  await client.connect();
  db = client.db(DB_NAME);

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
