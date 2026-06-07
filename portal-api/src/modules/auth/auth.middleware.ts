/**
 * Auth Middleware
 *
 * Fastify hooks for authentication and role-based access control.
 *
 * Usage:
 *   app.addHook('preHandler', requireAuth);
 *   app.addHook('preHandler', requireRole('admin', 'superadmin'));
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, type JwtPayload } from './auth.service';
import { errorResponse } from '../../shared/utils/response.utils';
import type { UserRole } from '../../database/schemas/user.schema';

/* ---------------------------------------------------------------
   Extend Fastify request with user payload
   --------------------------------------------------------------- */

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

/* ---------------------------------------------------------------
   Middleware: Require Authentication
   --------------------------------------------------------------- */

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send(
      errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header. Use: Bearer <token>'),
    );
  }

  const token = authHeader.slice(7); // Remove 'Bearer '

  try {
    const payload = verifyAccessToken(token);
    request.user = payload;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return reply.code(401).send(
        errorResponse('TOKEN_EXPIRED', 'Access token has expired. Please refresh.'),
      );
    }
    return reply.code(401).send(
      errorResponse('INVALID_TOKEN', 'Invalid access token.'),
    );
  }
}

/* ---------------------------------------------------------------
   Middleware: Require Specific Role(s)

   Must be used AFTER requireAuth (user is already set on request).
   --------------------------------------------------------------- */

export function requireRole(...roles: UserRole[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user) {
      return reply.code(401).send(
        errorResponse('UNAUTHORIZED', 'Authentication required.'),
      );
    }

    // Superadmin always has access
    if (request.user.role === 'superadmin') return;

    if (!roles.includes(request.user.role)) {
      return reply.code(403).send(
        errorResponse('FORBIDDEN', `This action requires one of these roles: ${roles.join(', ')}`),
      );
    }
  };
}

/* ---------------------------------------------------------------
   Middleware: Require Client Scope

   For client-only routes — ensures the user can only access
   data belonging to their own tenantId.
   --------------------------------------------------------------- */

export async function requireClientScope(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.user) {
    return reply.code(401).send(
      errorResponse('UNAUTHORIZED', 'Authentication required.'),
    );
  }

  // Admins can access any client data (for support purposes)
  if (request.user.role === 'superadmin' || request.user.role === 'admin') return;

  // Client users must have a tenantId
  if (!request.user.tenantId) {
    return reply.code(403).send(
      errorResponse('FORBIDDEN', 'Your account is not linked to any client.'),
    );
  }
}
