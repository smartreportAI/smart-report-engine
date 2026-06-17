/**
 * Collection Names — Single source of truth.
 *
 * These must stay in sync with the Report Engine's collections.
 * Both projects read/write the same MongoDB database.
 */

export const COLLECTIONS = {
  USERS: 'users',
  CLIENTS: 'clients',
  REPORTS: 'reports',
  AUDIT_LOGS: 'audit_logs',
  NOTIFICATIONS: 'notifications',
  // Mapping collections — shared with Smart Report Engine (same DB, same names)
  GLOBAL_MAPPINGS: 'global_test_mappings',
  CLIENT_MAPPINGS: 'client_test_mappings',
  UNMAPPED_LOG: 'unmapped_log',
} as const;
