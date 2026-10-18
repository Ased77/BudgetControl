/* =========================================================================
   Password credentials — scrypt, implemented against node:crypto.

   Format written to auth_users.password_hash:

       scrypt$16384$8$1$<salt-16B-base64>$<key-64B-base64>
           │      │  │ │   │               └─ derived key
           │      └─┴─┴─ scrypt parameters N, r, p (self-describing: a
           │                future tune does not invalidate old hashes)
           └─ algorithm tag

   Verification re-derives with the *stored* parameters and compares in
   constant time. Anything that does not parse exactly — including the
   migration's disabled-account sentinel `scrypt$disabled` — verifies to
   false without ever throwing, so a malformed hash behaves exactly like a
   wrong password and cannot be a login oracle or a crash vector.
   ========================================================================= */

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const scryptAsync = (password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    // Manual Promise instead of promisify(): the overloaded scrypt makes
    // promisify() mis-negotiate the optional options argument (TS2554).
    scrypt(password, salt, keylen, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });

/** OWASP-recommended interactive parameters (2024): 16 MiB memory cost. */
const DEFAULT_N = 16384;
const DEFAULT_r = 8;
const DEFAULT_p = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** Minimum complexity floor for any credential accepted into the system. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Matches the value the 0002 migration writes for the SYSTEM actor — it is
 * not a real credential and can never verify (unknown parameters).
 */
export const DISABLED_PASSWORD_HASH = 'scrypt$disabled';

export function hashPassword(password: string): Promise<string> {
  return (async () => {
    const salt = randomBytes(SALT_LENGTH);
    const key = (await scryptAsync(password, salt, KEY_LENGTH, {
      N: DEFAULT_N,
      r: DEFAULT_r,
      p: DEFAULT_p,
    })) as Buffer;
    return `scrypt$${DEFAULT_N}$${DEFAULT_r}$${DEFAULT_p}$${salt.toString('base64')}$${key.toString('base64')}`;
  })();
}

/** Always resolves to a boolean; malformed/unknown formats are simply wrong. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split('$');
    // [scrypt, N, r, p, saltB64, keyB64]
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
    // Guard against hostile stored values inflating memory cost.
    if (N < 1024 || N > 4_194_304 || r < 1 || r > 64 || p < 1 || p > 16) return false;
    const salt = Buffer.from(parts[4], 'base64');
    const expected = Buffer.from(parts[5], 'base64');
    if (salt.length === 0 || expected.length < KEY_LENGTH) return false;
    const actual = (await scryptAsync(password, salt, expected.length, { N, r, p })) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
