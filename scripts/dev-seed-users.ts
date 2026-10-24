/**
 * Dev Seed Login — DISPOSABLE test accounts (never run with APP_ENV=production).
 *
 * WHY: pre-launch testing loop — a developer wants to log in as each of the
 * system's roles and see exactly what that role sees. There is no public
 * registration, so this script provisions one disposable account per role and
 * stores its plaintext dev credential in auth_users.dev_password, which only
 * the dev-only /dev endpoints read (see server/dev/seed-routes.ts).
 *
 * The upsert logic lives in server/seed/auth-accounts.ts (seedDevTestAccounts)
 * as the one implementation shared with boot-time dev seeding
 * (initialize.ts, DEV_SEED_LOGIN=1) — this file only gates and reports.
 *
 * Safety gates:
 *  - Refuses to run when APP_ENV=production or off a developer's machine
 *    (the same isDevEnvironment gate server/app.ts uses). RE-run against a
 *    demo deployment's database by adding DEV_SEED_LOGIN=1 to the env.
 *  - Only rows with `is_test_user = true` are ever created here; the shared
 *    seeder still refuses to hijack a mobile that belongs to another account.
 *
 * HOW TO REMOVE THE FEATURE: delete server/dev/seed-routes.ts and its mount in
 * server/app.ts, the <DevSeedLoginPanel /> line in LoginView.tsx and the
 * component, the DEV_SEED_LOGIN=1 block in server/db/initialize.ts, this file,
 * and the `variant: dev-test` branch in server/seed/auth-accounts.ts.
 *
 * Usage:
 *   bun run db:seed:dev
 *   DEV_SEED_LOGIN=1 DATABASE_URL='postgres://…?sslmode=require' bun run db:seed:dev
 */

import { isDevEnvironment } from '../server/dev/seed-routes.js';
import { seedDevTestAccounts } from '../server/seed/auth-accounts.js';
import { shutdownDatabase } from '../server/db/initialize.js';

async function main(): Promise<void> {
  if (!isDevEnvironment()) {
    console.error('[dev-seed] APP_ENV=production — refuse to create test accounts. Aborting.');
    process.exitCode = 1;
    return;
  }

  const results = await seedDevTestAccounts();
  for (const result of results) {
    if (result.outcome === 'skipped') {
      console.warn(`[dev-seed] skipped ${result.mobile} (${result.role}) — ${result.note}`);
    } else {
      console.log(
        `[dev-seed] ${result.outcome.padEnd(8)} ${result.role.padEnd(20)} ${result.mobile}  (dev password: ${result.password})`,
      );
    }
  }

  const created = results.filter((result) => result.outcome === 'created').length;
  const updated = results.filter((result) => result.outcome === 'updated').length;
  const skipped = results.filter((result) => result.outcome === 'skipped').length;

  console.log(
    `\n[dev-seed] done — ${created} created, ${updated} refreshed, ${skipped} skipped. ` +
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
