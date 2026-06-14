/**
 * Seed Realistic Test Data
 *
 * Populates the database with realistic Indian diagnostic lab data:
 * - 5 clients (labs) with varied plans, subscriptions, credits
 * - 1 user per client (their login)
 * - 25+ reports across clients (realistic patient names, results)
 * - Audit logs for onboarding actions
 *
 * Run: npx tsx src/scripts/seed-test-data.ts
 */

import { getDb, closeDb } from '../database/connection';
import { COLLECTIONS } from '../database/collections';
import { hashPassword } from '../modules/auth/auth.service';

// Realistic Indian lab data
const CLIENTS_DATA = [
  {
    tenantId: 'medall-diagnostics',
    labName: 'Medall Healthcare Pvt. Ltd.',
    contactEmail: 'lab@medall.in',
    contactPhone: '+91-44-4500-1234',
    contactPerson: 'Dr. Priya Venkatesh',
    city: 'Chennai',
    state: 'Tamil Nadu',
    gstNumber: '33AABCM1234F1Z5',
    plan: 'enterprise',
    status: 'active',
    subscriptionStartDate: new Date('2026-04-01'),
    subscriptionEndDate: new Date('2027-04-01'),
    liveDate: new Date('2026-04-05'),
    autoRenew: true,
    isLive: true,
    totalCredits: 25000,
    usedCredits: 3420,
    remainingCredits: 21580,
    payments: [
      { date: new Date('2026-04-01'), amount: 75000, credits: 25000, method: 'bank_transfer', reference: 'NEFT-MED-2026-04', note: 'Annual enterprise plan' },
    ],
    reportConfig: {
      reportType: 'inDepth',
      pageOrder: ['indepth-cover', 'indepth-how-to-read', 'indepth-summary', 'indepth-detail', 'indepth-recommendations', 'indepth-back'],
      profileContinuation: true,
      strictMapping: false,
      webViewer: true,
      branding: { labName: 'Medall Healthcare', primaryColor: '#1A73E8', showPoweredBy: false },
    },
    totalReports: 3420,
    totalFailures: 12,
    lastReportAt: new Date('2026-06-08T08:30:00Z'),
    userEmail: 'admin@medall.in',
    userPassword: 'Medall@2026',
    userName: 'Dr. Priya Venkatesh',
  },
  {
    tenantId: 'thyrocare',
    labName: 'Thyrocare Technologies',
    contactEmail: 'reports@thyrocare.com',
    contactPhone: '+91-22-2765-4321',
    contactPerson: 'Rohit Sharma',
    city: 'Mumbai',
    state: 'Maharashtra',
    gstNumber: '27AABCT5678G1Z2',
    plan: 'pro',
    status: 'active',
    subscriptionStartDate: new Date('2026-05-01'),
    subscriptionEndDate: new Date('2026-11-01'),
    liveDate: new Date('2026-05-10'),
    autoRenew: true,
    isLive: true,
    totalCredits: 10000,
    usedCredits: 1856,
    remainingCredits: 8144,
    payments: [
      { date: new Date('2026-05-01'), amount: 35000, credits: 10000, method: 'upi', reference: 'UPI-THY-050126', note: '6-month pro plan' },
    ],
    reportConfig: {
      reportType: 'inDepth',
      pageOrder: ['indepth-cover', 'indepth-summary', 'indepth-detail', 'indepth-recommendations', 'indepth-back'],
      profileContinuation: false,
      strictMapping: true,
      webViewer: true,
      branding: { labName: 'Thyrocare', primaryColor: '#E91E63', showPoweredBy: true },
    },
    totalReports: 1856,
    totalFailures: 5,
    lastReportAt: new Date('2026-06-08T07:15:00Z'),
    userEmail: 'rohit@thyrocare.com',
    userPassword: 'Thyrocare@2026',
    userName: 'Rohit Sharma',
  },
  {
    tenantId: 'srl-diagnostics',
    labName: 'SRL Diagnostics',
    contactEmail: 'operations@srl.in',
    contactPhone: '+91-11-4567-8901',
    contactPerson: 'Dr. Anita Gupta',
    city: 'New Delhi',
    state: 'Delhi',
    plan: 'pro',
    status: 'trial',
    subscriptionStartDate: new Date('2026-06-01'),
    subscriptionEndDate: new Date('2026-09-01'),
    trialEndDate: new Date('2026-06-15'),
    trialCredits: 100,
    liveDate: null,
    autoRenew: false,
    isLive: true,
    totalCredits: 5100,
    usedCredits: 45,
    remainingCredits: 5055,
    payments: [
      { date: new Date('2026-06-01'), amount: 0, credits: 100, method: 'free', note: 'Trial credits' },
      { date: new Date('2026-06-01'), amount: 18000, credits: 5000, method: 'card', reference: 'CARD-SRL-0601', note: 'Pro plan advance' },
    ],
    reportConfig: {
      reportType: 'inDepth',
      pageOrder: ['indepth-cover', 'indepth-how-to-read', 'indepth-summary', 'indepth-detail', 'indepth-recommendations', 'indepth-back'],
      branding: { labName: 'SRL Diagnostics', primaryColor: '#4CAF50', showPoweredBy: true },
    },
    totalReports: 45,
    totalFailures: 2,
    lastReportAt: new Date('2026-06-07T16:40:00Z'),
    userEmail: 'anita@srl.in',
    userPassword: 'SrlLabs@2026',
    userName: 'Dr. Anita Gupta',
  },
  {
    tenantId: 'neuberg-diagnostics',
    labName: 'Neuberg Diagnostics',
    contactEmail: 'lab@neuberg.in',
    contactPhone: '+91-80-4321-5678',
    contactPerson: 'Vikram Reddy',
    city: 'Bangalore',
    state: 'Karnataka',
    plan: 'starter',
    status: 'active',
    subscriptionStartDate: new Date('2026-05-15'),
    subscriptionEndDate: new Date('2026-06-15'),
    liveDate: new Date('2026-05-18'),
    autoRenew: false,
    isLive: true,
    totalCredits: 500,
    usedCredits: 467,
    remainingCredits: 33,
    payments: [
      { date: new Date('2026-05-15'), amount: 2500, credits: 500, method: 'upi', reference: 'UPI-NEU-051526', note: '1-month starter' },
    ],
    reportConfig: {
      reportType: 'essential',
      pageOrder: ['cover', 'summary', 'bloodPanel', 'recommendations'],
      branding: { labName: 'Neuberg Diagnostics', primaryColor: '#FF5722', showPoweredBy: true },
    },
    totalReports: 467,
    totalFailures: 8,
    lastReportAt: new Date('2026-06-08T06:10:00Z'),
    userEmail: 'vikram@neuberg.in',
    userPassword: 'Neuberg@2026',
    userName: 'Vikram Reddy',
  },
  {
    tenantId: 'vijaya-diagnostics',
    labName: 'Vijaya Diagnostic Centre',
    contactEmail: 'admin@vijayalab.com',
    contactPhone: '+91-40-6789-0123',
    contactPerson: 'Dr. Suresh Kumar',
    city: 'Hyderabad',
    state: 'Telangana',
    plan: 'starter',
    status: 'expired',
    subscriptionStartDate: new Date('2026-03-01'),
    subscriptionEndDate: new Date('2026-05-01'),
    liveDate: new Date('2026-03-05'),
    autoRenew: false,
    isLive: false,
    totalCredits: 1000,
    usedCredits: 1000,
    remainingCredits: 0,
    payments: [
      { date: new Date('2026-03-01'), amount: 5000, credits: 1000, method: 'bank_transfer', reference: 'NEFT-VIJ-0301', note: '2-month starter' },
    ],
    reportConfig: {
      reportType: 'essential',
      pageOrder: ['cover', 'summary', 'bloodPanel', 'recommendations'],
      branding: { labName: 'Vijaya Diagnostics', primaryColor: '#673AB7', showPoweredBy: true },
    },
    totalReports: 1000,
    totalFailures: 3,
    lastReportAt: new Date('2026-04-29T14:20:00Z'),
    userEmail: 'suresh@vijayalab.com',
    userPassword: 'Vijaya@2026',
    userName: 'Dr. Suresh Kumar',
  },
];

