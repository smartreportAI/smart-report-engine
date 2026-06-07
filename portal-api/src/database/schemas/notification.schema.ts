/**
 * Notification Schema
 *
 * In-app notifications for both admin and client users.
 * Displayed in the frontend dashboard bell icon / notification panel.
 *
 * Design decisions:
 *   - type categorizes the notification for icon/color selection
 *   - userId targets a specific user (null = broadcast to all of a role)
 *   - tenantId scopes notifications to a client's users
 *   - isRead tracks whether the user has seen it
 *   - actionUrl provides a deep-link (e.g., "Go to client detail page")
 *
 * Examples:
 *   - "Client X credits below 100" → type: 'credits_low', to all admins
 *   - "Report generation failed for lab RHH123" → type: 'report_failed'
 *   - "Your credits are running low (50 remaining)" → type: 'credits_low', to client
 *   - "New unmapped parameter detected: BM1249" → type: 'unmapped_param'
 */

import type { ObjectId } from 'mongodb';

export type NotificationType =
  | 'credits_low'
  | 'credits_exhausted'
  | 'report_failed'
  | 'report_generated'
  | 'unmapped_param'
  | 'client_onboarded'
  | 'client_disabled'
  | 'webhook_failed'
  | 'system'
  | 'info';


export interface NotificationDocument {
  _id?: ObjectId;

  // Target
  userId?: string;                // specific user (null = role-based broadcast)
  tenantId?: string;              // scope to client's users
  targetRole?: string;            // 'admin' | 'client' — for role-based broadcast

  // Content
  type: NotificationType;
  title: string;                  // short headline: "Credits Low"
  message: string;                // detail: "Rajagiri Hospital has 45 credits remaining"
  actionUrl?: string;             // deep-link: "/admin/clients/rajagiri"

  // Status
  isRead: boolean;

  // Metadata
  createdAt: Date;
}
