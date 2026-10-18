import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import {
  OrganizationConfig,
  LocationData,
  CsrPriority,
  ExecutiveProject,
  AuditLogItem,
  UserProfile,
  Department,
  BudgetSource,
  CrisisHarmItem,
  ProjectExecutor,
  Contractor,
  SystemRolePermission,
  AnalysisSource,
} from '../src/types.js';
import {
  INITIAL_LOCATIONS,
  INITIAL_ORGANIZATION,
  INITIAL_PRIORITIES,
  INITIAL_PROJECTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_USERS,
  INITIAL_DEPARTMENTS,
  INITIAL_BUDGET_SOURCES,
  INITIAL_CRISES_AND_HARMS,
  INITIAL_EXECUTORS,
  INITIAL_CONTRACTORS,
  INITIAL_ROLES_PERMISSIONS,
  INITIAL_ANALYSIS_SOURCES,
} from '../src/data/initialData.js';
import { buildCountyDataset, CountyDataset } from '../src/data/countyTemplates.js';
import { OMIDIYEH_COUNTY } from '../src/data/omidiyehData.js';
import { loadDatabaseConfig } from './config.js';
import { SCHEMA_SQL, SCHEMA_VERSION, HARDENING_SQL } from './schema.js';

/* =========================================================================
   PostgreSQL data access layer

   This module replaced a synchronous better-sqlite3 implementation. Three
   consequences shaped the port, and all of them are deliberate:

   1. Everything is async. SQLite answered in-process from a file, so the old
      accessors returned values directly. PostgreSQL is a separate process over
      TCP, so every accessor is now `async` and every call site `await`s it.
      The route handlers already ran through the `wrap()` helper in server.ts,
      so a rejected promise still becomes a 500 JSON error instead of crashing.

   2. Writes are statement-per-round-trip, but batched. The first boot seeds
      ~22k rows (483 generated county datasets). Handing every row to the
      driver individually would be ~22k round-trips; `upsertMany()` packs 500
      rows into one multi-row INSERT, which finishes the whole seed in a few
      seconds instead of a minute.

   3. No pragmas to mirror: `journal_mode = WAL` and `foreign_keys = ON` are
      gone. PostgreSQL is always durable and transactional, and the SQLite
      schema never declared a single FOREIGN KEY — relations between projects,
      departments and priorities are soft (delete a department and its projects
      keep the stale id, which the UI tolerates). Adding real FK constraints
      now would silently break existing delete endpoints, so it is listed as
      optional hardening instead of being smuggled into the migration.

   The data shape itself is unchanged: a document model with indexed scalar
   columns plus a JSON `payload`. That is why the frontend types are served
   byte-for-byte as before.
   ========================================================================= */

const settings = loadDatabaseConfig();

export const pool = new Pool(settings.pool);

/**
 * An error on an *idle* client is emitted by the pool rather than by a query.
 * Without this listener Node treats it as an unhandled 'error' event and kills
 * the process — exactly the failure mode you do not want when the database
 * restarts underneath a running container.
 */
pool.on('error', (error) => {
  console.error('[db] Idle client error:', error.message);
});

/** Where the app is connected, with the password removed. Safe to log. */
export function getDatabaseTarget(): string {
  return settings.target;
}

export function getPoolStats(): { total: number; idle: number; waiting: number } {
  return { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount };
}

/* =========================================================================
   Query helpers
   ========================================================================= */

type PayloadRow = { payload: unknown };
type MetaRow = { value: string };

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

/**
 * Run `fn` inside a single transaction on one dedicated client, rolling back
 * on any throw and always returning the client to the pool.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[db] Rollback failed:', (rollbackError as Error).message);
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Serialize a document for a `jsonb` column.
 *
 * PostgreSQL rejects U+0000 inside text/JSON values ("unsupported Unicode
 * escape sequence"), which SQLite accepted silently. User-entered text can
 * contain a stray NUL byte, and without this guard such a write would fail the
 * whole request with a 500 — so it is removed here, once, for every payload.
 */