// Realistic Indian patient names
const PATIENTS = [
  { name: 'Mrs. Lakshmi Devi', age: 52, gender: 'female', referredBy: 'Dr. Anand Rao' },
  { name: 'Mr. Rajesh Khanna', age: 45, gender: 'male', referredBy: 'Dr. Meena Sharma' },
  { name: 'Mrs. Sunita Patel', age: 38, gender: 'female', referredBy: 'Dr. Rakesh Patel' },
  { name: 'Mr. Arun Kumar Singh', age: 60, gender: 'male', referredBy: 'Dr. Sanjay Verma' },
  { name: 'Ms. Divya Nair', age: 28, gender: 'female', referredBy: 'Dr. Abhijith Menon' },
  { name: 'Mr. Mohammed Ismail', age: 55, gender: 'male', referredBy: 'Dr. Farooq Ahmed' },
  { name: 'Mrs. Geeta Sharma', age: 42, gender: 'female', referredBy: 'Dr. Neha Gupta' },
  { name: 'Mr. Venkatesh Iyer', age: 67, gender: 'male', referredBy: 'Dr. Karthik Subramanian' },
  { name: 'Ms. Anjali Reddy', age: 33, gender: 'female', referredBy: 'Dr. Srinivas Rao' },
  { name: 'Mr. Deepak Chopra', age: 48, gender: 'male', referredBy: 'Dr. Anil Kapoor' },
  { name: 'Mrs. Padma Venkatram', age: 70, gender: 'female', referredBy: 'Dr. Mohan Das' },
  { name: 'Mr. Sunil Gavaskar', age: 56, gender: 'male', referredBy: 'Self' },
  { name: 'Mrs. Revathi Krishnan', age: 44, gender: 'female', referredBy: 'Dr. Ramesh Babu' },
  { name: 'Mr. Harish Chandra', age: 35, gender: 'male', referredBy: 'Dr. Pooja Singh' },
  { name: 'Ms. Preethi Shenoy', age: 29, gender: 'female', referredBy: 'Dr. Vivek Nair' },
];

