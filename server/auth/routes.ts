/* =========================================================================
   /api/auth — where a user_id is BORN and where it is RENEWED.

   Flow map (matches the architecture doc in docs/AUTH.md):

     POST /otp/request → (re)issue a one-time code for a mobile
     POST /otp/verify  → verify the code → issue session            (⇐ real id)
     POST /login     → verify password → issue session (machine clients)
     POST /users     → admin-only account issuance (role & permission)
                        manager). This is the ONLY way a new account is
                        born — self-registration was removed by policy:
     POST /refresh   → validate+rotate refresh → new access token
     POST /logout    → revoke the rotation family → clear cookies
     GET  /me        → the verified identity of the current cookie

   Every response that carries a session sets BOTH cookies httpOnly:
     csr_at (access, 15 min) and csr_rt (refresh, 4 h absolute, path=/api/auth).
   The SPA never sees a token string it could store or leak.

   "Issue session" always means: sign access JWT (sub = auth_users.id) and
   persist sha256(raw refresh) with its rotation family. There is no guest,
   no anonymous variant, and no path that fabricates a user_id.
   ========================================================================= */

import express, { type Request, type RequestHandler, type Response } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { loadAuthConfig, ACCESS_COOKIE, REFRESH_COOKIE, type AuthSettings } from './config.js';
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from './password.js';
import { generateOtpCode, hashOtpCode, normalizeOtpCode, verifyOtpCode } from './otp.js';
import {
  hashRefreshToken,
  newRefreshToken,
  signAccessToken,
} from './tokens.js';
import {
  authUserToSession,
  consumeRefreshToken,
  deleteOtpChallenge,
  getAuthUserByMobile,
  getAuthUserById,
  getRefreshFamilyCreatedAt,
  getOtpChallenge,
  getRefreshTokenState,
  incrementOtpAttempts,
  insertAuthUser,
  insertRefreshToken,
  revokeRefreshFamily,
  saveOtpChallenge,
} from './repo.js';
import { normalizeMobile } from './mobile.js';
import { requireAuth, requireAdmin } from './middleware.js';
import { listRolesPermissions, upsertUser } from '../db/repositories/user.repository.js';
import type { UserRole } from '../../src/types.js';
import type { AuthUserRow } from '../db/schema.js';

/* The login identity is the mobile number — see server/auth/mobile.ts. */

/* --------------------------------------------------------------------------
   Brute-force damper: per-instance in-memory limiter. A single replica
   (the normal deployment for this system) gets real protection here;
   horizontal fleets put a shared store (Redis) in front of this map.
   -------------------------------------------------------------------------- */
const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

/** One per-IP window limiter; the map is per instance (see the note above). */
function createIpLimiter(
  store: Map<string, { count: number; resetAt: number }>,
  windowMs: number,
  max: number,
): RequestHandler {
  return (req, res, next) => {
    const key = `${req.socket.remoteAddress ?? 'unknown'}`;
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ error: 'تلاش‌های ناموفق بیش از حد مجاز — کمی بعد دوباره تلاش کنید', code: 'RATE_LIMITED' });
    }
    return next();
  };
}

const loginLimiter = createIpLimiter(attempts, LOGIN_WINDOW_MS, LOGIN_MAX_ATTEMPTS);

/* OTP has two throttles: per-IP request windows and the per-challenge attempt
   cap in the verify route (the code itself is only six digits). */
const otpSendLimiter = createIpLimiter(new Map(), 10 * 60_000, 6);
const otpVerifyLimiter = createIpLimiter(new Map(), 60_000, 20);

/** Log-safe mobile: enough to identify the attempt, not the person. */
function maskMobile(mobile: string): string {
  return `${mobile.slice(0, 4)}***${mobile.slice(-2)}`;
}

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
  mobile: string;
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
    mobile: row.mobile,
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
  return new Date(Date.now() + config.refreshTtlSeconds * 1000);
}

