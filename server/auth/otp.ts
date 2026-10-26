/* =========================================================================
   One-time-code primitives.

   The login code is six digits, generated with the CSPRNG and stored ONLY as
   an HMAC-SHA256 keyed with AUTH_JWT_SECRET and bound to the mobile number:

       code_hash = HMAC-SHA256(secret, "<mobile>:<code>")

   Consequences worth keeping:

   - A database dump contains no usable code (the key lives in the env, and
     the mobile number is part of the signed message so a hash cannot be
     replayed against another number).
   - Comparison is constant-time, so a wrong guess leaks nothing through
     timing.
   - Delivery is the only fake part of the flow right now: no SMS provider is
     wired, so the request route returns the code as `devCode` when
     AUTH_OTP_FAKE_DELIVERY is on (the default). Swapping in an SMS client
     means sending the code there and turning that flag off — nothing else in
     this module changes.
   ========================================================================= */

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { loadAuthConfig } from './config.js';

/** Six digits — the length the login screen renders as cells. */
export const OTP_CODE_LENGTH = 6;

/** Persian (۰-۹) and Arabic-Indic (٠-٩) numerals in, Latin digits out. */
function toLatinDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

/**
 * Canonical form of a submitted code: Latin digits only. Null when the input
 * cannot be a six-digit code (wrong length, letters, an empty body).
 */
export function normalizeOtpCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = toLatinDigits(raw).replace(/[\s\-]/g, '');
  return new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`).test(digits) ? digits : null;
}

/** A fresh code, zero-padded to OTP_CODE_LENGTH (000042 is a valid code). */
export function generateOtpCode(): string {
  return String(randomInt(0, 10 ** OTP_CODE_LENGTH)).padStart(OTP_CODE_LENGTH, '0');
}

/** HMAC of `<mobile>:<code>` — the only form ever persisted. */
export function hashOtpCode(mobile: string, code: string): string {
  return createHmac('sha256', loadAuthConfig().jwtSecret)
    .update(`${mobile}:${code}`)
    .digest('hex');
}

/**
 * Constant-time check of a submitted code against the stored hash. Both
 * operands are hex digests of equal length, so timingSafeEqual is safe.
 */
export function verifyOtpCode(mobile: string, code: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashOtpCode(mobile, code), 'utf8');
  const stored = Buffer.from(storedHash, 'utf8');
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}
