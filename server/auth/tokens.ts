/* =========================================================================
   Tokens — the two-layer session credential.

   ACCESS TOKEN (cookie `csr_at`, default 15 min, stateless-verifiable):
     HS256 JWT whose `sub` claim IS the user_id. Signed with a server-only
     secret, dual-bound to issuer/audience, carrying role + scope so every
     request is authorized without extra round trips... and verified
     against auth_users anyway by the middleware (revocation beats
     statelessness — see requireAuth).

   REFRESH TOKEN (cookie `csr_rt`, default 30 days, opaque+stateful):
     48 random bytes, base64url. Only its sha256 is persisted, so a DB
     dump never yields a usable session. Rotation + family revocation
     live in server/auth/repo.ts.
   ========================================================================= */

import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { loadAuthConfig, type AuthSettings } from '../auth/config.js';
import type { UserRole } from '../../src/types.js';

/** Exactly what the access token carries. `sub` is the verified user_id —
 *  it is present or the token is rejected; there is no anonymous fallback. */
export interface TokenClaims {
  /** user_id — the FK target of every business table (auth_users.id). */
  sub: string;
  role: UserRole;
  departmentId?: string;
  allowedLocationId?: string;
  /** Standard claim: issuance instant, used for the revocation gate. */
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export type { UserRole };

/** The identity subset an access token embeds (and the API trusts after
 *  re-validation). This is the shape middleware exposes as `req.auth`. */
export interface SessionUser {
  userId: string;
  role: UserRole;
  departmentId?: string;
  allowedLocationId?: string;
}

export function signAccessToken(user: SessionUser, config: AuthSettings = loadAuthConfig()): string {
  if (!user.userId) {
    throw new Error('[auth] refusing to sign a token with no user_id (sub claim)');
  }
  return jwt.sign(
    {
      role: user.role,
      ...(user.departmentId !== undefined && { departmentId: user.departmentId }),
      ...(user.allowedLocationId !== undefined && { allowedLocationId: user.allowedLocationId }),
    },
    config.jwtSecret,
    {
      subject: user.userId,
      algorithm: 'HS256',
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: config.accessTtlSeconds,
    },
  );
}

/**
 * Cryptographic verification only (signature, expiry, iss/aud, structure).
 * Returns the claims or throws — deciding what to do with a failure is the
 * middleware's job. `sub` missing → unusable, there is no partial trust.
 */
export function verifyAccessToken(token: string, config: AuthSettings = loadAuthConfig()): TokenClaims {
  const payload = jwt.verify(token, config.jwtSecret, {
    algorithms: ['HS256'], // pinned — never accept what was not issued
    issuer: config.issuer,
    audience: config.audience,
    clockTolerance: 30, // tick-skew between replicas
  });
  if (typeof payload !== 'object' || payload === null || typeof (payload as TokenClaims).sub !== 'string') {
    throw new jwt.JsonWebTokenError('malformed token: missing subject');
  }
  return payload as TokenClaims;
}

export function newRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(48).toString('base64url');
  return { token, tokenHash: hashRefreshToken(token) };
}

/** DB stores only this; the raw value lives solely in the httpOnly cookie. */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
