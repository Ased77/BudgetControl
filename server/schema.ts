/* =========================================================================
   PostgreSQL schema — the single source of truth.

   The same SQL string is applied by three callers, always idempotently:

     * `initializeDatabase()` in server/database.ts, on every server boot
     * `bun run db:init`      — used by docker/entrypoint.sh before the app
     * `bun run db:import:sqlite` — before copying legacy data in

   Why raw SQL and not an ORM: the data model is deliberately a document model
   (indexed scalar columns for querying + a JSON payload holding the whole typed
   entity, so the API can serve the frontend types without lossy field
   mapping). An ORM would only add a mapping layer between two representations
   of the same object; plain SQL keeps the shape explicit and reviewable.

   SQLite → PostgreSQL mapping decisions:

     TEXT    -> text          (unbounded, same semantics)
     INTEGER -> integer       (priorities.code is a real integer in the data)
     payload TEXT (JSON) -> jsonb
         jsonb validates on write, stores compactly and can be indexed/queried
         later (GIN) without another migration. The driver hands it back as a
         parsed object, which `parsePayload()` in database.ts accepts.
     rowid   -> bigint GENERATED ALWAYS AS IDENTITY ("seq")
         PostgreSQL has no rowid. `audit_logs` and `analysis_sources` relied on
         it for insertion order, so those two tables get an identity column;
         upserts never touch it, therefore order is stable and gap-tolerant.
     INSERT OR REPLACE -> INSERT ... ON CONFLICT DO UPDATE
         SQLite's REPLACE deleted and re-inserted the row (which is why the old
         code had to pass every column). The Postgres upsert updates in place,
         so the identity column of a row survives an update.
   ========================================================================= */

/**
 * Bump when the *seeded dataset* must be re-applied (see `seed()`).
 *
 * History:
 *   v3 — the full 36-department registry for شهرستان امیدیه plus an
 *        indicator-driven dataset for every other county in the registry, so
 *        all dependent sections follow the selected location instead of a
 *        single hard-coded county.
 *   v5 — INITIAL_LOCATIONS now covers all 31 provinces / 483 counties (real
 *        1395 census populations from fa.wikipedia), so every county gets an
 *        indicator-driven dependent dataset via buildCountyDataset.
 */
export const SCHEMA_VERSION = '5';

/** Every application table, in dependency-free order (used by tooling/tests). */
export const TABLES = [
  'app_meta',
  'organization',
  'locations',
  'priorities',
  'projects',
  'departments',
  'budget_sources',
  'crises_harms',
  'executors',
  'contractors',
  'users',
  'roles_permissions',
  'audit_logs',
  'analysis_sources',
] as const;

export const SCHEMA_SQL = `
-- ---------------------------------------------------------------------------
-- app_meta — internal markers: schema version, one-time seed flags.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_meta (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- ---------------------------------------------------------------------------
-- organization — single-document table (profile + total budget).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization (
  id      text PRIMARY KEY,
  payload jsonb NOT NULL
);

-- ---------------------------------------------------------------------------
-- locations — provinces / counties / districts / villages (489 rows seeded).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id      text PRIMARY KEY,
  level   text NOT NULL,
  city    text NOT NULL,
  county  text NOT NULL,
  payload jsonb NOT NULL
);

-- ---------------------------------------------------------------------------
-- priorities — the CSR budget axes (code is a real integer, used for sorting).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS priorities (
  id       text PRIMARY KEY,
  code     integer NOT NULL,
  title    text NOT NULL,
  category text NOT NULL,
  payload  jsonb NOT NULL
);

-- ---------------------------------------------------------------------------
-- projects — indexed columns mirror the fields queried/sorted server-side.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id               text PRIMARY KEY,
  code             text NOT NULL,
  title            text NOT NULL,
  status           text NOT NULL,
  priority_id      text,
  department_id    text,
  budget_source_id text,
  payload          jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_status     ON projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_priority   ON projects (priority_id);
CREATE INDEX IF NOT EXISTS idx_projects_department ON projects (department_id);

CREATE TABLE IF NOT EXISTS departments (
  id      text PRIMARY KEY,
  name    text NOT NULL,
  code    text NOT NULL,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS budget_sources (
  id      text PRIMARY KEY,
  title   text NOT NULL,
  code    text NOT NULL,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS crises_harms (
  id      text PRIMARY KEY,
  title   text NOT NULL,
  code    text NOT NULL,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS executors (
  id      text PRIMARY KEY,
  name    text NOT NULL,
  code    text NOT NULL,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS contractors (
  id      text PRIMARY KEY,
  name    text NOT NULL,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id      text PRIMARY KEY,
  name    text NOT NULL,
  role    text NOT NULL,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS roles_permissions (
  role    text PRIMARY KEY,
  payload jsonb NOT NULL
);

-- ---------------------------------------------------------------------------
-- audit_logs — append-only trail; seq replaces SQLite's rowid for ordering.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          text PRIMARY KEY,
  seq         bigint GENERATED ALWAYS AS IDENTITY,
  created_at  text NOT NULL,
  action_type text NOT NULL,
  user_name   text NOT NULL,
  payload     jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action  ON audit_logs (action_type);

-- ---------------------------------------------------------------------------
-- analysis_sources — engine inputs under human review; ordered by seq.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analysis_sources (
  id       text PRIMARY KEY,
  seq      bigint GENERATED ALWAYS AS IDENTITY,
  title    text NOT NULL,
  origin   text NOT NULL,
  status   text NOT NULL,
  province text,
  county   text,
  payload  jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analysis_sources_origin ON analysis_sources (origin);
CREATE INDEX IF NOT EXISTS idx_analysis_sources_status ON analysis_sources (status);

-- ---------------------------------------------------------------------------
-- Optional hardening, deliberately NOT applied automatically: these are only
-- worth their write cost once the queries actually filter in SQL (today the
-- server loads rows and filters in JavaScript, exactly as it did on SQLite).
-- Apply with:  bun run db:init --hardening
-- ---------------------------------------------------------------------------
-- CREATE INDEX IF NOT EXISTS idx_projects_payload_gin   ON projects USING gin (payload jsonb_path_ops);
-- CREATE INDEX IF NOT EXISTS idx_projects_county        ON projects ((payload->>'county'));
-- CREATE INDEX IF NOT EXISTS idx_projects_anti_overlap  ON projects ((payload->>'antiOverlapStatus'));
-- CREATE INDEX IF NOT EXISTS idx_locations_county       ON locations (county);
-- CREATE INDEX IF NOT EXISTS idx_crises_harms_county    ON crises_harms ((payload->>'county'));
-- CREATE INDEX IF NOT EXISTS idx_users_role             ON users (role);
`;

/** The block above, extracted so `db:init --hardening` can apply it verbatim. */
export const HARDENING_SQL = Array.from(SCHEMA_SQL.matchAll(/^-- (CREATE INDEX IF NOT EXISTS[^\n]+)$/gm))
  .map((match) => match[1])
  .join('\n');
