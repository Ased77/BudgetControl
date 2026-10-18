/**
 * db:import:sqlite — the SQLite cutover import, retargeted at the
 * normalized relational schema.
 *
 * Flow (two phases, explicit on purpose):
 *   1. STAGE — the SQLite document tables (`id text PK` + `payload jsonb`)
 *      land in `legacy_*` staging tables with the exact old shape. The
 *      SQLite file is never modified: reading goes through a byte copy.
 *   2. NORMALIZE — the data-import migration SQL (0001) is replayed
 *      against the staging rows: its guarded upserts move every staging
 *      payload into the normalized tables in one pass.
 *
 * The same 0001 SQL also owns the one-time migration of a PostgreSQL
 * install created by the previous (document-model) version, so this
 * script and that migration stay in lockstep by construction.
 *
 * Usage:
 *   bun run db:import:sqlite --dry-run          # validate, write nothing
 *   bun run db:import:sqlite --truncate --yes   # exact copy, wipe staging first
 *   bun run db:import:sqlite                    # merge, keep existing rows
 *   bun run db:import:sqlite --skip-normalize   # stage only
 *   bun run db:import:sqlite --sqlite data/csr-app.db
 *
 * Flags: --sqlite <path>, --in-place, --allow-diff, --dry-run, --truncate,
 * --yes, --skip-normalize.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createInterface } from 'node:readline/promises';

import { Database } from 'bun:sqlite';
import { Pool, type PoolClient } from 'pg';
import { loadDatabaseConfig } from '../server/config.js';

/* =========================================================================
   Staging spec — mirrors the legacy document model one-to-one.
   ========================================================================= */

type TableSpec = {
  table: string;
  columns: string[];
  /** Conflict target for the idempotent upsert. */
  conflict: string;
  /** Columns holding JSON documents. */
  json: string[];
  /** Replay SQLite rowid order so identity values line up. */
  ordered?: boolean;
};

const SPECS: TableSpec[] = [
  { table: 'app_meta', columns: ['key', 'value'], conflict: 'key', json: [] },
  { table: 'organization', columns: ['id', 'payload'], conflict: 'id', json: ['payload'] },
  { table: 'locations', columns: ['id', 'level', 'city', 'county', 'payload'], conflict: 'id', json: ['payload'] },
  { table: 'priorities', columns: ['id', 'code', 'title', 'category', 'payload'], conflict: 'id', json: ['payload'] },
  {
    table: 'projects',
    columns: ['id', 'code', 'title', 'status', 'priority_id', 'department_id', 'budget_source_id', 'payload'],
    conflict: 'id',
    json: ['payload'],
  },
  { table: 'departments', columns: ['id', 'name', 'code', 'payload'], conflict: 'id', json: ['payload'] },
  { table: 'budget_sources', columns: ['id', 'title', 'code', 'payload'], conflict: 'id', json: ['payload'] },
  { table: 'crises_harms', columns: ['id', 'title', 'code', 'payload'], conflict: 'id', json: ['payload'] },
  { table: 'executors', columns: ['id', 'name', 'code', 'payload'], conflict: 'id', json: ['payload'] },
  { table: 'contractors', columns: ['id', 'name', 'payload'], conflict: 'id', json: ['payload'] },
  { table: 'users', columns: ['id', 'name', 'role', 'payload'], conflict: 'id', json: ['payload'] },
  { table: 'roles_permissions', columns: ['role', 'payload'], conflict: 'role', json: ['payload'] },
  {
    table: 'audit_logs',
    columns: ['id', 'created_at', 'action_type', 'user_name', 'payload'],
    conflict: 'id',
    json: ['payload'],
    ordered: true,
  },
  {
    table: 'analysis_sources',
    columns: ['id', 'title', 'origin', 'status', 'province', 'county', 'payload'],
    conflict: 'id',
    json: ['payload'],
    ordered: true,
  },
];

/** Everything the importer writes lives under the legacy_ prefix. */
const staging = (spec: TableSpec): string => `legacy_${spec.table}`;
const STAGING_TABLES = SPECS.map(staging);

/**
 * The staging DDL — the legacy document model verbatim (indexes omitted:
 * staging is written once and read once; the normalized tables carry the
 * indices). `IF NOT EXISTS` keeps the script re-runnable.
 */
