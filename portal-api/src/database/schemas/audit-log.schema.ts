/**
 * Audit Log Schema
 *
 * Tracks every admin action for accountability and debugging.
 * Immutable — never updated or deleted.
 *
 * Design decisions:
 *   - action is a dot-notation string (e.g., 'client.create', 'client.addCredits')
 *   - details stores action-specific data (flexible object)
 *   - targetTenantId allows filtering "all actions on client X"
 *   - ip captures the request origin (for security audits)
 *
 * Common actions:
 *   - auth.login, auth.logout, auth.password_change
 *   - user.create, user.update, user.disable
 *   - client.create, client.update, client.toggle, client.delete
 *   - client.addCredits, client.updateConfig
 *   - report.regenerate, report.download
 */

import type { ObjectId } from 'mongodb';

export interface AuditLogDocument {
  _id?: ObjectId;

  // Who
  userId: string;                 // ObjectId as string
  userEmail: string;              // denormalized for easy display
  userRole: string;               // role at time of action

  // What
  action: string;                 // e.g., 'client.addCredits'
  description?: string;           // human-readable: "Added 500 credits to rajagiri"
  details?: Record<string, unknown>; // action-specific payload

  // Target
  targetTenantId?: string;        // which client was affected

  // Context
  ip?: string;

  // Time
  createdAt: Date;
}