function setAuthCookies(
  res: Response,
  user: ReturnType<typeof authUserToSession>,
  accessToken: string,
  rawRefresh: string,
  refreshExpiresAt: Date,
  config: AuthSettings,
): void {
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
    maxAge: Math.max(0, refreshExpiresAt.getTime() - Date.now()),
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

async function issueSession(res: Response, req: Request, userId: string): Promise<void> {
  const config = loadAuthConfig();
  const session = await getPersistedSession(userId);
  const expiresAt = refreshExpiry(config);
  const accessToken = signAccessToken(session, config, expiresAt);

  const refresh = newRefreshToken();
  await insertRefreshToken({
    id: randomUUID(),
    userId,
    tokenHash: refresh.tokenHash,
    familyId: randomUUID(), // fresh rotation chain per login
    expiresAt,
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.socket.remoteAddress ?? null,
  });
  setAuthCookies(res, session, accessToken, refresh.token, expiresAt, config);
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
      mobile,
      password,
      displayName,
      role,
      province,
      county,
      departmentId,
      allowedLocationId,
    } = (req.body ?? {}) as Record<string, string | undefined>;

    const normalizedMobile = normalizeMobile(mobile);
    if (!normalizedMobile) {
      return res.status(400).json({ error: 'شماره موبایل معتبر وارد کنید (نمونه: 09123456789)' });
    }
    if (!displayName || String(displayName).trim().length < 2) {
      return res.status(400).json({ error: 'نام نمایشی را وارد کنید' });
    }
    // A name made only of "?" (plus separators) is a request body that lost its
    // encoding in transit — e.g. a shell client sent the JSON in an ANSI
    // codepage and every non-ASCII letter arrived as "?". Storing it would
    // poison the identity row, its roster mirror and every audit row written
    // afterwards with an unrecoverable skeleton (rendered as "؟؟؟؟"), so it is
    // rejected here; see repairLostEncodingNamesIfNeeded for the recovery path.
    if (!/[^\s?؟]/.test(String(displayName))) {
      return res.status(400).json({
        error: 'نام نمایشی فقط از «؟» تشکیل شده است — متن هنگام ارسال رمزگذاری خود را از دست داده؛ درخواست را با کدگذاری UTF-8 دوباره بفرستید',
        code: 'NAME_ENCODING_LOST',
      });
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

    const existing = await getAuthUserByMobile(normalizedMobile);
    if (existing) {
      // Same non-committal answer /register used: probing must not enumerate.
      return res.status(409).json({ error: 'این شماره موبایل از قبل ثبت شده است', code: 'MOBILE_TAKEN' });
    }

    let generatedPassword: string | undefined;
    const plainPassword = password ? String(password) : (generatedPassword = randomBytes(12).toString('base64url'));

    const id = randomUUID(); // THE user_id — minted once, owned by the auth layer
    await insertAuthUser({
      id,
      mobile: normalizedMobile,
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
// POST /otp/request — issue a six-digit one-time code for a mobile number.
//
// The number must belong to an account: an unregistered mobile gets an
// explicit `ACCOUNT_NOT_FOUND` before any code is generated, so the login
// screen can say «چنین کاربری وجود ندارد» instead of sending a code that
// could never sign anyone in. The code is delivered by the fake channel for
// now (AUTH_OTP_FAKE_DELIVERY=1 returns it in `devCode`); swapping in an SMS
// provider means sending it there and turning the flag off — the rest of the
// flow stays as is.
// ---------------------------------------------------------------------------
authRouter.post('/otp/request', otpSendLimiter, async (req, res, next) => {
  try {
    const { mobile } = (req.body ?? {}) as { mobile?: unknown };
    const normalized = normalizeMobile(mobile);
    if (!normalized) {
      return res.status(400).json({ error: 'شماره موبایل معتبر وارد کنید (نمونه: 09123456789)', code: 'INVALID_MOBILE' });
    }

    // Deliberate account check at this step: no challenge is issued for a
    // number that has no auth_users row. (The verify route still repeats the
    // lookup as a race guard in case the account is removed mid-flow.)
    const account = await getAuthUserByMobile(normalized);
    if (!account) {
      console.warn(`[auth] OTP requested for unknown mobile ${maskMobile(normalized)}`);
      return res.status(404).json({ error: 'چنین کاربری وجود ندارد', code: 'ACCOUNT_NOT_FOUND' });
    }

    const config = loadAuthConfig();
    const now = Date.now();

    // Resend cooldown is per number, so two tabs (or two people) cannot
    // churn codes; a new code would invalidate the previous one anyway.
    const existing = await getOtpChallenge(normalized);
    if (existing) {
      const elapsedMs = now - existing.sentAt.getTime();
      const cooldownMs = config.otpResendSeconds * 1000;
      if (elapsedMs < cooldownMs) {
        const retryAfterSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          error: `ارسال دوباره کد تا ${retryAfterSeconds} ثانیه دیگر ممکن است`,
          code: 'OTP_RESEND_COOLDOWN',
          retryAfterSeconds,
        });
      }
    }

    const code = generateOtpCode();
    await saveOtpChallenge({
      mobile: normalized,
      codeHash: hashOtpCode(normalized, code),
      expiresAt: new Date(now + config.otpTtlSeconds * 1000),
      sentAt: new Date(now),
    });

    if (config.otpFakeDelivery) {
      console.info(`[auth] OTP (fake delivery) for ${maskMobile(normalized)}: ${code}`);
    } else {
      console.info(`[auth] OTP issued for ${maskMobile(normalized)} (delivery not configured)`);
    }

    return res.json({
      ok: true,
      expiresInSeconds: config.otpTtlSeconds,
      resendAfterSeconds: config.otpResendSeconds,
      ...(config.otpFakeDelivery ? { devCode: code } : {}),
    });
  } catch (error) {
    return next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /otp/verify — check the code, then a verified user_id flows out.
//
// Single use, short lived and attempt-capped: a correct code deletes the
// challenge before the account lookup, so even a number without an account
// cannot reuse the same code. Sessions are issued by the same issueSession()
// as password login — every downstream invariant is unchanged.
// ---------------------------------------------------------------------------
authRouter.post('/otp/verify', otpVerifyLimiter, async (req, res, next) => {
  try {
    const { mobile, code: rawCode } = (req.body ?? {}) as { mobile?: unknown; code?: unknown };
    const normalized = normalizeMobile(mobile);
    const code = normalizeOtpCode(rawCode);
    if (!normalized) {
      return res.status(400).json({ error: 'شماره موبایل معتبر وارد کنید (نمونه: 09123456789)', code: 'INVALID_MOBILE' });
    }
    if (!code) {
      return res.status(400).json({ error: 'کد تأیید ۶ رقمی را وارد کنید', code: 'INVALID_OTP' });
    }

    const config = loadAuthConfig();
    const challenge = await getOtpChallenge(normalized);
    if (!challenge) {
      return res.status(401).json({
        error: 'کد تأیید نامعتبر یا منقضی شده است — دوباره کد بگیرید',
        code: 'OTP_REQUIRED',
      });
    }
    if (challenge.expiresAt.getTime() <= Date.now()) {
      await deleteOtpChallenge(normalized);
      return res.status(401).json({
        error: 'کد تأیید منقضی شده است — دوباره کد بگیرید',
        code: 'OTP_EXPIRED',
      });
    }
    if (challenge.attempts >= config.otpMaxAttempts) {
      await deleteOtpChallenge(normalized);
      return res.status(429).json({
        error: 'تعداد تلاش‌های ناموفق بیش از حد مجاز — کد جدید درخواست کنید',
        code: 'OTP_ATTEMPTS_EXCEEDED',
      });
    }

    if (!verifyOtpCode(normalized, code, challenge.codeHash)) {
      const used = await incrementOtpAttempts(normalized);
      const remaining = Math.max(0, config.otpMaxAttempts - used);
      console.warn(`[auth] OTP rejected for ${maskMobile(normalized)}: wrong code (${used}/${config.otpMaxAttempts})`);
      if (remaining === 0) {
        return res.status(429).json({
          error: 'تعداد تلاش‌های ناموفق بیش از حد مجاز — کد جدید درخواست کنید',
          code: 'OTP_ATTEMPTS_EXCEEDED',
        });
      }
      return res.status(401).json({
        error: `کد تأیید نادرست است — ${remaining} تلاش دیگر باقی مانده`,
        code: 'OTP_INVALID',
        attemptsRemaining: remaining,
      });
    }

    // Correct code: burn it before anything else can fail.
    await deleteOtpChallenge(normalized);

    const row = await getAuthUserByMobile(normalized);
    if (!row) {
      console.warn(`[auth] OTP verified for ${maskMobile(normalized)} but no account exists`);
      return res.status(401).json({
        error: 'چنین کاربری وجود ندارد',
        code: 'ACCOUNT_NOT_FOUND',
      });
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
// POST /login — verify credentials, then a verified user_id flows out.
// Kept for machine clients and admin tooling; the browser login uses OTP.
// ---------------------------------------------------------------------------
authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { mobile, password } = (req.body ?? {}) as { mobile?: string; password?: string };
    const normalized = normalizeMobile(mobile);
    const row = normalized ? await getAuthUserByMobile(normalized) : undefined;

    // The RESPONSE below must stay identical for "no such user", "wrong
    // password" and "account disabled" so login cannot enumerate accounts.
    // The LOG does not have that constraint: without it a deployment whose
    // demo accounts were never seeded is indistinguishable from a typo, which
    // is the single most common support question for this app. Mask the
    // number — the log needs to identify the attempt, not the person.
    const maskedMobile = normalized ? `${normalized.slice(0, 4)}***${normalized.slice(-2)}` : '(unparseable)';

    if (!row) {
      // Also covers a body that never arrived: normalizeMobile(undefined) is
      // null, so "(unparseable)" in the log means the request carried no
      // usable mobile at all (wrong JSON shape, or body not parsed).
      console.warn(`[auth] login rejected: no account for ${maskedMobile}`);
      return res.status(401).json({ error: 'شماره موبایل یا رمز عبور نادرست است', code: 'AUTH_REQUIRED' });
    }

    const valid = await verifyPassword(String(password ?? ''), row.passwordHash);
    if (!valid) {
      console.warn(
        `[auth] login rejected: wrong password for ${maskedMobile} ` +
          `(${row.role}${row.isTestUser ? ', dev seed row' : ''})`,
      );
      return res.status(401).json({ error: 'شماره موبایل یا رمز عبور نادرست است', code: 'AUTH_REQUIRED' });
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

    const config = loadAuthConfig();
    const familyCreatedAt = await getRefreshFamilyCreatedAt(state.familyId);
    if (!familyCreatedAt) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'نشست معتبر نیست — دوباره وارد شوید', code: 'AUTH_REQUIRED' });
    }
    const sessionExpiresAt = new Date(Math.min(
      state.expiresAt.getTime(),
      familyCreatedAt.getTime() + config.refreshTtlSeconds * 1000,
    ));
    if (sessionExpiresAt.getTime() <= Date.now()) {
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
    const accessToken = signAccessToken(authUserToSession(row), config, sessionExpiresAt);
    const next = newRefreshToken();
    await insertRefreshToken({
      id: randomUUID(),
      userId: row.id,
      tokenHash: next.tokenHash,
      familyId: state.familyId, // lineage preserved for reuse detection
      expiresAt: sessionExpiresAt,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.socket.remoteAddress ?? null,
    });
    setAuthCookies(res, authUserToSession(row), accessToken, next.token, sessionExpiresAt, config);

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
