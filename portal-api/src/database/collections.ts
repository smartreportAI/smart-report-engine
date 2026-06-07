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
} as const;
