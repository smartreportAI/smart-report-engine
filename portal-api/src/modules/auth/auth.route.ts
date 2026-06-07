/**
 * Auth Routes
 *
 * POST /auth/register    — Create user (admin/superadmin only)
 * POST /auth/login       — Login → returns JWT tokens
 * POST /auth/refresh     — Refresh expired access token
 * GET  /auth/me          — Get current user info
 * PATCH /auth/change-password — Change own password
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../../database/connection';
import { COLLECTIONS } from '../../database/collections';
import type { UserDocument } from '../../database/schemas/user.schema';
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyRefreshToken,
  verifyRefreshTokenHash,
  hashRefreshToken,
  type JwtPayload,
} from './auth.service';
import { requireAuth, requireRole } from './auth.middleware';
import { successResponse, errorResponse } from '../../shared/utils/response.utils';
import { ObjectId } from 'mongodb';

/* ---------------------------------------------------------------
   Validation Schemas
   --------------------------------------------------------------- */

const RegisterSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100),
  phone: z.string().optional(),
  role: z.enum(['admin', 'client', 'lab_staff']),
  tenantId: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/* ---------------------------------------------------------------
   Routes
   --------------------------------------------------------------- */

export async function authRoutes(app: FastifyInstance): Promise<void> {

  /* ---- POST /auth/register ---- */
  app.post('/auth/register', {
    preHandler: [requireAuth, requireRole('admin', 'superadmin')],
  }, async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(
        errorResponse('VALIDATION_ERROR', 'Invalid input', parsed.error.flatten().fieldErrors),
      );
    }

    const { email, password, name, phone, role, tenantId } = parsed.data;

    // Client/lab_staff users must have a tenantId
    if ((role === 'client' || role === 'lab_staff') && !tenantId) {
      return reply.code(400).send(
        errorResponse('VALIDATION_ERROR', 'tenantId is required for client and lab_staff roles'),
      );
    }

    const db = await getDb();
    const users = db.collection<UserDocument>(COLLECTIONS.USERS);

    // Check if email already exists
    const existing = await users.findOne({ email });
    if (existing) {
      return reply.code(409).send(
        errorResponse('EMAIL_EXISTS', 'A user with this email already exists.'),
      );
    }

    // If client role, verify the client/tenant exists
    if (tenantId) {
      const client = await db.collection(COLLECTIONS.CLIENTS).findOne({ tenantId });
      if (!client) {
        return reply.code(404).send(
          errorResponse('TENANT_NOT_FOUND', `Client with tenantId "${tenantId}" does not exist.`),
        );
      }
    }

    const now = new Date();
    const hashedPwd = await hashPassword(password);

    const userDoc: UserDocument = {
      email,
      password: hashedPwd,
      name,
      phone,
      role,
      tenantId: tenantId ?? null,
      isActive: true,
      loginCount: 0,
      createdBy: request.user!.userId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await users.insertOne(userDoc);

    return reply.code(201).send(successResponse({
      userId: result.insertedId.toString(),
      email,
      name,
      role,
      tenantId: tenantId ?? null,
    }));
  });

  /* ---- POST /auth/login ---- */
  app.post('/auth/login', async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(
        errorResponse('VALIDATION_ERROR', 'Invalid input', parsed.error.flatten().fieldErrors),
      );
    }

    const { email, password } = parsed.data;
    const db = await getDb();
    const users = db.collection<UserDocument>(COLLECTIONS.USERS);

    const user = await users.findOne({ email });
    if (!user) {
      return reply.code(401).send(
        errorResponse('INVALID_CREDENTIALS', 'Invalid email or password.'),
      );
    }

    if (!user.isActive) {
      return reply.code(403).send(
        errorResponse('ACCOUNT_DISABLED', 'Your account has been disabled. Contact admin.'),
      );
    }

    const passwordValid = await verifyPassword(password, user.password);
    if (!passwordValid) {
      return reply.code(401).send(
        errorResponse('INVALID_CREDENTIALS', 'Invalid email or password.'),
      );
    }

    // Generate tokens
    const payload: JwtPayload = {
      userId: user._id!.toString(),
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const tokens = generateTokens(payload);

    // Store hashed refresh token
    const hashedRefresh = await hashRefreshToken(tokens.refreshToken);
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          refreshToken: hashedRefresh,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: { loginCount: 1 },
      },
    );

    return reply.code(200).send(successResponse({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        userId: user._id!.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    }));
  });

  /* ---- POST /auth/refresh ---- */
  app.post('/auth/refresh', async (request, reply) => {
    const parsed = RefreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(
        errorResponse('VALIDATION_ERROR', 'refreshToken is required'),
      );
    }

    const { refreshToken } = parsed.data;

    let tokenPayload: { userId: string };
    try {
      tokenPayload = verifyRefreshToken(refreshToken);
    } catch {
      return reply.code(401).send(
        errorResponse('INVALID_TOKEN', 'Invalid or expired refresh token.'),
      );
    }

    const db = await getDb();
    const users = db.collection<UserDocument>(COLLECTIONS.USERS);

    const user = await users.findOne({ _id: new ObjectId(tokenPayload.userId) });
    if (!user || !user.isActive) {
      return reply.code(401).send(
        errorResponse('INVALID_TOKEN', 'User not found or disabled.'),
      );
    }

    // Verify stored refresh token hash matches
    if (!user.refreshToken) {
      return reply.code(401).send(
        errorResponse('INVALID_TOKEN', 'No refresh token on file. Please login again.'),
      );
    }

    const hashValid = await verifyRefreshTokenHash(refreshToken, user.refreshToken);
    if (!hashValid) {
      return reply.code(401).send(
        errorResponse('INVALID_TOKEN', 'Refresh token mismatch. Please login again.'),
      );
    }

    // Generate new token pair (rotation)
    const payload: JwtPayload = {
      userId: user._id!.toString(),
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const newTokens = generateTokens(payload);
    const newHashedRefresh = await hashRefreshToken(newTokens.refreshToken);

    await users.updateOne(
      { _id: user._id },
      { $set: { refreshToken: newHashedRefresh, updatedAt: new Date() } },
    );

    return reply.code(200).send(successResponse({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    }));
  });

  /* ---- GET /auth/me ---- */
  app.get('/auth/me', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const db = await getDb();
    const users = db.collection<UserDocument>(COLLECTIONS.USERS);

    const user = await users.findOne(
      { _id: new ObjectId(request.user!.userId) },
      { projection: { password: 0, refreshToken: 0 } },
    );

    if (!user) {
      return reply.code(404).send(
        errorResponse('USER_NOT_FOUND', 'User no longer exists.'),
      );
    }

    return reply.code(200).send(successResponse({
      userId: user._id!.toString(),
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      tenantId: user.tenantId,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    }));
  });

  /* ---- PATCH /auth/change-password ---- */
  app.patch('/auth/change-password', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const parsed = ChangePasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(
        errorResponse('VALIDATION_ERROR', 'Invalid input', parsed.error.flatten().fieldErrors),
      );
    }

    const { currentPassword, newPassword } = parsed.data;
    const db = await getDb();
    const users = db.collection<UserDocument>(COLLECTIONS.USERS);

    const user = await users.findOne({ _id: new ObjectId(request.user!.userId) });
    if (!user) {
      return reply.code(404).send(errorResponse('USER_NOT_FOUND', 'User not found.'));
    }

    const currentValid = await verifyPassword(currentPassword, user.password);
    if (!currentValid) {
      return reply.code(401).send(
        errorResponse('INVALID_PASSWORD', 'Current password is incorrect.'),
      );
    }

    const newHash = await hashPassword(newPassword);
    await users.updateOne(
      { _id: user._id },
      { $set: { password: newHash, updatedAt: new Date() } },
    );

    return reply.code(200).send(successResponse({ message: 'Password changed successfully.' }));
  });
}
