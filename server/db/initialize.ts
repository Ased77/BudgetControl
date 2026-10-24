/* =========================================================================
   Migration runner and database initialization.

   Boot order (mirrors the entrypoint contract the Docker staged design
   depends on):

     1. `runMigrations()` — apply pending drizzle migrations under a
        PostgreSQL advisory lock, so replicas booting concurrently
        serialize instead of racing DDL.
     2. `seedIfEmpty()` — one-time, transactional fill of a *fresh*
        database (registry tables empty) with the built-in dataset; a
        migrated legacy database skips it entirely via the app_meta gate
        that the legacy-import migration sets.
     2b. OPTIONAL `seedAuthAccounts()` — only when SEED_AUTH_ACCOUNTS=1.
        Creates the 13 demo role accounts as real auth users; see
        server/seed/auth-accounts.ts.
     3. idempotent repairs (priority title refresh),
        each a no-op when already applied.

   Called explicitly from server startup, not as an import side effect,
   so failures surface as a clear boot error and tooling can import the
   module without touching the database.
   ========================================================================= */

import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, closePool, pool } from './client.js';
import { seedDatabase } from './seed.js';
import { refreshPriorityTitlesIfNeeded } from './repairs.js';
import { ensureBootstrapAdminIfNeeded } from '../auth/bootstrap.js';
import { seedAuthAccounts } from '../seed/auth-accounts.js';

/** Arbitrary but stable key so concurrent replicas cannot race the DDL. */
const MIGRATION_LOCK_KEY = 4242001002;

/** The seed gate, versioned like the legacy `schema_version` marker. */
const SEED_KEY = 'seeded';
const SEED_VALUE = 'normalized-1';

/**
 * Where the applied SQL lives: `server/migrations` when running from
 * sources (dev, tools image), `dist/migrations` when the bundled server
 * runs (the build copies the folder into dist/ — see package.json).
 *
 * Serverless exception: a Vercel/lambda bundle cannot ship the folder —
 * there, an operator pre-applies migrations (they are recorded in the
 * database) and boots with DB_SKIP_MIGRATIONS=1.
 */
export function resolveMigrationsFolder(): string {
  const candidates = [
    path.join(process.cwd(), 'server', 'migrations'),
    path.join(process.cwd(), 'dist', 'migrations'),
  ];
  const found = candidates.find((dir) => fs.existsSync(path.join(dir, 'meta', '_journal.json')));
  if (!found) {
    if (process.env.DB_SKIP_MIGRATIONS === '1') {
      // Return a non-empty path that `migrate()` will never actually read —
      // the runner skips entirely in this mode (see runMigrations).
      return path.join(process.cwd(), 'migrations-skipped');
    }
    throw new Error(
      `[migrate] No drizzle migrations folder found. Looked in: ${candidates.join('; ')}. ` +
        'Run `bun run db:generate` or ensure the build copied dist/migrations. ' +
        'On a pre-migrated serverless target, set DB_SKIP_MIGRATIONS=1.',
    );
  }
  return found;
}

/**
 * Apply every pending migration under a PostgreSQL advisory lock. The
 * drizzle journal records progress transactionally in
 * `drizzle.__drizzle_migrations`, giving the schema a version history the
 * previous idempotent-DDL approach deliberately never had. Repeated boots
 * and concurrent replicas apply exactly the missing delta each.
 */
export async function runMigrations(): Promise<void> {
  if (process.env.DB_SKIP_MIGRATIONS === '1') {
    console.warn('[db] DB_SKIP_MIGRATIONS=1 — assuming a pre-migrated database');
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    try {
      await migrate(db, { migrationsFolder: resolveMigrationsFolder() });
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    }
  } finally {
    client.release();
  }
  console.log('[db] Migrations applied');
}

async function isSeedAlreadyApplied(): Promise<boolean> {
  const result = await db.execute<{ value: string }>(
    sql`SELECT value FROM app_meta WHERE key = ${SEED_KEY}`,
  );
  const rows = result as { rows: { value: string }[] };
  return rows.rows[0]?.value === SEED_VALUE;
}

/**
 * Seed a fresh database only. Setting the gate *inside* the same
 * transaction that fills the tables means a crash mid-seed leaves the
 * tables empty and re-runs cleanly on the next boot.
 */
export async function seedIfEmpty(): Promise<void> {
  if (await isSeedAlreadyApplied()) return;
  console.log('[db] Fresh database detected — seeding built-in dataset…');
  await seedDatabase();
  console.log('[db] Seeded');
}

/**
 * Bring the database to a runnable state: migrations, seed-if-empty, and
 * the idempotent incremental repairs.
 */
export async function initializeDatabase(): Promise<void> {
  await runMigrations();
  await seedIfEmpty();

  // Opt-in: create the 13 demo role accounts as REAL auth users
  // (server/seed/auth-accounts.ts). Off by default — a deployment must not
  // gain known-password accounts merely by booting. Runs before the bootstrap
  // repair so the seeded SYSTEM_ADMIN is the operator's first login instead
  // of a one-time random password printed to the logs.
  if (process.env.SEED_AUTH_ACCOUNTS === '1') {
    const seeded = await seedAuthAccounts();
    const created = seeded.filter((row) => row.outcome === 'created').length;
    const updated = seeded.filter((row) => row.outcome === 'updated').length;
    const skipped = seeded.length - created - updated;
    console.log(
      `[db] SEED_AUTH_ACCOUNTS=1 — demo role accounts ensured ` +
        `(${created} created, ${updated} refreshed${skipped ? `, ${skipped} skipped` : ''})`,
    );
  }

  await refreshPriorityTitlesIfNeeded();
  // Last boot step: guarantees ≥ 1 real login exists so the very first
  // session is a verified identity (the SYSTEM actor is never loggable).
  await ensureBootstrapAdminIfNeeded();
}

/** Report which legacy document tables are still around (post-migration). */
export async function legacyTablesRemaining(): Promise<string[]> {
  const result = await db.execute<{ table_name: string }>(
    sql`SELECT table_name FROM information_schema.tables
         WHERE table_schema = current_schema()
           AND table_name LIKE 'legacy_%'
         ORDER BY table_name`,
  );
  return (result as { rows: { table_name: string }[] }).rows.map((r) => r.table_name);
}

/** Generic meta read, exposed for CLI diagnostics. */
export async function getMeta(key: string): Promise<string | undefined> {
  const result = await db.execute<{ value: string }>(
    sql`SELECT value FROM app_meta WHERE key = ${key}`,
  );
  return (result as { rows: { value: string }[] }).rows[0]?.value;
}

/** Shutdown helper for CLIs — mirrors the legacy facade's export. */
export async function shutdownDatabase(): Promise<void> {
  await closePool();
}

export { SEED_KEY, SEED_VALUE };
