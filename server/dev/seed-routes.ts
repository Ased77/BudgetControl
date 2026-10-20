/* =========================================================================
   Dev Seed Login — DISPOSABLE dev-only endpoints.

   WHY: there is no public registration in this system (accounts are
   provisioned by an admin), and the project is still pre-launch. To test
   what each of the 8 roles experiences, a developer needs the credentials
   of a handful of seeded test accounts at hand.

   WHAT: two read-only endpoints, mounted ONLY when APP_ENV is not
   "production" (the conditional registration in server/app.ts means the
   routes do not even exist in a production deployment):

     GET /dev/seed-users                 → [{ id, username }] of test users
     GET /dev/seed-users/:id/credentials → { username, password } (404 if
                                           not found / not a test user)

   WHAT THEY DON'T DO: no session is minted, no login is performed, no real
   (non-test) account is ever listed or exposed, and the plaintext dev
   password lives in auth_users.dev_password — a column the real auth layer
   never reads (login still verifies scrypt password_hash). The password is
   written by scripts/dev-seed-users.ts into the DATABASE, so no plaintext
   password is ever part of the server bundle.

   HOW TO REMOVE THE FEATURE (cleanup):
     1. Delete this file (the `app.use('/dev', …)` line in server/app.ts is
        inside `if (isDevEnvironment())` — delete that block too).
     2. Delete scripts/dev-seed-users.ts and the seed table inside it.
     3. Remove the <DevSeedLoginPanel /> line in src/components/LoginView.tsx
        and delete src/components/DevSeedLoginPanel.tsx.
     4. Drop the schema columns: delete the isTestUser/devPassword fields in
        server/db/schema.ts, delete server/migrations/0003_dev_seed_test_users.sql
        and its entry in server/migrations/meta/_journal.json, run
        `bun run db:init`, then
          ALTER TABLE auth_users DROP COLUMN is_test_user;
          ALTER TABLE auth_users DROP COLUMN dev_password;
   ========================================================================= */

import express, { type RequestHandler } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { authUsers } from '../db/schema.js';
import { withDbErrorMapping } from '../db/errors.js';

/** Shaped like login identities that are accepted case-insensitively. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The single production gate, shared with server/app.ts. Explicitly set
 * APP_ENV=production for real deployments (see .env.example); anything else
 * — unset, "development", "staging" — mounts the dev routes.
 */
export function isDevEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.APP_ENV !== 'production';
}

export const devSeedRouter = express.Router();

// ---------------------------------------------------------------------------
// GET /seed-users — only active test accounts, only { id, username }.
// username === the login email (the credential the login form consumes).
// ---------------------------------------------------------------------------
const listSeedUsers: RequestHandler = async (_req, res, next) => {
  try {
    const rows = await withDbErrorMapping(async () =>
      db
        .select({ id: authUsers.id, email: authUsers.email })
        .from(authUsers)
        .where(and(eq(authUsers.isTestUser, true), eq(authUsers.isActive, true)))
        .orderBy(asc(authUsers.email)),
    );
    return res.json({ users: rows.map((row) => ({ id: row.id, username: row.email })) });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /seed-users/:id/credentials — dev password of one test account.
// 404 exactly when the row is missing, inactive, not a test user, or has no
// dev password. The uuid shape check keeps malformed ids out of PostgreSQL.
// ---------------------------------------------------------------------------
const getSeedCredentials: RequestHandler = async (req, res, next) => {
  try {
    const id = String(req.params.id ?? '');
    if (!UUID_PATTERN.test(id)) {
      return res.status(404).json({ error: 'کاربر آزمایشی یافت نشد', code: 'SEED_USER_NOT_FOUND' });
    }
    const rows = await withDbErrorMapping(async () =>
      db
        .select({ email: authUsers.email, devPassword: authUsers.devPassword })
        .from(authUsers)
        .where(and(eq(authUsers.id, id), eq(authUsers.isTestUser, true), eq(authUsers.isActive, true)))
        .limit(1),
    );
    const row = rows[0];
    if (!row || !row.devPassword) {
      return res.status(404).json({ error: 'کاربر آزمایشی یافت نشد', code: 'SEED_USER_NOT_FOUND' });
    }
    return res.json({ username: row.email, password: row.devPassword });
  } catch (error) {
    return next(error);
  }
};

devSeedRouter.get('/seed-users', listSeedUsers);
devSeedRouter.get('/seed-users/:id/credentials', getSeedCredentials);
