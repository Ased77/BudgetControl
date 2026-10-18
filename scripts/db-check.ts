/**
 * db:check — one-shot report of the live database: connection target, server
 * version, schema version and per-table row counts.
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
import { SCHEMA_VERSION, TABLES } from '../server/schema.js';

type Report = {
  target: string;
  sslMode: string;
  serverVersion: string;
  database: string;
  user: string;
  schema: { expected: string; found: string | null; ok: boolean };
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
    const meta = await pool.query<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = 'schema_version'",
    );

    const tables: Report['tables'] = [];
    for (const table of TABLES) {
      try {
        const counted = await pool.query<{ count: string }>(`SELECT count(*)::bigint AS count FROM ${table}`);
        tables.push({ table, rows: Number(counted.rows[0].count) });
      } catch {
        tables.push({ table, rows: null });
      }
    }

    const found = meta.rows[0]?.value ?? null;
    const report: Report = {
      target: settings.target,
      sslMode: settings.sslMode,
      serverVersion: version.rows[0].version.split(' ').slice(0, 2).join(' '),
      database: version.rows[0].current_database,
      user: version.rows[0].current_user,
      schema: { expected: SCHEMA_VERSION, found, ok: found === SCHEMA_VERSION },
      tables,
      ok: found !== null && tables.every((entry) => entry.rows !== null),
    };

    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`[db:check] target  ${report.target} (ssl: ${report.sslMode})`);
      console.log(`[db:check] server  ${report.serverVersion} · db "${report.database}" · user "${report.user}"`);
      console.log(
        `[db:check] schema  expected v${SCHEMA_VERSION} · found ${found === null ? 'MISSING' : `v${found}`}`,
      );
      console.log(`[db:check] tables  ${report.tables.filter((t) => t.rows !== null).length}/${TABLES.length} present`);
      for (const entry of report.tables) {
        const count = entry.rows === null ? 'MISSING' : entry.rows.toLocaleString('en-US');
        console.log(`           ${entry.table.padEnd(20, ' ')} ${count.padStart(10, ' ')}`);
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
