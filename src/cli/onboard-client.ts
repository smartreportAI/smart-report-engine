/**
 * CLI: Onboard New Client
 *
 * Usage:
 *   npm run onboard -- --tenantId rajagiri --labName "Rajagiri Hospital" --credits 5000
 *
 * Optional flags:
 *   --email reports@rajagiri.com
 *   --phone 9876543210
 *   --color #1A73E8
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const DB_NAME = 'smart_report_engine';
const COLLECTION = 'clients';

function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && args[i + 1]) {
      const key = args[i].replace('--', '');
      parsed[key] = args[i + 1];
      i++;
    }
  }
  return parsed;
}

async function main() {
  const args = parseArgs();

  // Required fields
  if (!args.tenantId || !args.labName) {
    console.error('');
    console.error('Usage:');
    console.error('  npm run onboard -- --tenantId <id> --labName "<name>" --credits <number>');
    console.error('');
    console.error('Required:');
    console.error('  --tenantId    Unique client ID (lowercase, no spaces). e.g. "rajagiri"');
    console.error('  --labName     Display name. e.g. "Rajagiri Hospital"');
    console.error('');
    console.error('Optional:');
    console.error('  --credits     Number of report credits (default: 1000)');
    console.error('  --email       Contact email');
    console.error('  --phone       Contact phone');
    console.error('  --color       Primary brand color (default: #4F46E5)');
    console.error('  --logo        Logo URL');
    console.error('  --webhook     Webhook URL (for auto-dispatch after generation)');
    console.error('');
    console.error('Example:');
    console.error('  npm run onboard -- --tenantId rajagiri --labName "Rajagiri Hospital" --credits 5000 --email lab@rajagiri.com');
    process.exit(1);
  }

  const tenantId = args.tenantId.toLowerCase().trim();
  const labName = args.labName.trim();
  const credits = parseInt(args.credits || '1000', 10);
  const email = args.email || '';
  const phone = args.phone || '';
  const color = args.color || '#4F46E5';
  const logo = args.logo || '';
  const webhook = args.webhook || '';

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('✗ MONGODB_URI not set in .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // Check if already exists
    const existing = await db.collection(COLLECTION).findOne({ tenantId });
    if (existing) {
      console.error(`✗ Client "${tenantId}" already exists.`);
      console.error(`  Lab Name: ${existing.labName}`);
      console.error(`  Credits:  ${existing.remainingCredits}/${existing.totalCredits}`);
      process.exit(1);
    }

    // Insert new client
    const now = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const doc = {
      tenantId,
      labName,
      contactEmail: email,
      contactPhone: phone,
      isLive: true,
      liveDate: now,
      expiryDate: oneYearLater,
      totalCredits: credits,
      usedCredits: 0,
      remainingCredits: credits,
      webhookUrl: webhook,
      webhookFormat: 'default',
      payments: [
        { date: now, amount: 0, credits, note: 'Onboarding credits' },
      ],
      reportConfig: {
        reportType: 'inDepth',
        pageOrder: ['indepth-cover', 'indepth-how-to-read', 'indepth-summary', 'indepth-detail', 'indepth-recommendations', 'indepth-back'],
        showCoverPage: true,
        showBackPage: true,
        showRecommendations: true,
        showSummary: true,
        primaryColor: color,
        fontFamily: 'Nunito Sans',
        fontSize: '12px',
        headingColor: '#2A7EC5',
        headerBase64: '',
        footerBase64: '',
        headerHeight: '80px',
        footerHeight: '60px',
        coverPageLink: '',
        backPageLink: '',
        logoUrl: logo,
        footerText: labName,
        showPoweredBy: true,
        idMappingOverrides: {},
        profileMappingOverrides: {},
      },
      totalReports: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(COLLECTION).insertOne(doc);

    console.log('');
    console.log('✓ Client onboarded successfully!');
    console.log('');
    console.log(`  Tenant ID:   ${tenantId}`);
    console.log(`  Lab Name:    ${labName}`);
    console.log(`  Credits:     ${credits}`);
    console.log(`  Expiry:      ${oneYearLater.toLocaleDateString()}`);
    console.log(`  Status:      Live ✓`);
    if (email) console.log(`  Email:       ${email}`);
    if (phone) console.log(`  Phone:       ${phone}`);
    console.log('');
    console.log('Next steps:');
    console.log(`  1. Add "${tenantId}" to CLIENT_REGISTRY in src/config/clients.config.ts`);
    console.log(`  2. Add client-specific ID mapping overrides if needed`);
    console.log(`  3. Test: npm run generate examples/mixed-report.json`);

  } catch (err: any) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
