/**
 * Client Config Service
 *
 * Resolves the full tenant configuration by merging:
 *   1. DB config (from MongoDB clients collection) — takes priority
 *   2. Code config (from clients.config.ts) — fallback
 *
 * This allows:
 *   - Updating branding, features, colors without code deploy
 *   - Falling back to code config if client isn't in DB yet
 *   - Code config serves as the "template" for new clients
 */

import { getClient } from '../database';
import type { ClientDocument } from '../database';
import { buildClientIdOverrides, buildClientProfileOverrides } from '../database/mapping.service';
import { CLIENT_REGISTRY } from '../config/clients.config';
import type { TenantConfig } from '../modules/tenants/tenant.types';

export interface ResolvedClientConfig {
  /** The merged tenant config for report generation */
  tenantConfig: TenantConfig;
  /** Where the config came from */
  source: 'db' | 'code' | 'merged';
  /** Webhook URL (only from DB) */
  webhookUrl?: string;
  /** Webhook response format the client expects */
  webhookFormat?: string;
}

/**
 * Resolves tenant config for a given tenantId.
 *
 * Priority: DB config > Code config
 * DB client mapping overrides (client_test_mappings) are merged in on top.
 */
export async function resolveClientConfig(tenantId: string): Promise<ResolvedClientConfig | null> {
  const codeConfig = CLIENT_REGISTRY[tenantId];
  const dbClient = await getClient(tenantId);

  // Case 1: Not in DB, not in code → unknown client
  if (!dbClient && !codeConfig) {
    return null;
  }

  // Load DB-stored client mapping overrides (from client_test_mappings collection)
  // These supplement/override both code-level and DB reportConfig overrides
  let dbIdOverrides: Record<string, string> = {};
  let dbProfileOverrides: Record<string, string> = {};
  try {
    dbIdOverrides = await buildClientIdOverrides(tenantId);
    dbProfileOverrides = await buildClientProfileOverrides(tenantId);
  } catch {
    // DB may not be available (CLI mode) — fall back to code/reportConfig overrides
  }

  // Case 2: Not in DB, only in code → use code config + DB mapping overrides
  if (!dbClient && codeConfig) {
    return {
      tenantConfig: {
        ...codeConfig,
        idMappingOverrides: { ...codeConfig.idMappingOverrides, ...dbIdOverrides },
        profileMappingOverrides: { ...codeConfig.profileMappingOverrides, ...dbProfileOverrides },
      },
      source: 'code',
    };
  }

  // Case 3: In DB but no code config → build from DB
  if (dbClient && !codeConfig) {
    const tenantConfig = buildTenantConfigFromDb(dbClient);
    return {
      tenantConfig: {
        ...tenantConfig,
        idMappingOverrides: { ...(tenantConfig.idMappingOverrides || {}), ...dbIdOverrides },
        profileMappingOverrides: { ...(tenantConfig.profileMappingOverrides || {}), ...dbProfileOverrides },
      },
      source: 'db',
      webhookUrl: (dbClient as any).webhookUrl,
      webhookFormat: (dbClient as any).webhookFormat,
    };
  }

  // Case 4: Both exist → merge (DB overrides code), then layer DB mapping overrides on top
  if (dbClient && codeConfig) {
    const tenantConfig = mergeTenantConfig(codeConfig, dbClient);
    return {
      tenantConfig: {
        ...tenantConfig,
        idMappingOverrides: { ...(tenantConfig.idMappingOverrides || {}), ...dbIdOverrides },
        profileMappingOverrides: { ...(tenantConfig.profileMappingOverrides || {}), ...dbProfileOverrides },
      },
      source: 'merged',
      webhookUrl: (dbClient as any).webhookUrl,
      webhookFormat: (dbClient as any).webhookFormat,
    };
  }

  return null;
}

/**
 * Builds a TenantConfig from a DB client document.
 */
function buildTenantConfigFromDb(dbClient: ClientDocument): TenantConfig {
  const rc = dbClient.reportConfig;

  return {
    tenantId: dbClient.tenantId,
    reportType: (rc?.reportType as any) || 'inDepth',
    pageOrder: rc?.pageOrder || ['indepth-cover', 'indepth-summary', 'indepth-detail', 'indepth-recommendations', 'indepth-back'],
    branding: {
      labName: dbClient.labName,
      logoUrl: rc?.logoUrl || 'https://cdn.example.com/default/logo.png',
      primaryColor: rc?.primaryColor || '#4F46E5',
      footerText: rc?.footerText || dbClient.labName,
      showPoweredBy: rc?.showPoweredBy ?? true,
      headerMargin: rc?.headerHeight || '20px',
    },
    idMappingOverrides: rc?.idMappingOverrides,
    profileMappingOverrides: rc?.profileMappingOverrides,
  };
}

/**
 * Merges code config with DB overrides.
 * DB values take priority where they exist.
 */
function mergeTenantConfig(codeConfig: TenantConfig, dbClient: ClientDocument): TenantConfig {
  const rc = dbClient.reportConfig;

  // If no reportConfig in DB, just use code config with DB mapping overrides
  if (!rc) {
    return {
      ...codeConfig,
      idMappingOverrides: (dbClient as any).idMappingOverrides || codeConfig.idMappingOverrides,
      profileMappingOverrides: (dbClient as any).profileMappingOverrides || codeConfig.profileMappingOverrides,
    };
  }

  // Merge: DB overrides code
  return {
    tenantId: dbClient.tenantId,
    reportType: (rc.reportType as any) || codeConfig.reportType,
    pageOrder: rc.pageOrder || codeConfig.pageOrder,
    branding: {
      labName: dbClient.labName || codeConfig.branding.labName,
      logoUrl: rc.logoUrl || codeConfig.branding.logoUrl,
      primaryColor: rc.primaryColor || codeConfig.branding.primaryColor,
      secondaryColor: codeConfig.branding.secondaryColor,
      coverColor: codeConfig.branding.coverColor,
      accentHealthy: codeConfig.branding.accentHealthy,
      accentMonitor: codeConfig.branding.accentMonitor,
      accentAttention: codeConfig.branding.accentAttention,
      footerText: rc.footerText || codeConfig.branding.footerText,
      contactEmail: dbClient.contactEmail || codeConfig.branding.contactEmail,
      showPoweredBy: rc.showPoweredBy ?? codeConfig.branding.showPoweredBy,
      fontFamilyHeading: codeConfig.branding.fontFamilyHeading,
      fontFamilyBody: codeConfig.branding.fontFamilyBody,
      headerHeight: rc.headerHeight || codeConfig.branding.headerHeight,
      headerMargin: codeConfig.branding.headerMargin,
      footerHeight: rc.footerHeight || codeConfig.branding.footerHeight,
      footerMargin: codeConfig.branding.footerMargin,
    },
    profileContinuation: codeConfig.profileContinuation,
    strictMapping: codeConfig.strictMapping,
    idMappingOverrides: rc.idMappingOverrides || codeConfig.idMappingOverrides,
    profileMappingOverrides: rc.profileMappingOverrides || codeConfig.profileMappingOverrides,
  };
}
