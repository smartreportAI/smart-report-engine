/**
 * ============================================================
 *  CENTRALIZED CLIENT CONFIGURATION
 *  src/config/clients.config.ts
 * ============================================================
 *
 *  This is the SINGLE SOURCE OF TRUTH for all client/tenant
 *  configurations. The API and CLI all import CLIENT_REGISTRY from here.
 *
 * ─────────────────────────────────────────────────────────────
 *  HOW TO ONBOARD A NEW CLIENT
 * ─────────────────────────────────────────────────────────────
 *
 *  Step 1 — Add a new named config object below the existing ones.
 *           Give it a descriptive name, e.g. MY_NEW_CLIENT_CONFIG.
 *           Start by spreading DEFAULT_BRANDING and DEFAULT_FLAGS,
 *           then override only what is different for this client:
 *
 *    const MY_NEW_CLIENT_CONFIG: TenantConfig = {
 *      tenantId:   'my-new-client',          // unique slug, lowercase-kebab
 *      reportType: 'inDepth',                // 'inDepth' | 'essential'
 *      pageOrder:  INDEPTH_PAGE_ORDER,       // or ESSENTIAL_PAGE_ORDER
 *      ...DEFAULT_FLAGS,                     // profileContinuation, strictMapping
 *      branding: {
 *        ...DEFAULT_BRANDING,                // inherit all visual defaults
 *        labName:      'My New Client Lab',  // override what differs
 *        logoUrl:      'https://cdn.example.com/my-new-client/logo.png',
 *        primaryColor: '#123456',
 *        footerText:   'My New Client — Health Reports',
 *        contactEmail: 'reports@mynewclient.com',
 *      },
 *    };
 *
 *  Step 2 — Register it in CLIENT_REGISTRY at the bottom of this file:
 *
 *    'my-new-client': MY_NEW_CLIENT_CONFIG,
 *
 *  Step 3 — That's it. No other file needs to be touched.
 *           The client is immediately available on:
 *             POST /reports/generate  { "tenantId": "my-new-client", … }
 *             GET  /tenants/my-new-client
 *             CLI: npx tsx src/cli/generate.ts examples/sample.json --tenant my-new-client
 *
 * ─────────────────────────────────────────────────────────────
 *  AVAILABLE FLAGS (all optional — defaults apply when absent)
 * ─────────────────────────────────────────────────────────────
 *
 *  Top-level (TenantConfig):
 *    reportType          'inDepth' | 'essential'
 *                        Determines which feature set is available.
 *
 *    pageOrder           string[]
 *                        Controls which pages appear and in what order.
 *                        See INDEPTH_PAGE_ORDER / ESSENTIAL_PAGE_ORDER below.
 *                        Remove a page name to disable that page entirely.
 *
 *    profileContinuation boolean (default: false)
 *                        false → each profile renders on its own page
 *                                (hard page-break between profiles).
 *                        true  → all profiles flow continuously in one
 *                                wrapper (no forced page-break between them).
 *
 *    strictMapping       boolean (default: false)
 *                        false → unmapped parameters pass through as-is.
 *                        true  → unmapped parameters throw an error
 *                                (good for strictly controlled lab integrations).
 *
 *    idMappingOverrides  Record<string, string> (optional)
 *                        Client-specific ID overrides. Takes priority over defaults.
 *                        Use when a client's LIS sends different observation IDs.
 *                        Example: { "CLIENT_001": "Total Cholesterol" }
 *
 *    profileMappingOverrides  Record<string, string> (optional)
 *                        Client-specific profile grouping overrides.
 *                        Use when a client wants tests in different profiles.
 *                        Example: { "Uric Acid": "Kidney Profile" }
 *
 *
 *  Branding (TenantBrandingConfig):
 *    labName             string   — Lab / business name in header & footer.
 *    logoUrl             string   — Logo image URL.
 *    primaryColor        hex      — Main brand color (header, accents).
 *    secondaryColor      hex      — Secondary color.
 *    coverColor          hex      — Cover page background (falls back to primaryColor).
 *    accentHealthy       hex      — Color for "Normal" result badges.
 *    accentMonitor       hex      — Color for "Monitor" result badges.
 *    accentAttention     hex      — Color for "Attention/Critical" result badges.
 *    footerText          string   — Custom footer label (falls back to labName).
 *    contactEmail        string   — Contact email shown on cover / footer.
 *    contactPhone        string   — Contact phone.
 *    showPoweredBy       boolean  — Show "Powered by Smart Health Engine" badge.
 *    fontFamilyHeading   string   — Google Font for headings (e.g. "Outfit").
 *    fontFamilyBody      string   — Google Font for body text (e.g. "Inter").
 *    headerHeight        string   — Header height e.g. "80px" or "25mm".
 *    headerMargin        string   — Gap below header e.g. "20px".
 *    footerHeight        string   — Footer height.
 *    footerMargin        string   — Gap above footer.
 *
 * ============================================================
 */