const STAGING_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS legacy_app_meta          (key text PRIMARY KEY, value text NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_organization      (id text PRIMARY KEY,  payload text NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_locations         (id text PRIMARY KEY,  level text NOT NULL, city text NOT NULL, county text NOT NULL, payload text NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_priorities        (id text PRIMARY KEY,  code integer NOT NULL, title text NOT NULL, category text NOT NULL, payload text NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_projects          (id text PRIMARY KEY,  code text NOT NULL, title text NOT NULL, status text NOT NULL, priority_id text, department_id text, budget_source_id text, payload text NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_departments       (id text PRIMARY KEY,  name text NOT NULL, code text NOT NULL, payload text NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_budget_sources    (id text PRIMARY KEY,  title text NOT NULL, code text NOT NULL, payload text NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_crises_harms      (id text PRIMARY KEY,  title text NOT NULL, code text NOT NULL, payload text NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_executors         (id text PRIMARY KEY,  name text NOT NULL, code text NOT NULL, payload text NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_contractors       (id text PRIMARY KEY,  name text NOT NULL, payload text NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_users             (id text PRIMARY KEY,  name text NOT NULL, role text NOT NULL, payload text NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_roles_permissions (role text PRIMARY KEY, payload text NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_audit_logs        (id text PRIMARY KEY, seq bigint GENERATED ALWAYS AS IDENTITY, created_at text NOT NULL, action_type text NOT NULL, user_name text NOT NULL, payload text NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_analysis_sources  (id text PRIMARY KEY, seq bigint GENERATED ALWAYS AS IDENTITY, title text NOT NULL, origin text NOT NULL, status text NOT NULL, province text, county text, payload text NOT NULL);
`;

const MAX_BIND_PARAMS = 60_000;
const CHUNK_ROWS = 500;

/* =========================================================================
   Arguments
   ========================================================================= */

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`--${name} requires a value`);
  return value;
}

/* =========================================================================
   Source (SQLite)
   ========================================================================= */

type SqliteHandle = { db: Database; cleanup: () => void };

/**
 * Open the source database. By default it is read through a *copy*: a SQLite
 * file with a hot WAL needs write access to recover, and importing must never
 * be able to modify the operator's original file. `--in-place` skips the copy.
 */
function openSource(source: string, inPlace: boolean): SqliteHandle {
  if (!fs.existsSync(source)) {
    throw new Error(`SQLite source not found: ${source} (pass --sqlite <path>)`);
  }

  if (inPlace) {
    // `create: false` so a typo can never silently create an empty database.
    const db = new Database(source, { create: false });
    return { db, cleanup: () => db.close() };
  }

  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'csr-sqlite-import-'));
  const copy = path.join(workspace, path.basename(source));
  fs.copyFileSync(source, copy);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${source}${suffix}`)) fs.copyFileSync(`${source}${suffix}`, `${copy}${suffix}`);
  }

  // Opened read-write on purpose: a database with a hot WAL needs write access
  // to recover, and this is a throwaway copy.
  const db = new Database(copy);
  return {
    db,
    cleanup: () => {
      db.close();
      fs.rmSync(workspace, { recursive: true, force: true });
    },
  };
}

/* =========================================================================
   Value conversion
   ========================================================================= */

/** PostgreSQL cannot store U+0000 in text or jsonb; SQLite could. */
function stripNul(value: string): string {
  return value.replace(/\u0000/g, '');
}

function convert(spec: TableSpec, column: string, value: unknown, id: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (spec.json.includes(column)) {
    if (typeof value !== 'string') {
      // Already an object (a JSON column with a different SQLite type affinity).
      return JSON.stringify(value);
    }
    try {
      return JSON.stringify(JSON.parse(value));
    } catch (error) {
      throw new Error(
        `${spec.table} id=${String(id)}: column "${column}" is not valid JSON — ${(error as Error).message}`,
      );
    }
  }
  if (typeof value === 'string') return stripNul(value);
  return value;
}

/* =========================================================================
   Target (PostgreSQL) — staging tables
   ========================================================================= */

async function copyTable(
  client: PoolClient,
  spec: TableSpec,
  rows: Array<Array<unknown>>,
  log: (message: string) => void,
): Promise<void> {
  if (rows.length === 0) return;

  const target = staging(spec);
  const perStatement = Math.max(1, Math.min(CHUNK_ROWS, Math.floor(MAX_BIND_PARAMS / spec.columns.length)));
  const assignments = spec.columns
    .filter((column) => column !== spec.conflict)
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(', ');

  for (let offset = 0; offset < rows.length; offset += perStatement) {
    const chunk = rows.slice(offset, offset + perStatement);
    const params: unknown[] = [];
    const tuples = chunk.map(
      (row) => `(${row.map((value) => `$${params.push(value)}`).join(', ')})`,
    );
    await client.query(
      `INSERT INTO ${target} (${spec.columns.join(', ')})
       VALUES ${tuples.join(', ')}
       ON CONFLICT (${spec.conflict}) DO UPDATE SET ${assignments}`,
      params,
    );
    log(`  ${target.padEnd(18, ' ')} ${Math.min(offset + perStatement, rows.length)}/${rows.length}`);
  }
}

/**
 * Locate the data-import migration (0001) next to the drizzle migrations
 * and execute it — its guarded upserts are idempotent, so replaying it
 * after staging new rows is exactly the normalization step.
 */
async function normalizeStagedData(pool: Pool): Promise<void> {
  const candidates = [
    path.join(process.cwd(), 'server', 'migrations'),
    path.join(process.cwd(), 'dist', 'migrations'),
  ];
  const folder = candidates.find((dir) => fs.existsSync(path.join(dir, '0001_import_legacy_documents.sql')));
  if (!folder) {
    throw new Error(
      `[import] 0001_import_legacy_documents.sql not found (looked in: ${candidates.join('; ')}) — ` +
        'stage-only import done; run `bun run db:init` before starting the server',
    );
  }
  const sql = fs.readFileSync(path.join(folder, '0001_import_legacy_documents.sql'), 'utf8');
  await pool.query(sql);
  console.log('[import] normalization applied (0001_import_legacy_documents.sql)');
}

/* =========================================================================
   Main
   ========================================================================= */

async function confirmTruncate(target: string): Promise<void> {
  if (flag('yes')) return;
  if (!process.stdin.isTTY) {
    throw new Error('refusing to TRUNCATE without --yes (stdin is not a terminal)');
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `This deletes every row in the staging tables at ${target}.\nType "truncate ${target}" to continue: `,
  );
  rl.close();
  if (answer.trim() !== `truncate ${target}`) throw new Error('aborted by operator');
}

async function main(): Promise<void> {
  const source = option('sqlite', path.join(process.cwd(), 'data', 'csr-app.db'));
  const truncate = flag('truncate');
  const dryRun = flag('dry-run');
  const skipNormalize = flag('skip-normalize');
  const settings = loadDatabaseConfig();
  const pool = new Pool(settings.pool);

  const started = Date.now();
  console.log(`[import] source  ${source}`);
  console.log(`[import] target  ${settings.target} (ssl: ${settings.sslMode})`);
  console.log(`[import] mode    ${truncate ? 'TRUNCATE + copy (exact parity)' : 'idempotent upsert'}${dryRun ? ' [dry-run]' : ''}`);

  const sqlite = openSource(source, flag('in-place'));
  try {
    const sourceTables = new Set(
      sqlite.db.query<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(
        (row) => row.name,
      ),
    );
    const skipped = SPECS.filter((spec) => !sourceTables.has(spec.table)).map((spec) => spec.table);
    if (skipped.length > 0) console.log(`[import] source has no ${skipped.join(', ')} — skipped`);

    await pool.query(STAGING_SCHEMA_SQL); // idempotent: guarantees the staging shape
    if (truncate && !dryRun) {
      await confirmTruncate(settings.target);
      await pool.query(`TRUNCATE TABLE ${STAGING_TABLES.join(', ')} RESTART IDENTITY CASCADE`);
      console.log(`[import] truncated ${STAGING_TABLES.length} staging tables`);
    }

    const client = await pool.connect();
    const sourceCounts = new Map<string, number>();
    try {
      if (!dryRun) await client.query('BEGIN');

      for (const spec of SPECS) {
        if (!sourceTables.has(spec.table)) continue;
        const select = `SELECT ${spec.columns.join(', ')} FROM ${spec.table}${spec.ordered ? ' ORDER BY rowid' : ''}`;
        const raw = sqlite.db.query<Record<string, unknown>>(select).all();
        sourceCounts.set(spec.table, raw.length);

        const idIndex = Math.max(0, spec.columns.indexOf(spec.conflict));
        const rows = raw.map((row) => spec.columns.map((column) => convert(spec, column, row[column], row[spec.columns[idIndex]])));

        console.log(`[import] ${spec.table} — ${raw.length} rows from SQLite`);
        if (!dryRun) await copyTable(client, spec, rows, (message) => console.log(message));
      }

      if (dryRun) {
        await client.query('ROLLBACK');
      } else {
        await client.query('COMMIT');
      }
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    // ---- Verification: row-for-row counts on both sides ------------------
    console.log('\n[import] row counts  (sqlite -> legacy staging)');
    let mismatches = 0;
    for (const spec of SPECS) {
      const expected = sourceCounts.get(spec.table);
      if (expected === undefined) continue;
      const counted = await pool.query<{ count: string }>(`SELECT count(*)::bigint AS count FROM ${staging(spec)}`);
      const actual = Number(counted.rows[0].count);
      const ok = actual === expected;
      if (!ok) mismatches += 1;
      console.log(
        `  ${ok ? 'OK  ' : 'DIFF'} ${spec.table.padEnd(18, ' ')} ${String(expected).padStart(6, ' ')} -> ${String(actual).padStart(6, ' ')}`,
      );
    }

    if (!dryRun && !skipNormalize) {
      await normalizeStagedData(pool);
      const normalized = await pool.query<{ count: string }>(`SELECT count(*)::bigint AS count FROM projects`);
      console.log(`[import] normalized projects table now holds ${normalized.rows[0]?.count ?? '0'} rows`);
    }

    console.log(`[import] finished in ${((Date.now() - started) / 1000).toFixed(1)}s`);

    if (mismatches > 0) {
      const message = `${mismatches} table(s) differ from the SQLite source`;
      if (flag('allow-diff')) console.warn(`[import] WARNING: ${message} (allowed by --allow-diff)`);
      else throw new Error(message);
    }
    console.log(dryRun ? '[import] dry-run complete — nothing was written' : '[import] import complete');
  } finally {
    sqlite.cleanup();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[import] failed:', (error as Error).message);
  process.exit(1);
});
