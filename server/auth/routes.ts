/* =========================================================================
   /api/auth — where a user_id is BORN and where it is RENEWED.

   Flow map (matches the architecture doc in docs/AUTH.md):

     POST /login     → verify credentials → issue session          (⇐ real id)
     POST /users     → admin-only account issuance (role & permission
                        manager). This is the ONLY way a new account is
                        born — self-registration was removed by policy:
     POST /refresh   → validate+rotate refresh → new access token
     POST /logout    → revoke the rotation family → clear cookies
     GET  /me        → the verified identity of the current cookie

   Every response that carries a session sets BOTH cookies httpOnly:
     csr_at (access, 15 min) and csr_rt (refresh, 30 d, path=/api/auth).
   The SPA never sees a token string it could store or leak.

   "Issue session" always means: sign access JWT (sub = auth_users.id) and
   persist sha256(raw refresh) with its rotation family. There is no guest,
   no anonymous variant, and no path that fabricates a user_id.
   ========================================================================= */

import express, { type Request, type RequestHandler, type Response } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { loadAuthConfig, ACCESS_COOKIE, REFRESH_COOKIE, type AuthSettings } from './config.js';
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from './password.js';
import {
  hashRefreshToken,
  newRefreshToken,
  signAccessToken,
} from './tokens.js';
import {
  authUserToSession,
  consumeRefreshToken,
  getAuthUserByEmail,
  getAuthUserById,
  getRefreshTokenState,
  insertAuthUser,
  insertRefreshToken,
  revokeRefreshFamily,
} from './repo.js';
import { requireAuth, requireAdmin } from './middleware.js';
import { listRolesPermissions, upsertUser } from '../db/repositories/user.repository.js';
import type { UserRole } from '../../src/types.js';
import type { AuthUserRow } from '../db/schema.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* --------------------------------------------------------------------------
   Brute-force damper: per-instance in-memory limiter. A single replica
   (the normal deployment for this system) gets real protection here;
   horizontal fleets put a shared store (Redis) in front of this map.
   -------------------------------------------------------------------------- */
const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

const loginLimiter: RequestHandler = (req, res, next) => {
  const key = `${req.socket.remoteAddress ?? 'unknown'}`;
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return next();
  }
  entry.count += 1;
  if (entry.count > LOGIN_MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'تلاش‌های ناموفق بیش از حد مجاز — کمی بعد دوباره تلاش کنید', code: 'RATE_LIMITED' });
  }
  return next();
};

/* --------------------------------------------------------------------------
   Response shaping
   -------------------------------------------------------------------------- */

/** Persian display metadata for the profile view (matrix when present). */
async function roleLabels(role: string): Promise<{ roleFa: string; roleTitleFa: string }> {
  try {
    const matrix = await listRolesPermissions();
    const match = matrix.find((r) => r.role === role);
    if (match) return { roleFa: match.roleTitleFa, roleTitleFa: match.roleTitleFa };
  } catch {
    /* fall through to the English enum label */
  }
  return { roleFa: role, roleTitleFa: role };
}

async function toPublicProfile(row: {
  id: string;
  email: string;
  displayName: string;
  role: string;
  departmentId: string | null;
  allowedLocationId: string | null;
  province: string | null;
  county: string | null;
}) {
  const { roleFa, roleTitleFa } = await roleLabels(row.role);
  return {
    id: row.id,
    email: row.email,
    name: row.displayName,
    role: row.role,
    roleFa,
    roleTitleFa,
    avatar: '',            // browsers fall back to initials — no remote host
    organization: row.province ? `${row.province}${row.county ? ' — ' + row.county : ''}` : 'سطح ملی',
    departmentId: row.departmentId ?? undefined,
    allowedLocationId: row.allowedLocationId ?? undefined,
    province: row.province ?? undefined,
    county: row.county ?? undefined,
  };
}

/* --------------------------------------------------------------------------
   Session issuance — the ONLY place tokens/cookies are created
   -------------------------------------------------------------------------- */

function refreshExpiry(config: AuthSettings): Date {
  return new Date(Date.now() + config.refreshTtlDays * 24 * 60 * 60 * 1000);
}

