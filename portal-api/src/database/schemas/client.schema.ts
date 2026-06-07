/**
 * Client Schema
 *
 * Represents a lab/tenant in the system. This is the SAME collection
 * that the Report Engine reads from. Both projects share this data.
 *
 * ─────────────────────────────────────────────────────────────────
 *  CLIENT LIFECYCLE (Timeline)
 * ─────────────────────────────────────────────────────────────────
 *
 *  1. ONBOARDED (createdAt)
 *     → Admin adds the client to the system
 *     → Client gets initial setup (branding, config, mapping)
 *     → Status: 'onboarding'
 *
 *  2. TRIAL / TESTING (subscriptionStartDate → trialEndDate)
 *     → Client starts testing with sample data
 *     → Free trial credits given (e.g., 50-100 reports)
 *     → Status: 'trial'
 *
 *  3. GOES LIVE (liveDate)
 *     → Testing complete, switched to production
 *     → Real patient data starts flowing
 *     → Status: 'active'
 *
 *  4. SUBSCRIPTION ACTIVE (subscriptionStartDate → subscriptionEndDate)
 *     → Client pays for a package (1 month / 3 months / 6 months / 1 year)
 *     → Credits are usable only within this period
 *     → Status: 'active'
 *
 *  5. SUBSCRIPTION EXPIRED (after subscriptionEndDate)
 *     → Client cannot generate reports
 *     → Must renew to continue
 *     → Status: 'expired'
 *
 *  6. SUSPENDED (admin manually disables)
 *     → Payment dispute, abuse, or admin decision
 *     → Status: 'suspended'
 *
 * ─────────────────────────────────────────────────────────────────
 *  EXAMPLE SCENARIOS
 * ─────────────────────────────────────────────────────────────────
 *
 *  Scenario 1 — Rajagiri Hospital:
 *    createdAt:             May 25, 2026 (admin adds them)
 *    subscriptionStartDate: June 1, 2026 (subscription starts)
 *    trialEndDate:          June 5, 2026 (testing ends)
 *    liveDate:              June 5, 2026 (goes to production)
 *    subscriptionEndDate:   August 1, 2026 (2-month package)
 *    subscriptionDuration:  2 months
 *    credits:               2000 (valid within subscription period)
 *
 *  Scenario 2 — Small Clinic:
 *    createdAt:             June 7, 2026
 *    subscriptionStartDate: June 7, 2026 (immediate start)
 *    trialEndDate:          null (no trial, paid upfront)
 *    liveDate:              June 7, 2026 (immediate live)
 *    subscriptionEndDate:   July 7, 2026 (1-month package)
 *    subscriptionDuration:  1 month
 *    credits:               500
 *
 *  Scenario 3 — Enterprise Hospital:
 *    createdAt:             June 1, 2026
 *    subscriptionStartDate: June 1, 2026
 *    trialEndDate:          June 15, 2026 (2 weeks trial)
 *    liveDate:              June 15, 2026
 *    subscriptionEndDate:   June 1, 2027 (1-year package)
 *    subscriptionDuration:  12 months
 *    credits:               50000 (enterprise)
 *    autoRenew:             true
 *
 * ─────────────────────────────────────────────────────────────────
 *  DESIGN DECISIONS
 * ─────────────────────────────────────────────────────────────────
 *
 *   - tenantId is the unique slug (e.g., 'rajagiri', 'demo')
 *   - Credits are valid ONLY within the subscription period
 *   - subscriptionStartDate = when the paid package begins
 *   - subscriptionEndDate = when the package expires
 *   - liveDate = when real production traffic started (may differ from start)
 *   - trialEndDate = when trial period ends (null if no trial)
 *   - status is COMPUTED from dates + isLive flag:
 *       onboarding → trial → active → expired / suspended
 *   - Report Engine checks: isLive + subscriptionEndDate + remainingCredits
 *
 * For the admin dashboard:
 *   - List all clients with status, credits, subscription remaining days
 *   - See who is expiring soon (7 days, 30 days)
 *   - Drill into a client to see reports, payments, config
 *   - Toggle isLive, add credits, edit config, extend subscription
 *
 * For the client dashboard:
 *   - See their lab info, credits remaining, days until expiry
 *   - Cannot edit config (admin does that)
 *   - Can update contact info (email, phone)
 */

import type { ObjectId } from 'mongodb';

/* ---------------------------------------------------------------
   Enums & Sub-types
   --------------------------------------------------------------- */

export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';
export type ReportType = 'inDepth' | 'essential';
export type ClientStatus = 'onboarding' | 'trial' | 'active' | 'expired' | 'suspended';


