/* =========================================================================
   requireAuth — the gate between "a token" and "a verified user_id".

   Order of checks, each answering a different failure mode:

     1. Token present?           → else 401 (nothing to trust)
     2. Signature/expiry valid?  → else 401 (forged or expired)
     3. User still in auth_users?→ else 401 (deleted mid-flight)
     4. Account still active?    → else 401 (admin lockout)
     5. Token issued after the   → else 401 (revocation gate: the password
        account-wide minimum?      changed / all sessions killed earlier)

   Only then does `req.auth` exist, carrying the verified user_id — but
   verification is not the same as authorization: callers add
   requirePermission() on top.

   Semantics: 401 = "I do not know who you are" (the client may retry after
   refreshing); 403 = "I know exactly who you are and the answer is no".
   ========================================================================= */

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { loadAuthConfig, ACCESS_COOKIE, REFRESH_COOKIE } from './config.js';
import { verifyAccessToken, type SessionUser } from './tokens.js';
import { getAuthUserById, authUserToSession } from './repo.js';
import { listRolesPermissions } from '../db/repositories/user.repository.js';
import type { SystemRolePermission } from '../../src/types.js';

// Typed ambient augmentation — `req.auth` is the ONLY sanctioned way user_id
// reaches business logic. Handlers must never read ids from query/body.
declare module 'express-serve-static-core' {
  interface Request {
    /** Verified identity. Present exactly when an auth middleware ran. */
    auth?: SessionUser;
  }
}

function extractAccessToken(req: Request): string | undefined {
  // Cookie first (web app); Bearer accepted for machine clients only. Either
  // way the value has identical cryptographic scrutiny — transport is not trust.
  const cookie = req.cookies?.[ACCESS_COOKIE];
  if (typeof cookie === 'string' && cookie.length > 0) return cookie;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || undefined;
  return undefined;
}

function unauthorized(res: Response, realmMessage: string): Response {
  return res.status(401).json({ error: realmMessage, code: 'AUTH_REQUIRED' });
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = extractAccessToken(req);
  if (!token) return unauthorized(res, 'احراز هویت لازم است — توکنی فرستاده نشد');

  let config;
  let claims;
  try {
    config = loadAuthConfig();
    claims = verifyAccessToken(token, config);
  } catch (error) {
    // Expired and forged are distinct events but identical client outcomes:
    // both mean "present a fresh token". 401 lets the client refresh once.
    if (error instanceof jwt.TokenExpiredError) {
      return unauthorized(res, '.توکن احراز هویت منقضی شده است');
    }
    return unauthorized(res, 'توکن احراز هویت نامعتبر است');
  }

  const userId = claims.sub;

  // 1C/1D/1E — signature proves issuance; THIS proves liveliness. A primary-key
  // lookup is the cost of never honouring a deleted or disabled account for the
  // remaining lifetime of its access token.
  getAuthUserById(userId)
    .then((row) => {
      if (!row) return unauthorized(res, 'حساب کاربر یافت نشد');
      if (!row.isActive) return unauthorized(res, 'این حساب کاربری غیرفعال شده است');
      // Whole-second comparison: JWT `iat` has 1-second resolution while the
      // row timestamp has microseconds. Same-second tokens must pass — the
      // gate only invalidates tokens exposing themselves distinctly earlier.
      if (Math.floor(row.tokensValidFrom.getTime() / 1000) > claims.iat) {
        return unauthorized(res, 'توکن پیش از آخرین تغییر حساسیت حسابرسی صادر شده — دوباره وارد شوید');
      }
      // Server-derived session: token claims serve as the snapshot, the DB row
      // is the truth (role changes take effect on the next login at the latest).
      req.auth = {
        userId: row.id,
        role: row.role as SessionUser['role'],
        departmentId: row.departmentId ?? undefined,
        allowedLocationId: row.allowedLocationId ?? undefined,
      };
      return next();
    })
    .catch(next);
};

/**
 * Permission enforcement against the roles_permissions matrix (fresh DB read
 * behind a short TTL cache). Failing closed: an unknown role gets nothing.
 */
export function requirePermission(permission: keyof SystemRolePermission): RequestHandler {
  const TTL_MS = 30_000;
  let cache: { matrix: Map<string, boolean>; fetchedAt: number } | null = null;

  return async (req, res, next) => {
    const auth = req.auth;
    if (!auth) return unauthorized(res, 'احراز هویت لازم است');

    if (!cache || Date.now() - cache.fetchedAt > TTL_MS) {
      try {
        const rows = await listRolesPermissions();
        cache = {
          matrix: new Map(rows.map((r) => [r.role, r[permission] === true])),
          fetchedAt: Date.now(),
        };
      } catch (error) {
        return next(error); // DB down — fail the request, never the gate
      }
    }

    if (cache.matrix.get(auth.role) === true) return next();
    return res.status(403).json({
      error: 'سطح دسترسی این عملیات را ندارید',
      code: 'FORBIDDEN',
      role: auth.role,
    });
  };
}

/** Narrow guard for the admin-only account-management routes. */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.auth?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'این عملیات فقط برای مدیر ارشد مجاز است', code: 'FORBIDDEN' });
  }
  return next();
};