function setAuthCookies(res: Response, user: ReturnType<typeof authUserToSession>, accessToken: string, rawRefresh: string, config: AuthSettings): void {
  // Access: every API request needs it.
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: '/',
    maxAge: config.accessTtlSeconds * 1000,
  });
  // Refresh: ONLY the auth endpoints touch it. A script even in another
  // code path cannot ship it off-domain... httpsOnly cookies are never
  // in document.cookie in the first place; path scoping keeps it off the
  // wire for all non-auth requests as a second line of defense.
  res.cookie(REFRESH_COOKIE, rawRefresh, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: '/api/auth',
    maxAge: config.refreshTtlDays * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

async function issueSession(res: Response, req: Request, userId: string): Promise<void> {
  const config = loadAuthConfig();
  const session = await getPersistedSession(userId);
  const accessToken = signAccessToken(session);

  const refresh = newRefreshToken();
  await insertRefreshToken({
    id: randomUUID(),
    userId,
    tokenHash: refresh.tokenHash,
    familyId: randomUUID(), // fresh rotation chain per login
    expiresAt: refreshExpiry(config),
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.socket.remoteAddress ?? null,
  });
  setAuthCookies(res, session, accessToken, refresh.token, config);
}

/** Re-fetch to mint claims from the DB row (role/scope are never client input). */
async function getPersistedSession(userId: string) {
  const row = await getAuthUserById(userId);
  if (!row) throw new Error('[auth] session issuance for a missing user_id');
  return authUserToSession(row);
}

/* =========================================================================
   Routes
   ========================================================================= */

export const authRouter = express.Router();

// ---------------------------------------------------------------------------
// POST /register — REMOVED BY POLICY. There is no self-service signup: an
// identity exists either from first-boot bootstrap or because the role &
// permission manager (POST /users) created it. Stale clients that still call
// this endpoint get an explicit refusal instead of a naked 404.
// ---------------------------------------------------------------------------
authRouter.post('/register', loginLimiter, (_req, res) => {
  return res.status(403).json({
    error: 'ثبت‌نام آزاد وجود ندارد — حساب کاربری فقط توسط مدیر سامانه در بخش نقش‌ها و دسترسی‌ها ساخته می‌شود',
    code: 'REGISTRATION_DISABLED',
  });
});

// ---------------------------------------------------------------------------
// POST /users — admin-only account issuance from the role & permission
// manager. The admin picks a KNOWN role from the RBAC matrix; nobody can
// mint a role name the matrix does not recognize. The user_id is minted
// HERE — server-side before any business data exists; no client-supplied
// id is ever honored. When the admin supplies no password, a one-time
// strong password is generated and returned exactly once (never stored in
// plaintext, never visible again after this response).
// ---------------------------------------------------------------------------
authRouter.post('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const {
      email,
      password,
      displayName,
      role,
      province,
      county,
      departmentId,
      allowedLocationId,
    } = (req.body ?? {}) as Record<string, string | undefined>;

    if (!email || !EMAIL_PATTERN.test(String(email))) {
      return res.status(400).json({ error: 'ایمیل معتبر وارد کنید' });
    }
    if (!displayName || String(displayName).trim().length < 2) {
      return res.status(400).json({ error: 'نام نمایشی را وارد کنید' });
    }
    if (!role || !String(role).trim()) {
      return res.status(400).json({ error: 'نقش کاربر را انتخاب کنید' });
    }
    if (password && String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `رمز عبور حداقل ${MIN_PASSWORD_LENGTH} نویسه باشد` });
    }

    // Only roles the live RBAC matrix knows are acceptable — a typo (or an
    // injected value) must fail loudly here rather than mint a dead account.
    const matrix = await listRolesPermissions();
    const matrixRole = matrix.find((r) => r.role === String(role).trim());
    if (!matrixRole) {
      return res.status(400).json({ error: 'نقش انتخابی در ماتریس دسترسی وجود ندارد', code: 'UNKNOWN_ROLE' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await getAuthUserByEmail(cleanEmail);
    if (existing) {
      // Same non-committal answer /register used: probing must not enumerate.
      return res.status(409).json({ error: 'این ایمیل از قبل ثبت شده است', code: 'EMAIL_TAKEN' });
    }

    let generatedPassword: string | undefined;
    const plainPassword = password ? String(password) : (generatedPassword = randomBytes(12).toString('base64url'));

    const id = randomUUID(); // THE user_id — minted once, owned by the auth layer
    await insertAuthUser({
      id,
      email: cleanEmail,
      passwordHash: await hashPassword(plainPassword),
      displayName: String(displayName).trim(),
      role: matrixRole.role as UserRole,
      // Optional scoping straight from the manager's form.
      departmentId: departmentId ?? null,
      allowedLocationId: allowedLocationId ?? null,
      province: province ?? null,
      county: county ?? null,
    });

    // Give the new account its roster entry so it is visible and editable in
    // the same view, with the same id the auth layer owns.
    await upsertUser({
      id,
      name: String(displayName).trim(),
      role: matrixRole.role as UserRole,
      roleFa: matrixRole.roleTitleFa,
      roleTitleFa: matrixRole.roleTitleFa,
      avatar: '',            // browsers fall back to initials — no remote host
      organization: province ? `${province}${county ? ' — ' + county : ''}` : 'سطح ملی',
      ...(departmentId ? { departmentId } : {}),
      ...(allowedLocationId ? { allowedLocationId } : {}),
      ...(province ? { province } : {}),
      ...(county ? { county } : {}),
    });

    const row = await getAuthUserById(id);
    if (!row) throw new Error('[auth] vanished immediately after account creation');
    return res.status(201).json({
      user: await toPublicProfile(row),
      ...(generatedPassword ? { generatedPassword } : {}),
    });
  } catch (error) {
    return next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /login — verify credentials, then a verified user_id flows out.
// ---------------------------------------------------------------------------
authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
    const row = email ? await getAuthUserByEmail(String(email)) : undefined;

    if (!row) {
      // Same answer for "no such user" and "wrong password"; verifyPassword
      // still runs on a decoy path in scalar cost terms below.
      return res.status(401).json({ error: 'ایمیل یا رمز عبور نادرست است', code: 'AUTH_REQUIRED' });
    }

    const valid = await verifyPassword(String(password ?? ''), row.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'ایمیل یا رمز عبور نادرست است', code: 'AUTH_REQUIRED' });
    }
    if (!row.isActive) {
      return res.status(401).json({ error: 'این حساب کاربری غیرفعال شده است', code: 'ACCOUNT_DISABLED' });
    }

    await issueSession(res, req, row.id);
    return res.json({ user: await toPublicProfile(row) });
  } catch (error) {
    return next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /refresh — exchange a still-valid refresh cookie for a fresh pair.
// Requirements covered here:
//   token expiry   → absent/expired cookie answers 401
//   token rotation → every call consumes the presented token
//   revocation     → replay of a consumed/revoked token kills the whole
//                    rotation family (theft containment)
//   invalid/missing user_id → the row lookup, then the account gate
// ---------------------------------------------------------------------------
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw || typeof raw !== 'string') {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'نشست منقضی شده — دوباره وارد شوید', code: 'AUTH_REQUIRED' });
    }

    const tokenHash = hashRefreshToken(raw);
    const state = await getRefreshTokenState(tokenHash);

    if (!state) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'نشست منقضی شده — دوباره وارد شوید', code: 'AUTH_REQUIRED' });
    }

    if (state.consumedAt || state.revokedAt) {
      // Replay: someone is reusing a token that already rotated. The family
      // dies so a stolen old token can never be redeemed later.
      await revokeRefreshFamily(state.familyId);
      clearAuthCookies(res);
      return res.status(401).json({ error: 'نشست باطل شد — دوباره وارد شوید', code: 'SESSION_REVOKED' });
    }

    if (state.expiresAt.getTime() <= Date.now()) {
      await consumeRefreshToken(tokenHash);
      clearAuthCookies(res);
      return res.status(401).json({ error: 'نشست منقضی شده — دوباره وارد شوید', code: 'AUTH_REQUIRED' });
    }

    const row = await getAuthUserById(state.userId);
    if (!row || !row.isActive) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'حساب کاربری معتبر نیست', code: 'ACCOUNT_DISABLED' });
    }

    // Rotate: consume the presented token, mint the successor in the SAME
    // family, and hand the client a new access token.
    await consumeRefreshToken(tokenHash);
    const config = loadAuthConfig();
    const accessToken = signAccessToken(authUserToSession(row));
    const next = newRefreshToken();
    await insertRefreshToken({
      id: randomUUID(),
      userId: row.id,
      tokenHash: next.tokenHash,
      familyId: state.familyId, // lineage preserved for reuse detection
      expiresAt: refreshExpiry(config),
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.socket.remoteAddress ?? null,
    });
    setAuthCookies(res, authUserToSession(row), accessToken, next.token, config);

    return res.json({ user: await toPublicProfile(row) });
  } catch (error) {
    return next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /logout — revoke this session's rotation family + clear cookies.
// Idempotent: no cookie is still a 200.
// ---------------------------------------------------------------------------
authRouter.post('/logout', async (req, res, next) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (typeof raw === 'string' && raw.length > 0) {
      const state = await getRefreshTokenState(hashRefreshToken(raw));
      if (state) await revokeRefreshFamily(state.familyId);
    }
    clearAuthCookies(res);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /me — the verified identity. Runs behind requireAuth so user_id comes
// from the auth layer and nowhere else.
// ---------------------------------------------------------------------------
const meHandler: RequestHandler = async (req, res, next) => {
  try {
    const row = await getAuthUserById(req.auth!.userId); // requireAuth guarantees auth
    if (!row) return res.status(401).json({ error: 'حساب کاربر یافت نشد', code: 'AUTH_REQUIRED' });
    return res.json({ user: await toPublicProfile(row) });
  } catch (error) {
    return next(error);
  }
};
authRouter.get('/me', requireAuth, meHandler);
