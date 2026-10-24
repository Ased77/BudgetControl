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
import { Client } from 'pg';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, closePool, pool, type Tx } from './client.js';
import * as schema from './schema.js';
import { seedDatabase } from './seed.js';
import { refreshPriorityTitlesIfNeeded } from './repairs.js';
import { ensureBootstrapAdminIfNeeded } from '../auth/bootstrap.js';
import { seedAuthAccounts } from '../seed/auth-accounts.js';

/** Arbitrary but stable key so concurrent replicas cannot race the DDL. */
const MIGRATION_LOCK_KEY = 4242001002;

/**
 * How long a boot waits for another instance's migration before deciding the
 * lock is stale. A lock held by a *live* migration is released in seconds; a
 * lock held by a suspended serverless instance is held forever, so waiting
 * without a bound is not an option (it hangs every request).
 */
const MIGRATION_LOCK_WAIT_MS = 20_000;
const MIGRATION_LOCK_POLL_MS = 250;

/** pg_advisory_lock(bigint) splits the key into classid/objid (objsubid = 1). */
const MIGRATION_LOCK_CLASS_ID = Number(BigInt(MIGRATION_LOCK_KEY) >> 32n);
const MIGRATION_LOCK_OBJ_ID = Number(BigInt(MIGRATION_LOCK_KEY) & 0xffffffffn);

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

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

type MigrationLockTimeoutError = Error & { code: 'MIGRATION_LOCK_TIMEOUT' };

function migrationLockTimeout(): MigrationLockTimeoutError {
  const seconds = MIGRATION_LOCK_WAIT_MS / 1000;
  const error = new Error(
    `[migrate] the migration advisory lock is still held after ${seconds}s. ` +
      'Another instance is migrating, or a suspended instance left a stale lock behind. ' +
      `If this persists, release it from a SQL console with: ` +
      `SELECT pg_terminate_backend(pid) FROM pg_locks ` +
      `WHERE locktype = 'advisory' AND granted AND classid = ${MIGRATION_LOCK_CLASS_ID} AND objid = ${MIGRATION_LOCK_OBJ_ID};`,
  ) as MigrationLockTimeoutError;
  error.code = 'MIGRATION_LOCK_TIMEOUT';
  return error;
}

const isMigrationLockTimeout = (error: unknown): boolean =>
  (error as { code?: string } | null)?.code === 'MIGRATION_LOCK_TIMEOUT';

async function tryMigrationLock(tx: Tx): Promise<boolean> {
  const result = (await tx.execute(
    sql`SELECT pg_try_advisory_xact_lock(${MIGRATION_LOCK_KEY}) AS locked`,
  )) as { rows?: { locked: boolean }[] };
  return result.rows?.[0]?.locked === true;
}

/**
 * Wait for the transaction-scoped advisory lock, but never forever. The lock
 * is released by PostgreSQL at COMMIT/ROLLBACK — including when the connection
 * dies — so, unlike the former session-level `pg_advisory_lock`, it cannot be
 * left behind by a frozen serverless instance or reassigned by a transaction-
 * pooling endpoint (Neon/PgBouncer).
 */
async function acquireMigrationLock(tx: Tx): Promise<void> {
  const deadline = Date.now() + MIGRATION_LOCK_WAIT_MS;
  for (;;) {
    if (await tryMigrationLock(tx)) return;
    if (Date.now() >= deadline) throw migrationLockTimeout();
    await sleep(MIGRATION_LOCK_POLL_MS);
  }
}

/**
 * Run the migrator on its OWN connection, not one borrowed from the pool: the
 * migrator opens a transaction while the runner is doing work, so a pool of
 * `PG_POOL_MAX=1` would deadlock forever waiting for a second client. A
 * dedicated client also keeps the lock, the migration and the COMMIT on the
 * same session.
 */
async function runMigrationsOnOwnConnection(folder: string, useLock: boolean): Promise<void> {
  const client = new Client(pool.options);
  await client.connect();
  try {
    const migrationDb = drizzle(client, { schema });
    if (!useLock) {
      await migrate(migrationDb, { migrationsFolder: folder });
      return;
    }
    await migrationDb.transaction(async (tx) => {
      await acquireMigrationLock(tx);
      await migrate(tx, { migrationsFolder: folder });
    });
  } finally {
    await client.end().catch(() => undefined);
  }
}

interface MigrationLockHolder {
  pid: number;
  state: string | null;
}

/** Every session currently holding OUR migration key (other locks ignored). */
async function migrationLockHolders(): Promise<MigrationLockHolder[]> {
  const result = await pool.query<MigrationLockHolder>(
    `SELECT l.pid, a.state
       FROM pg_locks l
       JOIN pg_stat_activity a ON a.pid = l.pid
      WHERE l.locktype = 'advisory'
        AND l.granted
        AND l.classid = $1
        AND l.objid = $2
        AND l.objsubid = 1
        AND a.pid <> pg_backend_pid()`,
    [MIGRATION_LOCK_CLASS_ID, MIGRATION_LOCK_OBJ_ID],
  );
  return result.rows;
}

