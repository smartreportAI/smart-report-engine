/**
 * User Schema
 *
 * Users can be:
 *   - superadmin: Full access to everything (you, the system owner)
 *   - admin: Can manage clients, view all reports, add credits
 *   - client: Can only see their own data (scoped by tenantId)
 *   - lab_staff: Future — lab-level read-only users under a client
 *
 * Design decisions:
 *   - Email is unique across all users (login identifier)
 *   - Client users MUST have a tenantId (links them to a client/lab)
 *   - Admin/superadmin have tenantId = null (they see everything)
 *   - Password is bcrypt hashed (never stored plain)
 *   - Refresh token is stored hashed (prevents DB leak → token theft)
 *   - lastLoginAt tracks activity (useful for dormant account cleanup)
 *   - isActive lets you disable a user without deleting (reversible)
 */

import type { ObjectId } from 'mongodb';

export type UserRole = 'superadmin' | 'admin' | 'client' | 'lab_staff';

export interface UserDocument {
  _id?: ObjectId;

  // Identity
  email: string;                  // unique, lowercase, trimmed
  password: string;               // bcrypt hash
  name: string;                   // display name
  phone?: string;                 // optional contact number

  // Role & Access
  role: UserRole;
  tenantId: string | null;        // null for admin/superadmin, set for client/lab_staff
  permissions?: string[];         // future: fine-grained permissions

  // Status
  isActive: boolean;
  emailVerified?: boolean;        // future: email verification flow
  lastLoginAt?: Date;
  loginCount?: number;

  // Auth tokens
  refreshToken?: string;          // hashed refresh token (for rotation)

  // Metadata
  createdBy?: string;             // userId of who created this user
  createdAt: Date;
  updatedAt: Date;
}
