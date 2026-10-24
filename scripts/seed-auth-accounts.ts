/**
 * db:seed:auth — create the 13 demo role accounts as REAL identities.
 *
 * Unlike `db:seed:dev` (Dev Seed Login), these accounts are not test users:
 * they get a normal scrypt password hash, `is_test_user = false` and no
 * plaintext `dev_password`, so they log in through the ordinary
 * `POST /api/auth/login` route anywhere — local Docker, staging or a deployed
 * Vercel function.
 *
 * The accounts are the ones listed in server/seed/auth-accounts.ts
 * (09991000001–09991000013, one per RBAC role, same Dev* passwords). Re-running
 * refreshes the same stable UUIDs instead of creating duplicates.
 *
 * Usage:
 *   bun run db:seed:auth              # against the configured database
 *   bun run db:seed:auth --init       # apply pending migrations first
 *   bun run db:seed:auth --dry-run    # report, write nothing
 *
 * Target the deployed database by pointing DATABASE_URL at it:
 *   $env:DATABASE_URL='postgres://…?sslmode=require'; bun run db:seed:auth
 *
 * SECURITY: these credentials are published in this repository. They are demo
 * identities — rotate or deactivate them before handling real data.
 */
import { seedAuthAccounts } from '../server/seed/auth-accounts.js';
import { runMigrations, shutdownDatabase } from '../server/db/initialize.js';
import { getDatabaseTarget } from '../server/db/client.js';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const init = args.has('--init');

async function main(): Promise<void> {
  console.log(`[seed-auth] target ${getDatabaseTarget()}`);
  if (dryRun) console.log('[seed-auth] dry run — nothing will be written');

  if (init) {
    console.log('[seed-auth] applying pending migrations (--init)');
    await runMigrations();
  }

  const results = await seedAuthAccounts({ dryRun });
  const counts = { created: 0, updated: 0, skipped: 0 };
  for (const result of results) counts[result.outcome] += 1;

  console.log('\n  outcome  mobile        role                     password');
  console.log('  -------  ------------  -----------------------  ---------------------');
  for (const result of results) {
    const note = result.note ? `  (${result.note})` : '';
    console.log(
      `  ${result.outcome.padEnd(7)}  ${result.mobile.padEnd(12)}  ${String(result.role).padEnd(23)}  ${result.password}${note}`,
    );
  }

  const verb = dryRun ? 'would be' : 'are';
  console.log(
    `\n[seed-auth] ${results.length} accounts: ${counts.created} new, ${counts.updated} refreshed, ` +
      `${counts.skipped} skipped — ${counts.created + counts.updated} ${verb} real auth accounts.`,
  );

  if (counts.skipped > 0) {
    console.warn('[seed-auth] skipped rows were NOT seeded; resolve the notes above before relying on them.');
    process.exitCode = 1;
  }

  if (!dryRun) {
    console.warn(
      '\n[seed-auth] These passwords are published in this repository.\n' +
        '[seed-auth] Treat the accounts as demo identities: change each password from the\n' +
        '[seed-auth] role & permission manager, or deactivate them, before real data.',
    );
  }
}

main()
  .then(async () => {
    await shutdownDatabase();
  })
  .catch(async (error) => {
    console.error('[seed-auth] failed:', (error as Error).message);
    process.exitCode = 1;
    try {
      await shutdownDatabase();
    } catch {
      /* pool already closed */
    }
  });
