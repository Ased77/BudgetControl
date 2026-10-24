/**
 * Dev Seed Login — DISPOSABLE test accounts (never run with APP_ENV=production).
 *
 * WHY: pre-launch testing loop — a developer wants to log in as each of the
 * system's roles and see exactly what that role sees. There is no public
 * registration, so this script provisions one disposable account per role and
 * stores its plaintext dev credential in auth_users.dev_password, which only
 * the dev-only /dev endpoints read (see server/dev/seed-routes.ts).
 *
 * Safety gates:
 *  - Refuses to run when APP_ENV=production or on a deployed Vercel function
 *    (the same isDevEnvironment gate server/app.ts uses).
 *  - Only rows with `is_test_user = true` are ever created/updated here.
 *  - Real accounts (bootstrap/admin-provisioned) are never touched.
 *
 * Idempotent: re-running refreshes the scrypt hash + devPassword of the same
 * stable UUIDs without creating duplicates.
 *
 * HOW TO REMOVE THE FEATURE: delete this file (plus server/dev/seed-routes.ts
 * and its mount in server/app.ts, the <DevSeedLoginPanel /> line in
 * LoginView.tsx, DevSeedLoginPanel.tsx, migration 0003 and its journal entry)
 * then run `bun run db:init` and
 *   ALTER TABLE auth_users DROP COLUMN is_test_user;
 *   ALTER TABLE auth_users DROP COLUMN dev_password;
 *
 * Usage:
 *   bun run db:seed:dev       (add the script to package.json or run directly)
 *   bun run scripts/dev-seed-users.ts
 */

import { isDevEnvironment } from '../server/dev/seed-routes.js';
import { hashPassword } from '../server/auth/password.js';
import { shutdownDatabase } from '../server/db/initialize.js';
import { db } from '../server/db/client.js';
import { authUsers } from '../server/db/schema.js';
import { listRolesPermissions, upsertUser } from '../server/db/repositories/user.repository.js';
import { AUTH_SEED_ACCOUNTS } from '../server/seed/auth-accounts.js';

/* --------------------------------------------------------------------------
   The accounts themselves live in server/seed/auth-accounts.ts — the same
   list `db:seed:auth` uses to create REAL accounts. Here they are provisioned
   as disposable test users instead: is_test_user = true plus the plaintext
   dev_password the panel hands back. Keeping one list means the two modes can
   never drift on mobiles, roles or passwords.
   -------------------------------------------------------------------------- */


async function main(): Promise<void> {
  if (!isDevEnvironment()) {
    console.error('[dev-seed] APP_ENV=production — refuse to create test accounts. Aborting.');
    process.exitCode = 1;
    return;
  }

  // Persian labels come from the live RBAC matrix, the same source the real
  // admin-provisioning flow (POST /api/auth/users) uses.
  const matrix = await listRolesPermissions();

  for (const seed of AUTH_SEED_ACCOUNTS) {
    const matrixRole = matrix.find((r) => r.role === seed.role);
    if (!matrixRole) {
      console.warn(`[dev-seed] role ${seed.role} is not in the RBAC matrix — skipped`);
      continue;
    }

    await db
      .insert(authUsers)
      .values({
        id: seed.id,
        mobile: seed.mobile,
        passwordHash: await hashPassword(seed.password),
        displayName: seed.displayName,
        role: seed.role,
        isTestUser: true,
        devPassword: seed.password,
        province: seed.province ?? null,
        county: seed.county ?? null,
      })
      // Idempotent by the stable UUID: re-running refreshes the credentials.
      .onConflictDoUpdate({
        target: authUsers.id,
        set: {
          passwordHash: await hashPassword(seed.password),
          mobile: seed.mobile,
          displayName: seed.displayName,
          role: seed.role,
          isActive: true,
          isTestUser: true,
          devPassword: seed.password,
          province: seed.province ?? null,
          county: seed.county ?? null,
        },
      });

    // Mirror into the legacy `users` roster so the account is visible and
    // editable in the role & permission manager — exactly what the admin
    // issuance flow does for every account it creates.
    await upsertUser({
      id: seed.id,
      name: seed.displayName,
      role: seed.role,
      roleFa: matrixRole.roleTitleFa,
      roleTitleFa: matrixRole.roleTitleFa,
      avatar: '',
      organization: seed.province ? `${seed.province}${seed.county ? ' — ' + seed.county : ''}` : 'سطح ملی',
      ...(seed.province ? { province: seed.province } : {}),
      ...(seed.county ? { county: seed.county } : {}),
    });

    console.log(`[dev-seed] ${seed.role.padEnd(20)} ${seed.mobile}  (dev password: ${seed.password})`);
  }

  console.log(
    `\n[dev-seed] done — ${AUTH_SEED_ACCOUNTS.length} test accounts ready. ` +
      'Log in via the Dev seed users panel on the login page',
  );
  console.log('[dev-seed] reminder: these are disposable accounts; delete the feature before going live.');
}

main()
  .catch(async (error) => {
    console.error('[dev-seed] failed:', (error as Error).message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await shutdownDatabase();
    } catch {
      /* pool already closed */
    }
  });