export function toJson(value: unknown): string {
  return JSON.stringify(value).replace(/\\u0000/g, '');
}

/** `jsonb` arrives as a parsed object; tolerate a text column for safety. */
function parsePayload<T>(row: PayloadRow): T {
  const value = row.payload;
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value as T;
}

function parseAll<T>(rows: PayloadRow[]): T[] {
  return rows.map((row) => parsePayload<T>(row));
}

const MAX_BIND_PARAMS = 60_000;

/**
 * Multi-row upsert: `INSERT ... VALUES ($1,$2),($3,$4) ... ON CONFLICT DO
 * UPDATE`. Chunked so the bind-parameter ceiling (65535) is never approached,
 * and used for both seeding and bulk writes.
 */
async function upsertMany(
  client: PoolClient,
  table: string,
  columns: string[],
  rows: unknown[][],
  conflictTarget: string,
  chunkSize = 500,
): Promise<void> {
  if (rows.length === 0) return;

  const perStatement = Math.max(1, Math.min(chunkSize, Math.floor(MAX_BIND_PARAMS / columns.length)));
  const assignments = columns
    .filter((column) => column !== conflictTarget)
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(', ');

  for (let offset = 0; offset < rows.length; offset += perStatement) {
    const chunk = rows.slice(offset, offset + perStatement);
    const params: unknown[] = [];
    const tuples = chunk.map((row) => {
      if (row.length !== columns.length) {
        throw new Error(`[db] ${table}: expected ${columns.length} values per row, received ${row.length}`);
      }
      const placeholders = row.map((value) => {
        params.push(value);
        return `$${params.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')})
       VALUES ${tuples.join(', ')}
       ON CONFLICT (${conflictTarget}) DO UPDATE SET ${assignments}`,
      params,
    );
  }
}

async function getMeta(key: string, client: PoolClient | Pool = pool): Promise<string | undefined> {
  const result = await client.query<MetaRow>('SELECT value FROM app_meta WHERE key = $1', [key]);
  return result.rows[0]?.value;
}

async function setMeta(client: PoolClient, key: string, value: string): Promise<void> {
  await client.query(
    `INSERT INTO app_meta (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value],
  );
}

/* =========================================================================
   Schema
   ========================================================================= */

/** Arbitrary but stable key so concurrent replicas cannot race the DDL. */
const INIT_LOCK_KEY = 4242001001;

/**
 * Apply the schema (idempotent) under a PostgreSQL advisory lock. Two app
 * replicas booting at the same moment would otherwise race
 * `CREATE TABLE IF NOT EXISTS` and one of them would fail with a duplicate
 * object error; the lock serializes them instead.
 */
export async function initializeSchema(options: { hardening?: boolean } = {}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [INIT_LOCK_KEY]);
    await client.query(SCHEMA_SQL);
    if (options.hardening) await client.query(HARDENING_SQL);
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [INIT_LOCK_KEY]);
    } finally {
      client.release();
    }
  }
}

/* =========================================================================
   Seeding — one-time, transactional, version-gated.

   `app_meta.schema_version` guards the full reseed so an operator's data is
   never overwritten on restart. Importing an existing SQLite database copies
   that same key, so a migrated install boots straight past the seed.
   ========================================================================= */

/** Column list + conflict target for every table the seed writes. */
const SEED_SPECS: Record<string, { columns: string[]; conflict: string }> = {
  organization: { columns: ['id', 'payload'], conflict: 'id' },
  locations: { columns: ['id', 'level', 'city', 'county', 'payload'], conflict: 'id' },
  priorities: { columns: ['id', 'code', 'title', 'category', 'payload'], conflict: 'id' },
  projects: {
    columns: ['id', 'code', 'title', 'status', 'priority_id', 'department_id', 'budget_source_id', 'payload'],
    conflict: 'id',
  },
  departments: { columns: ['id', 'name', 'code', 'payload'], conflict: 'id' },
  budget_sources: { columns: ['id', 'title', 'code', 'payload'], conflict: 'id' },
  crises_harms: { columns: ['id', 'title', 'code', 'payload'], conflict: 'id' },
  executors: { columns: ['id', 'name', 'code', 'payload'], conflict: 'id' },
  contractors: { columns: ['id', 'name', 'payload'], conflict: 'id' },
  users: { columns: ['id', 'name', 'role', 'payload'], conflict: 'id' },
  roles_permissions: { columns: ['role', 'payload'], conflict: 'role' },
  audit_logs: { columns: ['id', 'created_at', 'action_type', 'user_name', 'payload'], conflict: 'id' },
  analysis_sources: {
    columns: ['id', 'title', 'origin', 'status', 'province', 'county', 'payload'],
    conflict: 'id',
  },
};

async function seed(): Promise<void> {
  const version = await getMeta('schema_version');
  if (version === SCHEMA_VERSION) return;

  const started = Date.now();
  const rowsByTable: Record<string, unknown[][]> = {};
  const push = (table: string, row: unknown[]): void => {
    (rowsByTable[table] ??= []).push(row);
  };

  await withTransaction(async (client) => {
    // Serialize with any other instance booting at the same moment: two
    // serverless cold starts (or two containers) would otherwise seed the same
    // rows concurrently and deadlock inside the multi-row upserts. The lock is
    // transaction-scoped, so it releases on commit or rollback either way.
    await client.query('SELECT pg_advisory_xact_lock($1)', [INIT_LOCK_KEY]);
    if ((await getMeta('schema_version', client)) === SCHEMA_VERSION) return;

    push('organization', [INITIAL_ORGANIZATION.id, toJson(INITIAL_ORGANIZATION)]);

    for (const loc of INITIAL_LOCATIONS) {
      push('locations', [loc.id, loc.level, loc.city, loc.county, toJson(loc)]);
    }
    for (const p of INITIAL_PRIORITIES) {
      push('priorities', [p.id, p.code, p.title, p.category, toJson(p)]);
    }
    for (const pr of INITIAL_PROJECTS) {
      push('projects', [
        pr.id,
        pr.code,
        pr.title,
        pr.status,
        pr.priorityId,
        pr.departmentId,
        pr.budgetSourceId,
        toJson(pr),
      ]);
    }
    for (const d of INITIAL_DEPARTMENTS) push('departments', [d.id, d.name, d.code, toJson(d)]);
    for (const s of INITIAL_BUDGET_SOURCES) push('budget_sources', [s.id, s.title, s.code, toJson(s)]);
    for (const c of INITIAL_CRISES_AND_HARMS) push('crises_harms', [c.id, c.title, c.code, toJson(c)]);
    for (const e of INITIAL_EXECUTORS) push('executors', [e.id, e.name, e.code, toJson(e)]);
    for (const c of INITIAL_CONTRACTORS) push('contractors', [c.id, c.companyName, toJson(c)]);
    for (const u of INITIAL_USERS) push('users', [u.id, u.name, u.role, toJson(u)]);
    for (const r of INITIAL_ROLES_PERMISSIONS) push('roles_permissions', [r.role, toJson(r)]);
    for (const a of INITIAL_AUDIT_LOGS) {
      push('audit_logs', [a.id, a.timestamp, a.actionType, a.userName, toJson(a)]);
    }

    // ---- Generated datasets for every remaining county --------------------
    // Counties with hand-crafted, web-researched data keep their records;
    // every other county gets a complete indicator-driven dataset derived from
    // its real population and deprivation indices (src/data/countyTemplates).
    const handcraftedCounties = new Set(['شهرستان رفسنجان', OMIDIYEH_COUNTY]);
    const generatedDatasets: CountyDataset[] = INITIAL_LOCATIONS.filter(
      (loc) => loc.level === 'COUNTY' && !handcraftedCounties.has(loc.county),
    ).map((loc) => buildCountyDataset(loc));

    for (const dataset of generatedDatasets) {
      for (const d of dataset.departments) push('departments', [d.id, d.name, d.code, toJson(d)]);
      for (const s of dataset.budgetSources) push('budget_sources', [s.id, s.title, s.code, toJson(s)]);
      for (const c of dataset.crisesHarms) push('crises_harms', [c.id, c.title, c.code, toJson(c)]);
      for (const e of dataset.executors) push('executors', [e.id, e.name, e.code, toJson(e)]);
      for (const c of dataset.contractors) push('contractors', [c.id, c.companyName, toJson(c)]);
      for (const p of dataset.projects) {
        push('projects', [
          p.id,
          p.code,
          p.title,
          p.status,
          p.priorityId,
          p.departmentId,
          p.budgetSourceId,
          toJson(p),
        ]);
      }
      for (const u of dataset.users) push('users', [u.id, u.name, u.role, toJson(u)]);
      for (const a of dataset.auditLogs) push('audit_logs', [a.id, a.timestamp, a.actionType, a.userName, toJson(a)]);
    }

    let written = 0;
    for (const [table, spec] of Object.entries(SEED_SPECS)) {
      const rows = rowsByTable[table] ?? [];
      await upsertMany(client, table, spec.columns, rows, spec.conflict);
      written += rows.length;
    }
    await setMeta(client, 'schema_version', SCHEMA_VERSION);

    console.log(
      `[db] Seeded PostgreSQL (schema v${SCHEMA_VERSION}): ${written.toLocaleString('en-US')} rows ` +
        `across ${Object.keys(SEED_SPECS).length} tables in ${Date.now() - started}ms ` +
        `(${generatedDatasets.length} generated county datasets)`,
    );
  });
}

/**
 * Analysis sources seed themselves on first run (and after a schema upgrade)
 * rather than through `seed()`: the main seed is version-gated and rewrites
 * every table, so folding this in would clobber the operator's existing data.
 * Its own meta flag keeps the two lifecycles independent.
 */
async function seedAnalysisSources(): Promise<void> {
  const key = 'analysis_sources_seeded';
  if ((await getMeta(key)) === '1') return;

  await withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [INIT_LOCK_KEY]);
    if ((await getMeta(key, client)) === '1') return;

    await upsertMany(
      client,
      'analysis_sources',
      SEED_SPECS.analysis_sources.columns,
      INITIAL_ANALYSIS_SOURCES.map((s) => [
        s.id,
        s.title,
        s.origin,
        s.status,
        s.province,
        s.county,
        toJson(s),
      ]),
      SEED_SPECS.analysis_sources.conflict,
    );
    await setMeta(client, key, '1');
  });

  console.log(`[db] Seeded ${INITIAL_ANALYSIS_SOURCES.length} analysis sources`);
}

const PRIORITY_TITLE_MIGRATIONS: Record<string, { previous: string; current: string }> = {
  p1: { previous: 'توسعه زیرساخت‌های عمومی، عمران و خدمات شهری/روستایی', current: 'توسعه و عمران' },
  p2: { previous: 'اشتغال‌زایی بازدارنده، کارآفرینی و توانمندسازی اقتصادی جوانان', current: 'اشتغال‌زایی و کارآفرینی' },
  p3: { previous: 'حمایت از آسیب‌پذیران، جوانی جمعیت و فرزندآوری، تسهیل ازدواج و بازپروری بزهکاران', current: 'تسهیل ازدواج و فرزندآوری' },
  p4: { previous: 'بهداشت، درمان، مقابله با سوءمصرف الکل و مسمومیت متانول، سلامت روان و خودکشی', current: 'بهداشت و درمان' },
  p5: { previous: 'محیط‌زیست، هوای پاک و کیفیت زندگی', current: 'محیط زیست' },
  p6: { previous: 'تحکیم بنیان خانواده، پیشگیری از طلاق، مشاوره ازدواج و نشاط اجتماعی', current: 'تحکیم خانواده' },
  p7: { previous: 'آموزش، توسعه مدارس روستایی و بورسیه دانش‌آموزان مستعد', current: 'آموزش و پرورش' },
  p8: { previous: 'مشارکت مدنی، نظارت مردمی و شفافیت هزینه‌کرد بودجه', current: 'مشارکت مدنی' },
  p9: { previous: 'مدیریت بحران، پدافند غیرعامل و ایمنی', current: 'مدیریت بحران' },
  p10: { previous: 'عدالت محلی، ساماندهی سکونتگاه‌های غیررسمی و بافت‌های حاشیه‌ای', current: 'عدالت محلی' },
  p11: { previous: 'دانش‌بنیان، نوآوری و فناوری‌های حل مسائل اجتماعی/عمرانی', current: 'دانش‌بنیان' },
};

async function migratePriorityTitles(): Promise<void> {
  await withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [INIT_LOCK_KEY]);
    for (const [id, titles] of Object.entries(PRIORITY_TITLE_MIGRATIONS)) {
      const found = await client.query<PayloadRow>('SELECT payload FROM priorities WHERE id = $1', [id]);
      if (found.rowCount === 0) continue;

      const priority = parsePayload<CsrPriority>(found.rows[0]);
      if (priority.title !== titles.previous) continue;

      const updated = { ...priority, title: titles.current };
      await client.query('UPDATE priorities SET title = $1, payload = $2 WHERE id = $3', [
        updated.title,
        toJson(updated),
        id,
      ]);
    }
  });
}

/**
 * Incremental seed for the «رئیس اداره» role.
 *
 * The main seed is version-gated, so a database created before this role
 * existed never receives it — and bumping `SCHEMA_VERSION` would rewrite every
 * operator-owned record. This migration only adds what is missing:
 *
 *  1. the `canCreateProject` capability on roles stored before it existed
 *     (their current behaviour allowed project creation, so it defaults on);
 *  2. the role row and its demo user, when absent;
 *  3. the creator stamp on the demo projects that belong to that user, so the
 *     role's own-records scope has something to show on an existing install.
 *
 * Nothing is overwritten: a role/user already present is left exactly as the
 * operator has it, and a project that already names a creator keeps it.
 */
async function ensureOfficeHeadRole(): Promise<void> {
  const role = INITIAL_ROLES_PERMISSIONS.find((r) => r.role === 'OFFICE_HEAD');
  const demoUser = INITIAL_USERS.find((u) => u.role === 'OFFICE_HEAD');

  await withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [INIT_LOCK_KEY]);
    const roleRows = await client.query<{ role: string; payload: unknown }>(
      'SELECT role, payload FROM roles_permissions',
    );

    for (const row of roleRows.rows) {
      const permission = typeof row.payload === 'string'
        ? (JSON.parse(row.payload) as SystemRolePermission)
        : (row.payload as SystemRolePermission);
      if (permission.canCreateProject !== undefined) continue;
      await client.query('UPDATE roles_permissions SET payload = $1 WHERE role = $2', [
        toJson({ ...permission, canCreateProject: true }),
        row.role,
      ]);
    }

    if (role) {
      const exists = await client.query('SELECT 1 FROM roles_permissions WHERE role = $1', [role.role]);
      if (exists.rowCount === 0) {
        await client.query('INSERT INTO roles_permissions (role, payload) VALUES ($1, $2)', [
          role.role,
          toJson(role),
        ]);
        console.log(`[db] Added role ${role.role}`);
      }
    }

    if (demoUser) {
      const exists = await client.query('SELECT 1 FROM users WHERE id = $1', [demoUser.id]);
      if (exists.rowCount === 0) {
        await client.query('INSERT INTO users (id, name, role, payload) VALUES ($1, $2, $3, $4)', [
          demoUser.id,
          demoUser.name,
          demoUser.role,
          toJson(demoUser),
        ]);
        console.log(`[db] Added demo user ${demoUser.id}`);
      }
    }

    if (!demoUser) return;

    for (const seeded of INITIAL_PROJECTS) {
      if (seeded.createdByUserId !== demoUser.id) continue;
      const found = await client.query<PayloadRow>('SELECT payload FROM projects WHERE id = $1', [seeded.id]);
      if (found.rowCount === 0) continue;

      const stored = parsePayload<ExecutiveProject>(found.rows[0]);
      if (stored.createdByUserId) continue;

      await client.query('UPDATE projects SET payload = $1 WHERE id = $2', [
        toJson({
          ...stored,
          createdByUserId: seeded.createdByUserId,
          createdByName: seeded.createdByName,
        }),
        seeded.id,
      ]);
    }
  });
}

/**
 * Bring the database to a runnable state: schema, seed and the incremental
 * data repairs. Called explicitly from server startup (not as an import side
 * effect) so failures surface as a clear boot error and so tooling can import
 * this module without touching the database.
 */
export async function initializeDatabase(options: { hardening?: boolean } = {}): Promise<void> {
  await initializeSchema(options);
  await seed();
  await seedAnalysisSources();
  await migratePriorityTitles();
  await ensureOfficeHeadRole();
}

/* =========================================================================
   Health & shutdown
   ========================================================================= */

export type DatabaseHealth = {
  ok: boolean;
  latencyMs: number;
  schemaVersion: string | null;
  error?: string;
};

/** Never throws: the health endpoint reports a degraded state instead. */
export async function checkDatabase(): Promise<DatabaseHealth> {
  const started = Date.now();
  try {
    const rows = await query<MetaRow>("SELECT value FROM app_meta WHERE key = 'schema_version'");
    return { ok: true, latencyMs: Date.now() - started, schemaVersion: rows[0]?.value ?? null };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      schemaVersion: null,
      error: (error as Error).message,
    };
  }
}

/** Wait until the server responds, or give up after `timeoutMs`. */
export async function waitForDatabase(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let delay = 250;
  for (;;) {
    try {
      await query('SELECT 1');
      return;
    } catch (error) {
      if (Date.now() >= deadline) {
        throw new Error(
          `[db] PostgreSQL not reachable at ${settings.target} after ${timeoutMs}ms: ${(error as Error).message}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 3_000);
    }
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}

/* =========================================================================
   Typed accessors
   ========================================================================= */

// --- Organization ---------------------------------------------------------

export async function getOrganization(): Promise<OrganizationConfig> {
  const rows = await query<PayloadRow>('SELECT payload FROM organization WHERE id = $1', [INITIAL_ORGANIZATION.id]);
  return rows.length > 0 ? parsePayload<OrganizationConfig>(rows[0]) : INITIAL_ORGANIZATION;
}

export async function saveOrganization(org: OrganizationConfig): Promise<void> {
  await query(
    `INSERT INTO organization (id, payload) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
    [org.id || INITIAL_ORGANIZATION.id, toJson(org)],
  );
}

// --- Locations ------------------------------------------------------------

export async function listLocations(): Promise<LocationData[]> {
  return parseAll<LocationData>(await query<PayloadRow>('SELECT payload FROM locations ORDER BY id'));
}

export async function getLocation(id: string): Promise<LocationData | undefined> {
  const rows = await query<PayloadRow>('SELECT payload FROM locations WHERE id = $1', [id]);
  return rows.length > 0 ? parsePayload<LocationData>(rows[0]) : undefined;
}

export async function upsertLocation(loc: LocationData): Promise<void> {
  await query(
    `INSERT INTO locations (id, level, city, county, payload) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       level = EXCLUDED.level, city = EXCLUDED.city, county = EXCLUDED.county, payload = EXCLUDED.payload`,
    [loc.id, loc.level, loc.city, loc.county, toJson(loc)],
  );
}

// --- Priorities -----------------------------------------------------------

export async function listPriorities(): Promise<CsrPriority[]> {
  return parseAll<CsrPriority>(await query<PayloadRow>('SELECT payload FROM priorities ORDER BY code'));
}

export async function getPriority(id: string): Promise<CsrPriority | undefined> {
  const rows = await query<PayloadRow>('SELECT payload FROM priorities WHERE id = $1', [id]);
  return rows.length > 0 ? parsePayload<CsrPriority>(rows[0]) : undefined;
}

export async function upsertPriority(p: CsrPriority): Promise<void> {
  await query(
    `INSERT INTO priorities (id, code, title, category, payload) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       code = EXCLUDED.code, title = EXCLUDED.title, category = EXCLUDED.category, payload = EXCLUDED.payload`,
    [p.id, p.code, p.title, p.category, toJson(p)],
  );
}

export async function deletePriority(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM priorities WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function replaceAllPriorities(items: CsrPriority[]): Promise<void> {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM priorities');
    await upsertMany(
      client,
      'priorities',
      SEED_SPECS.priorities.columns,
      items.map((p) => [p.id, p.code, p.title, p.category, toJson(p)]),
      SEED_SPECS.priorities.conflict,
    );
  });
}

// --- Projects -------------------------------------------------------------

export async function listProjects(): Promise<ExecutiveProject[]> {
  return parseAll<ExecutiveProject>(await query<PayloadRow>('SELECT payload FROM projects ORDER BY id'));
}

export async function getProject(id: string): Promise<ExecutiveProject | undefined> {
  const rows = await query<PayloadRow>('SELECT payload FROM projects WHERE id = $1', [id]);
  return rows.length > 0 ? parsePayload<ExecutiveProject>(rows[0]) : undefined;
}

export async function upsertProject(p: ExecutiveProject): Promise<void> {
  await query(
    `INSERT INTO projects (id, code, title, status, priority_id, department_id, budget_source_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       code = EXCLUDED.code, title = EXCLUDED.title, status = EXCLUDED.status,
       priority_id = EXCLUDED.priority_id, department_id = EXCLUDED.department_id,
       budget_source_id = EXCLUDED.budget_source_id, payload = EXCLUDED.payload`,
    [p.id, p.code, p.title, p.status, p.priorityId, p.departmentId, p.budgetSourceId, toJson(p)],
  );
}

export async function deleteProject(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function updateProjectStatus(
  id: string,
  status: ExecutiveProject['status'],
): Promise<ExecutiveProject | undefined> {
  const project = await getProject(id);
  if (!project) return undefined;
  const updated = { ...project, status };
  await upsertProject(updated);
  return updated;
}

// --- Departments ----------------------------------------------------------

export async function listDepartments(): Promise<Department[]> {
  return parseAll<Department>(await query<PayloadRow>('SELECT payload FROM departments ORDER BY id'));
}

export async function upsertDepartment(d: Department): Promise<void> {
  await query(
    `INSERT INTO departments (id, name, code, payload) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, code = EXCLUDED.code, payload = EXCLUDED.payload`,
    [d.id, d.name, d.code, toJson(d)],
  );
}

export async function deleteDepartment(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM departments WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// --- Budget Sources -------------------------------------------------------

export async function listBudgetSources(): Promise<BudgetSource[]> {
  return parseAll<BudgetSource>(await query<PayloadRow>('SELECT payload FROM budget_sources ORDER BY id'));
}

export async function upsertBudgetSource(s: BudgetSource): Promise<void> {
  await query(
    `INSERT INTO budget_sources (id, title, code, payload) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, code = EXCLUDED.code, payload = EXCLUDED.payload`,
    [s.id, s.title, s.code, toJson(s)],
  );
}

export async function deleteBudgetSource(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM budget_sources WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// --- Crises & Harms -------------------------------------------------------

export async function listCrisesHarms(): Promise<CrisisHarmItem[]> {
  return parseAll<CrisisHarmItem>(await query<PayloadRow>('SELECT payload FROM crises_harms ORDER BY id'));
}

export async function upsertCrisisHarm(c: CrisisHarmItem): Promise<void> {
  await query(
    `INSERT INTO crises_harms (id, title, code, payload) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, code = EXCLUDED.code, payload = EXCLUDED.payload`,
    [c.id, c.title, c.code, toJson(c)],
  );
}

export async function deleteCrisisHarm(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM crises_harms WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// --- Executors ------------------------------------------------------------

export async function listExecutors(): Promise<ProjectExecutor[]> {
  return parseAll<ProjectExecutor>(await query<PayloadRow>('SELECT payload FROM executors ORDER BY id'));
}

export async function upsertExecutor(e: ProjectExecutor): Promise<void> {
  await query(
    `INSERT INTO executors (id, name, code, payload) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, code = EXCLUDED.code, payload = EXCLUDED.payload`,
    [e.id, e.name, e.code, toJson(e)],
  );
}

export async function deleteExecutor(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM executors WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// --- Contractors ----------------------------------------------------------

export async function listContractors(): Promise<Contractor[]> {
  return parseAll<Contractor>(await query<PayloadRow>('SELECT payload FROM contractors ORDER BY id'));
}

export async function upsertContractor(c: Contractor): Promise<void> {
  await query(
    `INSERT INTO contractors (id, name, payload) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, payload = EXCLUDED.payload`,
    [c.id, c.companyName, toJson(c)],
  );
}

export async function deleteContractor(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM contractors WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// --- Users & Roles ----------------------------------------------------------

export async function listUsers(): Promise<UserProfile[]> {
  return parseAll<UserProfile>(await query<PayloadRow>('SELECT payload FROM users ORDER BY id'));
}

export async function listRolesPermissions(): Promise<SystemRolePermission[]> {
  return parseAll<SystemRolePermission>(
    await query<PayloadRow>('SELECT payload FROM roles_permissions ORDER BY role'),
  );
}

// --- Audit Logs -----------------------------------------------------------

/**
 * Ordered by the identity column that replaced SQLite's rowid: insertion
 * order, stable across updates because upserts never touch `seq`.
 */
export async function listAuditLogs(limit = 200): Promise<AuditLogItem[]> {
  return parseAll<AuditLogItem>(
    await query<PayloadRow>('SELECT payload FROM audit_logs ORDER BY seq DESC LIMIT $1', [limit]),
  );
}

export async function addAuditLog(entry: AuditLogItem): Promise<void> {
  await query(
    `INSERT INTO audit_logs (id, created_at, action_type, user_name, payload) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       created_at = EXCLUDED.created_at, action_type = EXCLUDED.action_type,
       user_name = EXCLUDED.user_name, payload = EXCLUDED.payload`,
    [entry.id, entry.timestamp, entry.actionType, entry.userName, toJson(entry)],
  );
}

// --- Analysis Sources -----------------------------------------------------

export async function listAnalysisSources(): Promise<AnalysisSource[]> {
  return parseAll<AnalysisSource>(await query<PayloadRow>('SELECT payload FROM analysis_sources ORDER BY seq'));
}

export async function upsertAnalysisSource(s: AnalysisSource): Promise<void> {
  await query(
    `INSERT INTO analysis_sources (id, title, origin, status, province, county, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, origin = EXCLUDED.origin, status = EXCLUDED.status,
       province = EXCLUDED.province, county = EXCLUDED.county, payload = EXCLUDED.payload`,
    [s.id, s.title, s.origin, s.status, s.province, s.county, toJson(s)],
  );
}

export async function deleteAnalysisSource(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM analysis_sources WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
