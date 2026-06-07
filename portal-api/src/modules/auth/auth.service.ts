/**
 * Auth Service
 *
 * Handles password hashing, JWT generation, and token verification.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.config';
import type { UserRole } from '../../database/schemas/user.schema';

/* ---------------------------------------------------------------
   Types
   --------------------------------------------------------------- */

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/* ---------------------------------------------------------------
   Password
   --------------------------------------------------------------- */

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/* ---------------------------------------------------------------
   JWT
   --------------------------------------------------------------- */

/**
 * Generate access + refresh token pair.
 */
export function generateTokens(payload: JwtPayload): TokenPair {
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as string,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(
    { userId: payload.userId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn as string } as jwt.SignOptions,
  );

  return { accessToken, refreshToken };
}

/**
 * Verify an access token. Returns the payload or throws.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

/**
 * Verify a refresh token. Returns { userId } or throws.
 */
export function verifyRefreshToken(token: string): { userId: string } {
  const payload = jwt.verify(token, config.jwt.secret) as { userId: string; type: string };
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return { userId: payload.userId };
}

/**
 * Hash a refresh token for storage (prevents DB leak → token theft).
 */
export async function hashRefreshToken(token: string): Promise<string> {
  return bcrypt.hash(token, 8); // lower rounds — refresh tokens are short-lived
}

/**
 * Verify a refresh token against its stored hash.
 */
export async function verifyRefreshTokenHash(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}
