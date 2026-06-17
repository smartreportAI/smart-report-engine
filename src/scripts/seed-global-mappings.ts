/**
 * Seed Global Mappings Script
 *
 * Imports all entries from id-mapping.ts + profile-mapping.ts into
 * the global_test_mappings MongoDB collection using a single bulkWrite.
 *
 * Run once:  npm run seed:mappings
 * Safe to re-run — uses upsert, existing entries are updated not duplicated.
 */

import { DEFAULT_ID_MAPPING } from '../core/test-database/id-mapping';
import { DEFAULT_PROFILE_MAPPING } from '../core/test-database/profile-mapping';
import { NAME_ALIASES } from '../core/test-database/name-normalizer';
import { ensureMappingIndexes } from '../database/mapping.service';
import { getDb, closeDb } from '../database/connection';

async function seed(): Promise<void> {
  console.log('🌱 Seeding global_test_mappings collection...\n');

  // Build alias reverse index: standardName.lowercase → [alias, ...]
  const aliasIndex = new Map<string, string[]>();
  for (const [alias, standardName] of Object.entries(NAME_ALIASES)) {
    const key = standardName.toLowerCase();
    if (!aliasIndex.has(key)) aliasIndex.set(key, []);
    aliasIndex.get(key)!.push(alias);
  }

  // Build reverse index: standardName → biomarkerId
  const nameToId = new Map<string, string>();
  for (const [bmId, name] of Object.entries(DEFAULT_ID_MAPPING)) {
    nameToId.set(name, bmId);
  }

  // Ensure indexes
  await ensureMappingIndexes();
  console.log('✓ Indexes ensured');

  const db = await getDb();
  const now = new Date();
  const profileCounts: Record<string, number> = {};

  // Build all bulk operations
  type BulkOp = {
    updateOne: {
      filter: Record<string, unknown>;
      update: Record<string, unknown>;
      upsert: boolean;
    };
  };

  const ops: BulkOp[] = [];

  // One document per standard name in profile-mapping
  for (const [standardName, profileName] of Object.entries(DEFAULT_PROFILE_MAPPING)) {
    const biomarkerId = nameToId.get(standardName) || null;
    const aliases = aliasIndex.get(standardName.toLowerCase()) || [];

    ops.push({
      updateOne: {
        filter: { standardName },
        update: {
          $set: { biomarkerId, standardName, profileName, aliases, isActive: true, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      },
    });

    profileCounts[profileName] = (profileCounts[profileName] || 0) + 1;
  }

  // Also add entries in id-mapping NOT in profile-mapping (edge cases)
  for (const [bmId, name] of Object.entries(DEFAULT_ID_MAPPING)) {
    if (!DEFAULT_PROFILE_MAPPING[name]) {
      ops.push({
        updateOne: {
          filter: { standardName: name },
          update: {
            $set: {
              biomarkerId: bmId, standardName: name, profileName: 'Ungrouped',
              aliases: aliasIndex.get(name.toLowerCase()) || [], isActive: true, updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
          },
          upsert: true,
        },
      });
    }
  }

  console.log(`\n⏳ Writing ${ops.length} entries to MongoDB (bulk)...`);

  const result = await db.collection('global_test_mappings').bulkWrite(ops, { ordered: false });

  // Print summary
  console.log('\n─────────────────────────────────────────');
  console.log(`✓ Inserted: ${result.upsertedCount}`);
  console.log(`✓ Updated:  ${result.modifiedCount}`);
  console.log(`✓ Total:    ${ops.length} entries`);
  console.log('\nProfile breakdown:');
  const sorted = Object.entries(profileCounts).sort(([, a], [, b]) => b - a);
  for (const [profile, count] of sorted) {
    console.log(`  ${profile.padEnd(35)} ${count} tests`);
  }
  console.log('─────────────────────────────────────────');
  console.log('\n✅ global_test_mappings is ready.\n');
  console.log('Next step: npm run seed:mappings  (safe to re-run anytime)\n');
}

seed()
  .catch((err) => {
    console.error('✗ Seeding failed:', err);
    process.exit(1);
  })
  .finally(() => closeDb());
