/**
 * db:check — one-shot report of the live database: connection target, server
 * version, applied migration count, the seed gate and per-table row counts.
 *
 * It is the script the migration checklist tells you to run, and it exits
 * non-zero when the database is not ready, so it also works as a CI gate.
 *
 * Usage:
 *   bun run db:check
 *   bun run db:check --json
 */
import { Pool } from 'pg';
import { loadDatabaseConfig } from '../server/config.js';
import { TABLE_NAMES } from '../server/db/schema-tables.js';

type Report = {
  target: string;
  sslMode: string;
  serverVersion: string;
  database: string;
  user: string;
  migrations: { applied: number; ok: boolean };
  seeded: string | null;
  legacyTables: string[];
  tables: Array<{ table: string; rows: number | null }>;
  ok: boolean;
};

async function main(): Promise<void> {
  const json = process.argv.includes('--json');
  const settings = loadDatabaseConfig();
  const pool = new Pool(settings.pool);

  try {
    const version = await pool.query<{ version: string; current_database: string; current_user: string }>(
      'SELECT version(), current_database(), current_user',
    );
    // Parse-time relation resolution means the drizzle table must be probed
    // with a guard — CASE branches do not protect against a missing schema.
    const appliedCount = await pool
      .query<{ count: string }>('SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations')
      .catch(() => ({ rows: [{ count: '0' }] }));
    const seeded = await pool.query<{ value: string } | null>(
      "SELECT value FROM app_meta WHERE key = 'seeded'",
    ).catch(() => null);
    const legacy = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name LIKE 'legacy_%'
        ORDER BY table_name`,
    );

    const tables: Report['tables'] = [];
    for (const table of TABLE_NAMES) {
      try {
        const counted = await pool.query<{ count: string }>(`SELECT count(*) AS count FROM ${table}`);
        tables.push({ table, rows: Number(counted.rows[0].count) });
      } catch {
        tables.push({ table, rows: null });
      }
    }

    const migrationCount = Number(appliedCount.rows[0]?.count ?? 0);
    const report: Report = {
      target: settings.target,
      sslMode: settings.sslMode,
      serverVersion: version.rows[0].version.split(' ').slice(0, 2).join(' '),
      database: version.rows[0].current_database,
      user: version.rows[0].current_user,
      migrations: { applied: migrationCount, ok: migrationCount >= 2 },
      seeded: seeded?.rows[0]?.value ?? null,
      legacyTables: legacy.rows.map((row) => row.table_name),
      tables,
      ok: migrationCount >= 2 && tables.every((entry) => entry.rows !== null),
    };

    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`[db:check] target  ${report.target} (ssl: ${report.sslMode})`);
      console.log(`[db:check] server  ${report.serverVersion} · db "${report.database}" · user "${report.user}"`);
      console.log(
        `[db:check] migrations ${migrationCount} applied (baseline: 2)${report.migrations.ok ? ' OK' : ' — INCOMPLETE, run: bun run db:init'}`,
      );
      console.log(
        `[db:check] seed gate ${report.seeded === null ? 'NOT SET (fresh db — server will seed)' : report.seeded}`,
      );
      if (report.legacyTables.length > 0) {
        console.log(`[db:check] legacy_*  ${report.legacyTables.length} staging tables still present (drop when verified)`);
      }
      console.log(`[db:check] tables   ${report.tables.filter((t) => t.rows !== null).length}/${TABLE_NAMES.length} present`);
      for (const entry of report.tables) {
        const count = entry.rows === null ? 'MISSING' : entry.rows.toLocaleString('en-US');
        console.log(`           ${entry.table.padEnd(22, ' ')} ${count.padStart(10, ' ')}`);
      }
      console.log(report.ok ? '[db:check] OK' : '[db:check] NOT READY — run: bun run db:init');
    }

    if (!report.ok) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[db:check] failed:', (error as Error).message);
  process.exit(1);
});
