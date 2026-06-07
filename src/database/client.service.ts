/**
 * Client Database Service
 *
 * Manages client/tenant data in MongoDB:
 * - Check if client is live
 * - Check remaining credits
 * - Decrement credits after report generation
 * - Fetch client report config
 */

import { getDb } from './connection';

const COLLECTION = 'clients';

export interface ClientDocument {
  tenantId: string;
  labName: string;
  contactEmail?: string;
  contactPhone?: string;

  // Status
  isLive: boolean;
  liveDate?: Date;
  expiryDate?: Date;

  // Credits
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  payments?: {
    date: Date;
    amount: number;
    credits: number;
    note?: string;
  }[];

  // Report config
  reportConfig?: {
    reportType: string;
    pageOrder: string[];
    showCoverPage: boolean;
    showBackPage: boolean;
    showRecommendations: boolean;
    showSummary: boolean;
    primaryColor: string;
    fontFamily: string;
    fontSize: string;
    headingColor: string;
    headerBase64: string;
    footerBase64: string;
    headerHeight: string;
    footerHeight: string;
    coverPageLink: string;
    backPageLink: string;
    logoUrl: string;
    footerText: string;
    showPoweredBy: boolean;
    idMappingOverrides: Record<string, string>;
    profileMappingOverrides: Record<string, string>;
  };

  // Stats
  totalReports: number;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get client by tenantId. Returns null if not found.
 */
export async function getClient(tenantId: string): Promise<ClientDocument | null> {
  const db = await getDb();
  return db.collection<ClientDocument>(COLLECTION).findOne({ tenantId });
}

/**
 * Check if a client can generate reports (is live + has credits).
 * Returns { allowed, reason }
 */
export async function validateClient(tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
  const client = await getClient(tenantId);

  if (!client) {
    // Client not in DB — allow (use code-level config)
    return { allowed: true };
  }

  if (!client.isLive) {
    return { allowed: false, reason: 'Client is not active.' };
  }

  if (client.expiryDate && new Date() > client.expiryDate) {
    return { allowed: false, reason: 'Client subscription has expired.' };
  }

  if (client.remainingCredits <= 0) {
    return { allowed: false, reason: 'No credits remaining. Please recharge.' };
  }

  return { allowed: true };
}

/**
 * Decrement credits and increment report count after successful generation.
 */
export async function decrementCredits(tenantId: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).updateOne(
    { tenantId },
    {
      $inc: {
        usedCredits: 1,
        remainingCredits: -1,
        totalReports: 1,
      },
      $set: {
        updatedAt: new Date(),
      },
    },
  );
}

/**
 * Seed a demo client (for initial setup / testing).
 */
export async function seedDemoClient(): Promise<void> {
  const db = await getDb();
  const existing = await db.collection(COLLECTION).findOne({ tenantId: 'demo' });
  if (existing) return; // Already seeded

  await db.collection(COLLECTION).insertOne({
    tenantId: 'demo',
    labName: 'Sai Health Labs',
    contactEmail: 'reports@smarthealthlabs.com',
    isLive: true,
    liveDate: new Date(),
    expiryDate: new Date('2027-06-07'),
    totalCredits: 1000,
    usedCredits: 0,
    remainingCredits: 1000,
    payments: [
      { date: new Date(), amount: 0, credits: 1000, note: 'Onboarding free credits' },
    ],
    reportConfig: {
      reportType: 'inDepth',
      pageOrder: ['indepth-cover', 'indepth-how-to-read', 'indepth-summary', 'indepth-detail', 'indepth-recommendations', 'indepth-back'],
      showCoverPage: true,
      showBackPage: true,
      showRecommendations: true,
      showSummary: true,
      primaryColor: '#f97407',
      fontFamily: 'Nunito Sans',
      fontSize: '12px',
      headingColor: '#2A7EC5',
      headerBase64: '',
      footerBase64: '',
      headerHeight: '80px',
      footerHeight: '60px',
      coverPageLink: '',
      backPageLink: '',
      logoUrl: 'https://cdn.example.com/demo/logo.png',
      footerText: 'Smart Health Labs — Intelligent Diagnostics',
      showPoweredBy: true,
      idMappingOverrides: {},
      profileMappingOverrides: {},
    },
    totalReports: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
