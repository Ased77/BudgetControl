/**
 * db:init — apply the PostgreSQL schema (idempotent).
 *
 * This is the "run the migrations" step of the container entrypoint: it creates
 * every table and index if they are missing and never touches existing data.
 * Seeding (the ~22k generated county rows) is owned by the server's
 * `initializeDatabase()` because it is version-gated application logic, not
 * schema DDL.
 *
 * Usage:
 *   bun run db:init               # schema only
 *   bun run db:init --hardening   # + the optional expression/GIN indexes
 */
import { Pool } from 'pg';
import { loadDatabaseConfig } from '../server/config.js';
import { HARDENING_SQL, SCHEMA_SQL, TABLES } from '../server/schema.js';

async function main(): Promise<void> {
  const hardening = process.argv.includes('--hardening');
  const settings = loadDatabaseConfig();
  const pool = new Pool(settings.pool);

  try {
    console.log(`[db:init] target ${settings.target} (ssl: ${settings.sslMode})`);
    await pool.query('SELECT pg_advisory_lock($1)', [4242001001]);
    try {
      // Every statement is IF NOT EXISTS / CREATE TABLE IF NOT EXISTS-safe.
      await pool.query(hardening ? `${SCHEMA_SQL}\n${HARDENING_SQL}` : SCHEMA_SQL);
    } finally {
      await pool.query('SELECT pg_advisory_unlock($1)', [4242001001]);
    }

    const present = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = ANY($1::text[])`,
      [[...TABLES]],
    );
    const missing = TABLES.filter((table) => !present.rows.some((row) => row.table_name === table));

    if (missing.length > 0) {
      throw new Error(`[db:init] schema incomplete, missing: ${missing.join(', ')}`);
    }
    console.log(
      `[db:init] schema ready — ${TABLES.length}/${TABLES.length} tables present${hardening ? ' (+ hardening indexes)' : ''}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[db:init] failed:', (error as Error).message);
  process.exit(1);
});
