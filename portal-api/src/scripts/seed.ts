/**
 * Seed Script
 *
 * Creates the initial superadmin user if no users exist in the database.
 * Run automatically on first server startup, or manually via `npm run seed`.
 *
 * Default credentials (CHANGE IN PRODUCTION):
 *   Email: admin@smartreport.com
 *   Password: Admin@123456
 */

import { getDb } from '../database/connection';
import { COLLECTIONS } from '../database/collections';
import { hashPassword } from '../modules/auth/auth.service';
import type { UserDocument } from '../database/schemas/user.schema';

const DEFAULT_ADMIN = {
  email: 'admin@smartreport.com',
  password: 'Admin@123456',
  name: 'System Admin',
  role: 'superadmin' as const,
};

/**
 * Seeds a superadmin user if no users exist in the database.
 * Safe to call every time — idempotent.
 */
export async function seedSuperAdmin(): Promise<void> {
  const db = await getDb();
  const users = db.collection<UserDocument>(COLLECTIONS.USERS);

  const count = await users.countDocuments();
  if (count > 0) {
    // Users already exist — skip seeding
    return;
  }

  console.log('🌱 No users found. Seeding default superadmin...');

  const now = new Date();
  const hashedPwd = await hashPassword(DEFAULT_ADMIN.password);

  await users.insertOne({
    email: DEFAULT_ADMIN.email,
    password: hashedPwd,
    name: DEFAULT_ADMIN.name,
    role: DEFAULT_ADMIN.role,
    tenantId: null,
    isActive: true,
    loginCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  console.log('✅ Superadmin created:');
  console.log(`   Email:    ${DEFAULT_ADMIN.email}`);
  console.log(`   Password: ${DEFAULT_ADMIN.password}`);
  console.log('   ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
}

/* ---------------------------------------------------------------
   Direct CLI execution: npm run seed
   --------------------------------------------------------------- */

const isDirectRun = process.argv[1]?.includes('seed');
if (isDirectRun) {
  seedSuperAdmin()
    .then(() => {
      console.log('Seed complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