/**
 * Drop idle sessions that hold the migration key. Only `state = 'idle'` is
 * touched: an `active` (or idle-in-transaction) holder is a real migration in
 * progress and must never be disturbed. Termination is best-effort — the
 * provider may not grant `pg_signal_backend`, and the caller has a fallback.
 */
async function releaseIdleLockHolders(holders: MigrationLockHolder[]): Promise<number> {
  const pids = holders.filter((holder) => holder.state === 'idle').map((holder) => holder.pid);
  if (pids.length === 0) return 0;
  try {
    const result = await pool.query('SELECT pg_terminate_backend(pid) FROM unnest($1::int[]) AS pid', [
      pids,
    ]);
    return result.rowCount ?? 0;
  } catch (error) {
    console.warn('[db] could not terminate idle migration-lock holder(s):', (error as Error).message);
    return 0;
  }
}

/**
 * Apply every pending migration under a PostgreSQL advisory lock. The
 * drizzle journal records progress transactionally in
 * `drizzle.__drizzle_migrations`, giving the schema a version history the
 * previous idempotent-DDL approach deliberately never had. Repeated boots
 * and concurrent replicas apply exactly the missing delta each.
 *
 * Failure modes are bounded on purpose — a boot must never hang:
 *   1. normal: lock acquired in milliseconds, migrations commit, lock released;
 *   2. stale lock: after MIGRATION_LOCK_WAIT_MS, idle holders are terminated and
 *      the run is retried;
 *   3. unrecoverable lock with no live migrator: migrations run unlocked rather
 *      than blocking every request on a lock nobody will release (DDL still
 *      serializes inside PostgreSQL; the lock only avoids duplicate work).
 * If a *live* migrator holds the lock, the boot fails with an actionable error.
 */
export async function runMigrations(): Promise<void> {
  if (process.env.DB_SKIP_MIGRATIONS === '1') {
    console.warn('[db] DB_SKIP_MIGRATIONS=1 — assuming a pre-migrated database');
    return;
  }

  // Resolve BEFORE connecting: a missing folder must fail fast, not hold a lock.
  const folder = resolveMigrationsFolder();
  try {
    await runMigrationsOnOwnConnection(folder, true);
  } catch (error) {
    if (!isMigrationLockTimeout(error)) throw error;

    console.warn('[db] migration lock still held — inspecting the holder(s)');
    const holders = await migrationLockHolders().catch((inspectError: unknown) => {
      console.warn('[db] could not inspect the migration lock:', (inspectError as Error).message);
      return [] as MigrationLockHolder[];
    });

    const liveMigrator = holders.some((holder) => holder.state !== 'idle');
    if (liveMigrator) throw error; // a real migration is running — do not interfere

    if (holders.length > 0) {
      const terminated = await releaseIdleLockHolders(holders);
      console.warn(`[db] released ${terminated} idle migration-lock holder(s) — retrying`);
    }

    try {
      await runMigrationsOnOwnConnection(folder, true);
    } catch (retryError) {
      if (!isMigrationLockTimeout(retryError)) throw retryError;
      console.warn('[db] migration lock unrecoverable with no live migrator — running migrations unlocked');
      await runMigrationsOnOwnConnection(folder, false);
    }
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
    const skipped = seeded.filter((row) => row.outcome === 'skipped');
    console.log(
      `[db] SEED_AUTH_ACCOUNTS=1 — demo role accounts ensured ` +
        `(${created} created, ${updated} refreshed${skipped.length ? `, ${skipped.length} skipped` : ''})`,
    );
    // A skipped row will answer 401 at login while the boot line above still
    // looks healthy, so name each one and why on the same boot.
    for (const row of skipped) {
      console.warn(`[db] demo account NOT seeded: ${row.mobile} (${row.role}) — ${row.note ?? 'unknown reason'}`);
    }
  } else {
    // The loudest support question this project gets: a fresh deployment is
    // bootstrapped with ONE random admin, so the published 09991000001…
    // demo mobiles do not exist here and login says "wrong mobile or password".
    console.log(
      '[db] SEED_AUTH_ACCOUNTS is not "1" — the demo role accounts (09991000001…13) are NOT ' +
        'provisioned in this deployment. Log in with the bootstrap admin, or set the variable ' +
        'and redeploy, or run: bun run db:seed:auth',
    );
  }

  await refreshPriorityTitlesIfNeeded();
  // Last boot step: guarantees ≥ 1 real login exists so the very first
  // session is a verified identity (the SYSTEM actor is never loggable).
  await ensureBootstrapAdminIfNeeded();
  console.log('[db] Database initialized');
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