import type { TenantConfig } from '../modules/tenants/tenant.types';

/* ============================================================
   DEFAULT PAGE ORDERS
   Remove a page name inside a client config to disable that page.
   ============================================================ */

export const INDEPTH_PAGE_ORDER = [
  'indepth-cover',
  'indepth-how-to-read',
  'indepth-summary',
  'indepth-detail',
  'indepth-recommendations',
  'indepth-back',
] as const;

export const ESSENTIAL_PAGE_ORDER = [
  'cover',
  'summary',
  'bloodPanel',
  'recommendations',
] as const;

/* ============================================================
   DEFAULT FLAGS
   Spread these into every client config, then override as needed.
   ============================================================ */

const DEFAULT_FLAGS = {
  /** false = each profile on its own page. true = profiles flow continuously. */
  profileContinuation: false,
  /** false = unmapped parameters pass through. true = throw on unmapped params. */
  strictMapping: false,
} as const;

/* ============================================================
   DEFAULT BRANDING
   Visual baseline. Clients override only what differs.
   ============================================================ */

const DEFAULT_BRANDING = {
  logoUrl:        'https://cdn.example.com/demo/logo.png',
  primaryColor:   '#4F46E5',
  secondaryColor: '#0EA5E9',
  accentHealthy:  '#16A34A',
  accentMonitor:  '#D97706',
  accentAttention:'#DC2626',
  showPoweredBy:  true,
  headerMargin:   '20px',
} as const;

/* ============================================================
   CLIENT CONFIGS
   ─────────────────────────────────────────────────────────────
   ADD NEW CLIENTS BELOW THIS LINE.
   Each config spreads the defaults and overrides only what's
   specific to that client.
   ============================================================ */

// ── Demo client (Smart Health Labs) ──────────────────────────
const DEMO_CONFIG: TenantConfig = {
  tenantId:   'demo',
  reportType: 'inDepth',
  pageOrder:  [...INDEPTH_PAGE_ORDER],
  ...DEFAULT_FLAGS,
  branding: {
    ...DEFAULT_BRANDING,
    primaryColor:  '#16A34A',
    labName:      'Sai Health Labs',
    logoUrl:      'https://cdn.example.com/demo/logo.png',
    footerText:   'Smart Health Labs — Intelligent Diagnostics',
    contactEmail: 'reports@smarthealthlabs.com',
  },
};

// ── Tenant Alpha (Alpha Diagnostics — essential tier) ─────────
const TENANT_ALPHA_CONFIG: TenantConfig = {
  tenantId:   'tenant-alpha',
  reportType: 'essential',
  pageOrder:  [...ESSENTIAL_PAGE_ORDER],
  ...DEFAULT_FLAGS,
  branding: {
    ...DEFAULT_BRANDING,
    labName:       'Alpha Diagnostics',
    logoUrl:       'https://cdn.example.com/alpha/logo.png',
    primaryColor:  '#1A73E8',
    secondaryColor: undefined,
    footerText:    'Alpha Diagnostics Pvt. Ltd.',
    headerMargin:  '40px',
    showPoweredBy: false,
  },
};

// ── Tenant Beta (NexaHealth Analytics — inDepth tier) ─────────
const TENANT_BETA_CONFIG: TenantConfig = {
  tenantId:   'tenant-beta',
  reportType: 'inDepth',
  pageOrder:  [...INDEPTH_PAGE_ORDER],
  ...DEFAULT_FLAGS,
  branding: {
    ...DEFAULT_BRANDING,
    labName:        'NexaHealth Analytics',
    logoUrl:        '',
    primaryColor:   '#2D4A9A',
    secondaryColor: '#20BFDD',
    accentHealthy:  '#388E3C',
    footerText:     'NexaHealth Analytics — Smart Health Insights',
    headerHeight:   '80px',
    headerMargin:   '20px',
    contactEmail:   'reports@nexahealth.com',
  },
};

/*
 * ─────────────────────────────────────────────────────────────
 *  ↓ ADD YOUR NEW CLIENT CONFIG ABOVE, THEN REGISTER IT HERE ↓
 * ─────────────────────────────────────────────────────────────
 */

/* ============================================================
   CLIENT REGISTRY  ← the only export consumed by routes & CLI
   ============================================================ */

export const CLIENT_REGISTRY: Record<string, TenantConfig> = {
  'demo':          DEMO_CONFIG,
  'tenant-alpha':  TENANT_ALPHA_CONFIG,
  'tenant-beta':   TENANT_BETA_CONFIG,
};
