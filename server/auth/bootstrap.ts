/* =========================================================================
   Bootstrap repair — idempotent, in the same call order as other repairs.

   Guarantees of a freshly migrated database, in deployment order:

     Migration 0002 → auth_users exists, SYSTEM actor exists, every
                      business row has a NOT NULL FK'd actor.
     This repair    → at least one REAL, loggable account exists so the
                      first browser session is a verified identity.

   The credentials come from the environment when provided (recommended
   for operators). Otherwise a one-time password is generated and printed
   once to stderr — stderr, because request logs go to stdout: it must
   not be searchable next to traffic.
   ========================================================================= */

import { randomBytes, randomUUID } from 'node:crypto';
import { MIN_PASSWORD_LENGTH, hashPassword } from './password.js';
import { getAuthUserByEmail, hasRealUsers, insertAuthUser } from './repo.js';

export async function ensureBootstrapAdminIfNeeded(): Promise<void> {
  if (await hasRealUsers()) return; // identities already exist — no-op forever

  const email = process.env.AUTH_BOOTSTRAP_EMAIL?.trim() || 'admin@localhost';
  const provided = process.env.AUTH_BOOTSTRAP_PASSWORD;
  const password =
    provided && provided.length >= MIN_PASSWORD_LENGTH
      ? provided
      : randomBytes(16).toString('base64url'); // 128-bit one-time secret

  if (await getAuthUserByEmail(email)) {
    // Only possible if a previous bootstrap crashed after insert; the account
    // exists as a real user, so the next run no-ops.
    return;
  }

  await insertAuthUser({
    id: randomUUID(),
    email,
    passwordHash: await hashPassword(password),
    displayName: 'مدیر ارشد سامانه',
    role: 'ADMIN',
  });

  if (provided) {
    console.warn(`[auth] Bootstrap admin ensured: ${email} (password from AUTH_BOOTSTRAP_PASSWORD)`);
  } else {
    // One-time reveal. A generated password is never regenerated for the
    // same account: from this boot onward the operator owns the credential.
    console.error(
      '[auth] ================================================================\n' +
        '[auth] FIRST BOOT — bootstrap admin created so the system has a real\n' +
        '[auth] verified operator from minute one:\n' +
        `[auth]     email:    ${email}\n` +
        `[auth]     password: ${password}\n` +
        '[auth] Change this password immediately. This line will not print twice\n' +
        '[auth] (it exists in this boot only).\n' +
        '[auth] ================================================================',
    );
  }
}
