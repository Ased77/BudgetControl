/**
 * db:init — apply the pending Drizzle migrations.
 *
 * This is the "run the migrations" step of the container entrypoint. The
 * schema is now versioned: every applied migration is recorded in
 * `drizzle.__drizzle_migrations`, repeated runs apply exactly the missing
 * delta, and a legacy document-model database is vacated and normalized
 * by migrations 0000/0001 in the same pass.
 *
 * Seeding and incremental repairs are owned by the server's
 * `initializeDatabase()` (version-gated application logic, not DDL).
 *
 * Usage:
 *   bun run db:init
 */
import { runMigrations, resolveMigrationsFolder, shutdownDatabase } from '../server/db/initialize.js';
import { getDatabaseTarget } from '../server/db/client.js';

async function main(): Promise<void> {
  console.log(`[db:init] target ${getDatabaseTarget()}`);
  console.log(`[db:init] migrations folder: ${resolveMigrationsFolder()}`);
  await runMigrations();
  console.log('[db:init] schema up to date');
}

main()
  .then(async () => {
    await shutdownDatabase();
  })
  .catch(async (error) => {
    console.error('[db:init] failed:', (error as Error).message);
    process.exitCode = 1;
    try {
      await shutdownDatabase();
    } catch {
      /* pool already closed */
    }
    process.exit(1);
  });
