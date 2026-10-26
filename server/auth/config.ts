/* =========================================================================
   Authentication configuration — environment-driven, fail-fast.

   Mirrors server/config.ts in spirit: a single module decides everything
   the auth layer needs from the environment, validates loudly at first
   use, and never lets a half-configured secret reach production silently.

   Variables (see .env.example):

     AUTH_JWT_SECRET            HMAC-SHA256 signing key (REQUIRED, ≥32 chars)
     AUTH_ACCESS_TTL_SECONDS    access-token lifetime   (default 900 = 15 min)
     AUTH_REFRESH_TTL_DAYS      refresh-token lifetime (default 30)
     AUTH_COOKIE_SECURE         Secure flag on cookies (default: in production)
     AUTH_COOKIE_SAMESITE       SameSite lax|strict    (default lax)
     AUTH_OTP_TTL_SECONDS       one-time-code lifetime   (default 120)
     AUTH_OTP_MAX_ATTEMPTS      wrong guesses per code   (default 5)
     AUTH_OTP_RESEND_SECONDS    resend cooldown          (default 60)
     AUTH_OTP_FAKE_DELIVERY     return the code to the client instead of
                                sending an SMS (default 1 — SMS is not wired)
     AUTH_BOOTSTRAP_MOBILE / AUTH_BOOTSTRAP_PASSWORD
                                credentials for the first-admin repair; unset
                                makes the repair generate and print a one-time
                                password instead.
   ========================================================================= */

import { normalizeMobile } from './mobile.js';

/** httpOnly cookie names. Access and refresh are distinct cookies on purpose:
 *  logout and cookie-clearing logic can then never confuse the layers. */
export const ACCESS_COOKIE = 'csr_at';
export const REFRESH_COOKIE = 'csr_rt';

export interface AuthSettings {
  /** HMAC secret for HS256 token signing. */
  jwtSecret: string;
  issuer: 'csr-budgeting';
  audience: 'csr-web';
  accessTtlSeconds: number;
  refreshTtlDays: number;
  /** One-time-code lifetime; short on purpose. */
  otpTtlSeconds: number;
  /** Wrong guesses a single challenge tolerates before it dies. */
  otpMaxAttempts: number;
  /** Minimum gap between two codes for the same mobile number. */
  otpResendSeconds: number;
  /** No SMS provider yet: hand the generated code back to the client. */
  otpFakeDelivery: boolean;
  cookieSecure: boolean;
  cookieSameSite: 'lax' | 'strict';
  bootstrapMobile: string | null;
  bootstrapPassword: string | null;
}

type Env = Record<string, string | undefined>;

function positiveInt(env: Env, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`[auth] ${key} must be a positive integer (received "${raw}")`);
  }
  return value;
}

function boolean(env: Env, key: string, fallback: boolean): boolean {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  if (raw === '1' || raw.toLowerCase() === 'true') return true;
  if (raw === '0' || raw.toLowerCase() === 'false') return false;
  throw new Error(`[auth] ${key} must be 0/1/true/false (received "${raw}")`);
}

/** One-time read (memoized): configuration never changes within a process. */
export function loadAuthConfig(env: Env = process.env): AuthSettings {
  const jwtSecret = env.AUTH_JWT_SECRET ?? '';
  if (jwtSecret.length < 32) {
    throw new Error(
      '[auth] AUTH_JWT_SECRET is missing or shorter than 32 characters. Generate one with: openssl rand -hex 32. ' +
        'Tokens cannot be issued or verified without it; refusing to boot with a weak or empty key.',
    );
  }

  const sameSiteRaw = (env.AUTH_COOKIE_SAMESITE || 'lax').toLowerCase();
  if (sameSiteRaw !== 'lax' && sameSiteRaw !== 'strict') {
    throw new Error(`[auth] AUTH_COOKIE_SAMESITE must be lax or strict (received "${sameSiteRaw}")`);
  }

  return {
    jwtSecret,
    issuer: 'csr-budgeting',
    audience: 'csr-web',
    accessTtlSeconds: positiveInt(env, 'AUTH_ACCESS_TTL_SECONDS', 900),
    refreshTtlDays: positiveInt(env, 'AUTH_REFRESH_TTL_DAYS', 30),
    otpTtlSeconds: positiveInt(env, 'AUTH_OTP_TTL_SECONDS', 120),
    otpMaxAttempts: positiveInt(env, 'AUTH_OTP_MAX_ATTEMPTS', 5),
    otpResendSeconds: positiveInt(env, 'AUTH_OTP_RESEND_SECONDS', 60),
    // Deliberately ON: no SMS provider is connected yet, and the login flow
    // must stay testable. Set AUTH_OTP_FAKE_DELIVERY=0 once delivery is real
    // — the code is then only written to the server log, never to the
    // response body (see server/auth/routes.ts).
    otpFakeDelivery: boolean(env, 'AUTH_OTP_FAKE_DELIVERY', true),
    // Behind a TLS-terminating proxy/CDN the browser still needs `Secure` —
    // the flag is about the client connection, so production defaults to on.
    cookieSecure: boolean(env, 'AUTH_COOKIE_SECURE', process.env.NODE_ENV === 'production'),
    cookieSameSite: sameSiteRaw,
    bootstrapMobile: normalizeMobile(env.AUTH_BOOTSTRAP_MOBILE),
    bootstrapPassword: env.AUTH_BOOTSTRAP_PASSWORD || null,
  };
}
