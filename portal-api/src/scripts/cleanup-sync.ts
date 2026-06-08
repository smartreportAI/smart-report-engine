/**
 * Database Cleanup & Sync Script
 *
 * Removes test data and ensures every client has a corresponding user account.
 * Run: npx tsx src/scripts/cleanup-sync.ts
 */

import { getDb, closeDb } from '../database/connection';
import { COLLECTIONS } from '../database/collections';
import { hashPassword } from '../modules/auth/auth.service';

async function main() {
  const db = await getDb();
  const clients = db.collection(COLLECTIONS.CLIENTS);
  const users = db.collection(COLLECTIONS.USERS);
  const reports = db.collection(COLLECTIONS.REPORTS);
  const auditLogs = db.collection(COLLECTIONS.AUDIT_LOGS);

  console.log('🧹 Starting database cleanup...\n');

  // ── Step 1: Remove test clients (nexa-labs, apollo-labs) ──
  const testTenants = ['nexa-labs', 'apollo-labs'];

  for (const tenantId of testTenants) {
    const client = await clients.findOne({ tenantId });
    if (client) {
      // Check if they have any reports
      const reportCount = await reports.countDocuments({ tenantId });
      if (reportCount === 0) {
        await clients.deleteOne({ tenantId });
        await users.deleteMany({ tenantId });
        console.log(`  ❌ Deleted test client: ${tenantId} (0 reports)`);
      } else {
        console.log(`  ⚠️  Skipped ${tenantId} — has ${reportCount} reports`);
      }
    }
  }

  // ── Step 2: Remove orphan audit logs for deleted tenants ──
  for (const tenantId of testTenants) {
    const deleted = await auditLogs.deleteMany({ targetTenantId: tenantId });
    if (deleted.deletedCount > 0) {
      console.log(`  🗑️  Removed ${deleted.deletedCount} audit logs for ${tenantId}`);
    }
  }

  // ── Step 3: Ensure every remaining client has a user account ──
  console.log('\n📋 Checking client ↔ user sync...\n');

  const allClients = await clients.find().toArray();

  for (const client of allClients) {
    const hasUser = await users.findOne({ tenantId: client.tenantId, role: 'client' });

    if (hasUser) {
      console.log(`  ✅ ${client.tenantId} (${client.labName}) → ${hasUser.email}`);
    } else {
      // Create a default user for this client
      const email = client.contactEmail || `admin@${client.tenantId}.com`;
      const defaultPassword = `${client.tenantId.charAt(0).toUpperCase() + client.tenantId.slice(1)}@2026`;
      const hashedPwd = await hashPassword(defaultPassword);

      const now = new Date();
      await users.insertOne({
        email,
        password: hashedPwd,
        name: `${client.labName} Admin`,
        role: 'client',
        tenantId: client.tenantId,
        isActive: true,
        createdBy: 'system-sync',
        createdAt: now,
        updatedAt: now,
      });

      console.log(`  🆕 Created user for ${client.tenantId}:`);
      console.log(`     Email:    ${email}`);
      console.log(`     Password: ${defaultPassword}`);
    }
  }

  // ── Step 4: Summary ──
  console.log('\n── Final State ──');
  const finalClients = await clients.countDocuments();
  const finalUsers = await users.countDocuments();
  console.log(`  Clients: ${finalClients}`);
  console.log(`  Users:   ${finalUsers}`);

  console.log('\n✅ Cleanup complete.');
  await closeDb();
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