const PACKAGES = ['Master Health Checkup', 'Comprehensive Metabolic Panel', 'Cardiac Risk Profile', 'Thyroid Complete', 'Diabetes Screening', 'Full Body Checkup', 'Lipid Profile + CBC', 'Renal Function Test'];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  const db = await getDb();
  const clients = db.collection(COLLECTIONS.CLIENTS);
  const users = db.collection(COLLECTIONS.USERS);
  const reports = db.collection(COLLECTIONS.REPORTS);
  const auditLogs = db.collection(COLLECTIONS.AUDIT_LOGS);

  console.log('🌱 Seeding realistic test data...\n');

  // Get admin user ID for audit logs
  const admin = await users.findOne({ role: 'superadmin' });
  const adminId = admin?._id?.toString() || 'system';

  // ── Seed Clients + Users ──
  for (const c of CLIENTS_DATA) {
    const existing = await clients.findOne({ tenantId: c.tenantId });
    if (existing) {
      console.log(`  ⏭️  Skipping ${c.tenantId} (already exists)`);
      continue;
    }

    const now = new Date();
    const { userEmail, userPassword, userName, ...clientData } = c;

    // Create client
    await clients.insertOne({
      ...clientData,
      payments: clientData.payments.map(p => ({ ...p, addedBy: adminId })),
      onboardedBy: adminId,
      notes: null,
      createdAt: clientData.subscriptionStartDate,
      updatedAt: now,
    });
    console.log(`  ✅ Client: ${c.labName} (${c.tenantId})`);

    // Create user
    const existingUser = await users.findOne({ email: userEmail });
    if (!existingUser) {
      const hashedPwd = await hashPassword(userPassword);
      await users.insertOne({
        email: userEmail,
        password: hashedPwd,
        name: userName,
        phone: c.contactPhone,
        role: 'client',
        tenantId: c.tenantId,
        isActive: c.isLive,
        createdBy: adminId,
        createdAt: clientData.subscriptionStartDate,
        updatedAt: now,
      });
      console.log(`     → User: ${userEmail}`);
    }

    // Create audit log
    await auditLogs.insertOne({
      userId: adminId,
      userEmail: 'admin@smartreport.com',
      userRole: 'superadmin',
      action: 'client.create',
      description: `Onboarded new client: ${c.labName} (${c.tenantId})`,
      details: { tenantId: c.tenantId, plan: c.plan, credits: c.totalCredits },
      targetTenantId: c.tenantId,
      createdAt: clientData.subscriptionStartDate,
    });
  }

  // ── Seed Reports ──
  console.log('\n📊 Seeding reports...\n');
  const activeClients = CLIENTS_DATA.filter(c => c.totalReports > 0);

  for (const client of activeClients) {
    // Check how many reports exist for this client
    const existingCount = await reports.countDocuments({ tenantId: client.tenantId });
    const toCreate = Math.min(8, Math.max(0, 8 - existingCount)); // Max 8 sample reports per client

    if (toCreate === 0) {
      console.log(`  ⏭️  ${client.tenantId}: already has ${existingCount} reports`);
      continue;
    }

    for (let i = 0; i < toCreate; i++) {
      const patient = randomFrom(PATIENTS);
      const pkg = randomFrom(PACKAGES);
      const totalParams = randomInt(20, 65);
      const unmappedCount = Math.random() > 0.85 ? randomInt(1, 4) : 0;
      const mappedCount = totalParams - unmappedCount;
      const abnormalCount = randomInt(0, Math.min(12, Math.floor(totalParams * 0.3)));
      const normalCount = mappedCount - abnormalCount;
      const score = Math.max(40, 100 - (abnormalCount * randomInt(4, 8)));
      const severity = score >= 80 ? 'stable' : score >= 60 ? 'monitor' : 'critical';
      const status = Math.random() > 0.95 ? 'failed' : 'completed';
      const labNo = `${client.tenantId.substring(0, 3).toUpperCase()}${new Date().getFullYear()}${String(randomInt(10000, 99999))}${String.fromCharCode(65 + randomInt(0, 25))}`;

      const abnormalParams = [];
      const paramNames = ['Total Cholesterol', 'Triglycerides', 'HbA1c', 'TSH', 'Creatinine', 'Uric Acid', 'SGPT', 'SGOT', 'Haemoglobin', 'WBC Count', 'Platelet Count', 'Fasting Glucose'];
      const profiles = ['Lipid Profile', 'Diabetes Panel', 'Thyroid Profile', 'Kidney Profile', 'Liver Profile', 'CBC'];

      for (let j = 0; j < abnormalCount && j < paramNames.length; j++) {
        abnormalParams.push({
          name: paramNames[j],
          value: randomInt(100, 400),
          unit: ['mg/dL', 'U/L', 'g/dL', 'mIU/L', 'cells/μL'][randomInt(0, 4)],
          min: randomInt(50, 100),
          max: randomInt(150, 250),
          status: Math.random() > 0.7 ? 'critical' : 'high',
          profile: randomFrom(profiles),
        });
      }

      const createdAt = randomDate(
        new Date(client.subscriptionStartDate),
        new Date('2026-06-08')
      );

      await reports.insertOne({
        labNo,
        tenantId: client.tenantId,
        patientName: patient.name,
        age: patient.age,
        gender: patient.gender,
        referredBy: patient.referredBy,
        packageName: pkg,
        totalParameters: totalParams,
        mappedCount,
        unmappedCount,
        unmappedParameters: unmappedCount > 0 ? Array.from({ length: unmappedCount }, (_, k) => `UNKNOWN_PARAM_${k + 1}`) : [],
        normalCount,
        abnormalCount,
        abnormalParameters: abnormalParams,
        overallScore: score,
        overallSeverity: severity,
        pdfSize: randomInt(800000, 2500000),
        status,
        errorMessage: status === 'failed' ? 'PDF generation timed out after 90000ms.' : undefined,
        dispatchStatus: status === 'completed' ? 'sent' : 'none',
        dispatchedAt: status === 'completed' ? new Date(createdAt.getTime() + 5000) : undefined,
        source: randomFrom(['json', 'json', 'json', 'hl7', 'fhir'] as const),
        generationTimeMs: randomInt(3000, 15000),
        createdAt,
      });
    }
    console.log(`  ✅ ${client.tenantId}: ${toCreate} reports created`);
  }

  // ── Summary ──
  const totalClients = await clients.countDocuments();
  const totalUsers = await users.countDocuments();
  const totalReports = await reports.countDocuments();
  const totalAudit = await auditLogs.countDocuments();

  console.log('\n── Final Database State ──');
  console.log(`  Clients:    ${totalClients}`);
  console.log(`  Users:      ${totalUsers}`);
  console.log(`  Reports:    ${totalReports}`);
  console.log(`  Audit Logs: ${totalAudit}`);
  console.log('\n✅ Seed complete!\n');

  console.log('── Login Credentials ──');
  console.log('  Admin:');
  console.log('    admin@smartreport.com / Admin@123456\n');
  console.log('  Client Logins:');
  for (const c of CLIENTS_DATA) {
    console.log(`    ${c.userEmail} / ${c.userPassword}  (${c.labName})`);
  }

  await closeDb();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