export interface PaymentRecord {
  date: Date;
  amount: number;                 // money amount (₹ or $)
  credits: number;                // credits added
  method?: string;                // 'upi', 'bank_transfer', 'cash', 'card', 'free'
  reference?: string;             // payment reference/transaction ID
  invoiceNumber?: string;         // invoice number (if applicable)
  note?: string;                  // e.g., 'Onboarding free credits', 'June 2026 renewal'
  addedBy?: string;               // userId of admin who added
}

export interface BrandingConfig {
  labName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentHealthy?: string;
  accentMonitor?: string;
  accentAttention?: string;
  fontFamilyHeading?: string;
  fontFamilyBody?: string;
  headerHeight?: string;
  headerMargin?: string;
  footerHeight?: string;
  footerMargin?: string;
  footerText?: string;
  contactEmail?: string;
  contactPhone?: string;
  showPoweredBy?: boolean;
}

export interface ReportConfig {
  reportType: ReportType;
  pageOrder: string[];
  profileContinuation?: boolean;
  strictMapping?: boolean;
  webViewer?: boolean;
  branding: BrandingConfig;
  idMappingOverrides?: Record<string, string>;
  profileMappingOverrides?: Record<string, string>;
}

export interface WebhookConfig {
  url: string;
  secret?: string;                // for signature verification
  format?: 'json' | 'multipart';
  enabled: boolean;
  lastDispatchAt?: Date;
  lastDispatchStatus?: 'success' | 'failed';
  failureCount?: number;          // consecutive failures (for alerting)
}

/* ---------------------------------------------------------------
   Main Document
   --------------------------------------------------------------- */

export interface ClientDocument {
  _id?: ObjectId;

  // ─── Identity ───────────────────────────────────────────────
  tenantId: string;               // unique slug (used in API calls)
  labName: string;                // display name
  contactEmail?: string;
  contactPhone?: string;
  contactPerson?: string;         // primary contact person name
  address?: string;               // lab physical address
  city?: string;
  state?: string;
  website?: string;
  gstNumber?: string;             // GST/Tax registration number (for invoicing)

  // ─── Plan & Subscription ───────────────────────────────────
  plan: PlanType;                 // pricing tier
  status: ClientStatus;           // current lifecycle status

  /**
   * When the subscription/package begins.
   * This is when the client's paid period starts.
   * Credits are valid from this date.
   * Example: Client signs up May 25, subscription starts June 1.
   */
  subscriptionStartDate: Date;

  /**
   * When the subscription/package ends.
   * After this date, the client cannot generate reports.
   * Admin can extend this by creating a renewal.
   * Example: 2-month package starting June 1 → ends August 1.
   */
  subscriptionEndDate: Date;

  /**
   * When the free trial period ends.
   * null = no trial (client paid upfront or is on a free plan).
   * During trial, limited credits are available for testing.
   * After trialEndDate, client must have a paid subscription to continue.
   */
  trialEndDate?: Date | null;

  /**
   * Number of free credits given for the trial period.
   * These are included in totalCredits but only usable before trialEndDate.
   * After trial, remaining trial credits may be voided or carried over (admin decision).
   */
  trialCredits?: number;

  /**
   * When the client went live (switched from testing to production).
   * This is typically = trialEndDate or a few days before subscriptionStartDate.
   * null = client hasn't gone live yet (still in onboarding/trial).
   */
  liveDate?: Date | null;

  /**
   * Whether the subscription auto-renews at the end.
   * If true, admin gets notified before expiry to process payment.
   * If false, client must explicitly renew.
   */
  autoRenew?: boolean;

  /**
   * Whether the client is allowed to generate reports RIGHT NOW.
   * This is the master switch — even if subscription is valid,
   * admin can set isLive=false to immediately block report generation.
   * Used for: payment disputes, abuse, manual suspension.
   */
  isLive: boolean;

  /**
   * Who onboarded this client (userId of the admin).
   */
  onboardedBy?: string;

  // ─── Credits ────────────────────────────────────────────────
  totalCredits: number;           // total credits ever assigned
  usedCredits: number;            // credits consumed
  remainingCredits: number;       // totalCredits - usedCredits
  payments: PaymentRecord[];      // full payment/credit history

  // ─── Report Configuration ──────────────────────────────────
  reportConfig: ReportConfig;

  // ─── Webhook ───────────────────────────────────────────────
  webhook?: WebhookConfig;

  // ─── Stats (updated by Report Engine) ──────────────────────
  totalReports: number;
  totalFailures: number;
  lastReportAt?: Date;            // timestamp of last successful report
  lastFailureAt?: Date;           // timestamp of last failed report

  // ─── Metadata ──────────────────────────────────────────────
  notes?: string;                 // internal admin notes about this client
  tags?: string[];                // e.g., ['vip', 'beta-tester', 'hospital', 'clinic']
  createdAt: Date;                // when the client was added to the system
  updatedAt: Date;                // last modification timestamp
}
