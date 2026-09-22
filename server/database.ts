import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
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
} from '../src/data/initialData.js';
import { buildCountyDataset, CountyDataset } from '../src/data/countyTemplates.js';
import { OMIDIYEH_COUNTY } from '../src/data/omidiyehData.js';

// v2 — reseed: datasets for شهرستان امیدیه plus an indicator-driven dataset for
// every other county in the registry, so all dependent sections follow the
// selected location instead of a single hard-coded county.
const SCHEMA_VERSION = '3';

/* =========================================================================
   Connection
   ========================================================================= */

const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'csr-app.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* =========================================================================
   Schema — document model: indexed scalar columns for querying + a JSON
   payload column holding the full typed entity, so the API can serve the
   exact frontend types without lossy field mapping.
   ========================================================================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS app_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS organization (
    id      TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS locations (
    id      TEXT PRIMARY KEY,
    level   TEXT NOT NULL,
    city    TEXT NOT NULL,
    county  TEXT NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS priorities (
    id       TEXT PRIMARY KEY,
    code     INTEGER NOT NULL,
    title    TEXT NOT NULL,
    category TEXT NOT NULL,
    payload  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id               TEXT PRIMARY KEY,
    code             TEXT NOT NULL,
    title            TEXT NOT NULL,
    status           TEXT NOT NULL,
    priority_id      TEXT,
    department_id    TEXT,
    budget_source_id TEXT,
    payload          TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_projects_status    ON projects(status);
  CREATE INDEX IF NOT EXISTS idx_projects_priority  ON projects(priority_id);
  CREATE INDEX IF NOT EXISTS idx_projects_department ON projects(department_id);

  CREATE TABLE IF NOT EXISTS departments (
    id      TEXT PRIMARY KEY,
    name    TEXT NOT NULL,
    code    TEXT NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS budget_sources (
    id      TEXT PRIMARY KEY,
    title   TEXT NOT NULL,
    code    TEXT NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crises_harms (
    id      TEXT PRIMARY KEY,
    title   TEXT NOT NULL,
    code    TEXT NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS executors (
    id      TEXT PRIMARY KEY,
    name    TEXT NOT NULL,
    code    TEXT NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contractors (
    id      TEXT PRIMARY KEY,
    name    TEXT NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id      TEXT PRIMARY KEY,
    name    TEXT NOT NULL,
    role    TEXT NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS roles_permissions (
    role    TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id          TEXT PRIMARY KEY,
    created_at  TEXT NOT NULL,
    action_type TEXT NOT NULL,
    user_name   TEXT NOT NULL,
    payload     TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created  ON audit_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_action   ON audit_logs(action_type);
`);

/* =========================================================================
   Seeding — one-time, transactional. Guarded by app_meta.schema_version so
   existing data is never overwritten on server restart.
   ========================================================================= */

function seed(): void {
  const version = db.prepare('SELECT value FROM app_meta WHERE key = ?').get('schema_version') as
    | { value: string }
    | undefined;
  if (version?.value === SCHEMA_VERSION) return;

  const tx = db.transaction(() => {
    db.prepare(
      'INSERT INTO organization (id, payload) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload'
    ).run(INITIAL_ORGANIZATION.id, JSON.stringify(INITIAL_ORGANIZATION));

    const insLocation = db.prepare(
      'INSERT OR REPLACE INTO locations (id, level, city, county, payload) VALUES (?, ?, ?, ?, ?)'
    );
    for (const loc of INITIAL_LOCATIONS) {
      insLocation.run(loc.id, loc.level, loc.city, loc.county, JSON.stringify(loc));
    }

    const insPriority = db.prepare(
      'INSERT OR REPLACE INTO priorities (id, code, title, category, payload) VALUES (?, ?, ?, ?, ?)'
    );
    for (const p of INITIAL_PRIORITIES) {
      insPriority.run(p.id, p.code, p.title, p.category, JSON.stringify(p));
    }

    const insProject = db.prepare(
      'INSERT OR REPLACE INTO projects (id, code, title, status, priority_id, department_id, budget_source_id, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const pr of INITIAL_PROJECTS) {
      insProject.run(pr.id, pr.code, pr.title, pr.status, pr.priorityId, pr.departmentId, pr.budgetSourceId, JSON.stringify(pr));
    }

    const insDepartment = db.prepare('INSERT OR REPLACE INTO departments (id, name, code, payload) VALUES (?, ?, ?, ?)');
    for (const d of INITIAL_DEPARTMENTS) {
      insDepartment.run(d.id, d.name, d.code, JSON.stringify(d));
    }

    const insSource = db.prepare('INSERT OR REPLACE INTO budget_sources (id, title, code, payload) VALUES (?, ?, ?, ?)');
    for (const s of INITIAL_BUDGET_SOURCES) {
      insSource.run(s.id, s.title, s.code, JSON.stringify(s));
    }

    const insCrisis = db.prepare('INSERT OR REPLACE INTO crises_harms (id, title, code, payload) VALUES (?, ?, ?, ?)');
    for (const c of INITIAL_CRISES_AND_HARMS) {
      insCrisis.run(c.id, c.title, c.code, JSON.stringify(c));
    }

    const insExecutor = db.prepare('INSERT OR REPLACE INTO executors (id, name, code, payload) VALUES (?, ?, ?, ?)');
    for (const e of INITIAL_EXECUTORS) {
      insExecutor.run(e.id, e.name, e.code, JSON.stringify(e));
    }

    const insContractor = db.prepare('INSERT OR REPLACE INTO contractors (id, name, payload) VALUES (?, ?, ?)');
    for (const c of INITIAL_CONTRACTORS) {
      insContractor.run(c.id, c.companyName, JSON.stringify(c));
    }

    const insUser = db.prepare('INSERT OR REPLACE INTO users (id, name, role, payload) VALUES (?, ?, ?, ?)');
    for (const u of INITIAL_USERS) {
      insUser.run(u.id, u.name, u.role, JSON.stringify(u));
    }

    const insRole = db.prepare('INSERT OR REPLACE INTO roles_permissions (role, payload) VALUES (?, ?)');
    for (const r of INITIAL_ROLES_PERMISSIONS) {
      insRole.run(r.role, JSON.stringify(r));
    }

    const insAudit = db.prepare(
      'INSERT OR REPLACE INTO audit_logs (id, created_at, action_type, user_name, payload) VALUES (?, ?, ?, ?, ?)'
    );
    for (const a of INITIAL_AUDIT_LOGS) {
      insAudit.run(a.id, a.timestamp, a.actionType, a.userName, JSON.stringify(a));
    }

    // ---- Generated datasets for every remaining county --------------------
    // Counties with hand-crafted, web-researched data keep their records;
    // every other county gets a complete indicator-driven dataset derived from
    // its real population and deprivation indices (src/data/countyTemplates).
    const handcraftedCounties = new Set(['شهرستان رفسنجان', OMIDIYEH_COUNTY]);
    const generatedDatasets: CountyDataset[] = INITIAL_LOCATIONS.filter(
      (loc) => loc.level === 'COUNTY' && !handcraftedCounties.has(loc.county)
    ).map((loc) => buildCountyDataset(loc));

    for (const dataset of generatedDatasets) {
      for (const d of dataset.departments) {
        insDepartment.run(d.id, d.name, d.code, JSON.stringify(d));
      }
      for (const s of dataset.budgetSources) {
        insSource.run(s.id, s.title, s.code, JSON.stringify(s));
      }
      for (const c of dataset.crisesHarms) {
        insCrisis.run(c.id, c.title, c.code, JSON.stringify(c));
      }
      for (const e of dataset.executors) {
        insExecutor.run(e.id, e.name, e.code, JSON.stringify(e));
      }
      for (const c of dataset.contractors) {
        insContractor.run(c.id, c.companyName, JSON.stringify(c));
      }
      for (const p of dataset.projects) {
        insProject.run(p.id, p.code, p.title, p.status, p.priorityId, p.departmentId, p.budgetSourceId, JSON.stringify(p));
      }
      for (const u of dataset.users) {
        insUser.run(u.id, u.name, u.role, JSON.stringify(u));
      }
      for (const a of dataset.auditLogs) {
        insAudit.run(a.id, a.timestamp, a.actionType, a.userName, JSON.stringify(a));
      }
    }
    console.log(`[db] Generated dependent datasets for ${generatedDatasets.length} counties`);

    db.prepare(
      'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run('schema_version', SCHEMA_VERSION);
  });

  tx();
  console.log(`[db] Seeded SQLite database at ${DB_PATH}`);
}

seed();

/* =========================================================================
   Typed accessors
   ========================================================================= */

type Payload<T> = { payload: string };

function parseAll<T>(rows: Payload<T>[]): T[] {
  return rows.map((r) => JSON.parse(r.payload) as T);
}

// --- Organization ---------------------------------------------------------

export function getOrganization(): OrganizationConfig {
  const row = db.prepare('SELECT payload FROM organization WHERE id = ?').get(INITIAL_ORGANIZATION.id) as
    | Payload<OrganizationConfig>
    | undefined;
  return row ? JSON.parse(row.payload) : INITIAL_ORGANIZATION;
}

export function saveOrganization(org: OrganizationConfig): void {
  db.prepare(
    'INSERT INTO organization (id, payload) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload'
  ).run(org.id || INITIAL_ORGANIZATION.id, JSON.stringify(org));
}

// --- Locations ------------------------------------------------------------

export function listLocations(): LocationData[] {
  const rows = db.prepare('SELECT payload FROM locations ORDER BY id').all() as Payload<LocationData>[];
  return parseAll(rows);
}

export function getLocation(id: string): LocationData | undefined {
  const row = db.prepare('SELECT payload FROM locations WHERE id = ?').get(id) as Payload<LocationData> | undefined;
  return row ? JSON.parse(row.payload) : undefined;
}

export function upsertLocation(loc: LocationData): void {
  db.prepare('INSERT OR REPLACE INTO locations (id, level, city, county, payload) VALUES (?, ?, ?, ?, ?)').run(
    loc.id,
    loc.level,
    loc.city,
    loc.county,
    JSON.stringify(loc)
  );
}

// --- Priorities -----------------------------------------------------------

export function listPriorities(): CsrPriority[] {
  const rows = db.prepare('SELECT payload FROM priorities ORDER BY code').all() as Payload<CsrPriority>[];
  return parseAll(rows);
}

export function getPriority(id: string): CsrPriority | undefined {
  const row = db.prepare('SELECT payload FROM priorities WHERE id = ?').get(id) as Payload<CsrPriority> | undefined;
  return row ? JSON.parse(row.payload) : undefined;
}

export function upsertPriority(p: CsrPriority): void {
  db.prepare('INSERT OR REPLACE INTO priorities (id, code, title, category, payload) VALUES (?, ?, ?, ?, ?)').run(
    p.id,
    p.code,
    p.title,
    p.category,
    JSON.stringify(p)
  );
}

export function deletePriority(id: string): boolean {
  const info = db.prepare('DELETE FROM priorities WHERE id = ?').run(id);
  return info.changes > 0;
}

export function replaceAllPriorities(items: CsrPriority[]): void {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM priorities').run();
    const ins = db.prepare('INSERT INTO priorities (id, code, title, category, payload) VALUES (?, ?, ?, ?, ?)');
    for (const p of items) ins.run(p.id, p.code, p.title, p.category, JSON.stringify(p));
  });
  tx();
}

// --- Projects -------------------------------------------------------------

export function listProjects(): ExecutiveProject[] {
  const rows = db.prepare('SELECT payload FROM projects ORDER BY id').all() as Payload<ExecutiveProject>[];
  return parseAll(rows);
}

export function getProject(id: string): ExecutiveProject | undefined {
  const row = db.prepare('SELECT payload FROM projects WHERE id = ?').get(id) as Payload<ExecutiveProject> | undefined;
  return row ? JSON.parse(row.payload) : undefined;
}

export function upsertProject(p: ExecutiveProject): void {
  db.prepare(
    'INSERT OR REPLACE INTO projects (id, code, title, status, priority_id, department_id, budget_source_id, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(p.id, p.code, p.title, p.status, p.priorityId, p.departmentId, p.budgetSourceId, JSON.stringify(p));
}

export function deleteProject(id: string): boolean {
  const info = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return info.changes > 0;
}

export function updateProjectStatus(id: string, status: ExecutiveProject['status']): ExecutiveProject | undefined {
  const project = getProject(id);
  if (!project) return undefined;
  const updated = { ...project, status };
  upsertProject(updated);
  return updated;
}

// --- Departments ----------------------------------------------------------

export function listDepartments(): Department[] {
  const rows = db.prepare('SELECT payload FROM departments ORDER BY id').all() as Payload<Department>[];
  return parseAll(rows);
}

export function upsertDepartment(d: Department): void {
  db.prepare('INSERT OR REPLACE INTO departments (id, name, code, payload) VALUES (?, ?, ?, ?)').run(
    d.id,
    d.name,
    d.code,
    JSON.stringify(d)
  );
}

export function deleteDepartment(id: string): boolean {
  const info = db.prepare('DELETE FROM departments WHERE id = ?').run(id);
  return info.changes > 0;
}

// --- Budget Sources -------------------------------------------------------

export function listBudgetSources(): BudgetSource[] {
  const rows = db.prepare('SELECT payload FROM budget_sources ORDER BY id').all() as Payload<BudgetSource>[];
  return parseAll(rows);
}

export function upsertBudgetSource(s: BudgetSource): void {
  db.prepare('INSERT OR REPLACE INTO budget_sources (id, title, code, payload) VALUES (?, ?, ?, ?)').run(
    s.id,
    s.title,
    s.code,
    JSON.stringify(s)
  );
}

export function deleteBudgetSource(id: string): boolean {
  const info = db.prepare('DELETE FROM budget_sources WHERE id = ?').run(id);
  return info.changes > 0;
}

// --- Crises & Harms -------------------------------------------------------

export function listCrisesHarms(): CrisisHarmItem[] {
  const rows = db.prepare('SELECT payload FROM crises_harms ORDER BY id').all() as Payload<CrisisHarmItem>[];
  return parseAll(rows);
}

export function upsertCrisisHarm(c: CrisisHarmItem): void {
  db.prepare('INSERT OR REPLACE INTO crises_harms (id, title, code, payload) VALUES (?, ?, ?, ?)').run(
    c.id,
    c.title,
    c.code,
    JSON.stringify(c)
  );
}

export function deleteCrisisHarm(id: string): boolean {
  const info = db.prepare('DELETE FROM crises_harms WHERE id = ?').run(id);
  return info.changes > 0;
}

// --- Executors ------------------------------------------------------------

export function listExecutors(): ProjectExecutor[] {
  const rows = db.prepare('SELECT payload FROM executors ORDER BY id').all() as Payload<ProjectExecutor>[];
  return parseAll(rows);
}

export function upsertExecutor(e: ProjectExecutor): void {
  db.prepare('INSERT OR REPLACE INTO executors (id, name, code, payload) VALUES (?, ?, ?, ?)').run(
    e.id,
    e.name,
    e.code,
    JSON.stringify(e)
  );
}

export function deleteExecutor(id: string): boolean {
  const info = db.prepare('DELETE FROM executors WHERE id = ?').run(id);
  return info.changes > 0;
}

// --- Contractors ----------------------------------------------------------

export function listContractors(): Contractor[] {
  const rows = db.prepare('SELECT payload FROM contractors ORDER BY id').all() as Payload<Contractor>[];
  return parseAll(rows);
}

export function upsertContractor(c: Contractor): void {
  db.prepare('INSERT OR REPLACE INTO contractors (id, name, payload) VALUES (?, ?, ?)').run(
    c.id,
    c.companyName,
    JSON.stringify(c)
  );
}

export function deleteContractor(id: string): boolean {
  const info = db.prepare('DELETE FROM contractors WHERE id = ?').run(id);
  return info.changes > 0;
}

// --- Users & Roles ----------------------------------------------------------

export function listUsers(): UserProfile[] {
  const rows = db.prepare('SELECT payload FROM users ORDER BY id').all() as Payload<UserProfile>[];
  return parseAll(rows);
}

export function listRolesPermissions(): SystemRolePermission[] {
  const rows = db.prepare('SELECT payload FROM roles_permissions ORDER BY role').all() as Payload<SystemRolePermission>[];
  return parseAll(rows);
}

// --- Audit Logs -----------------------------------------------------------

export function listAuditLogs(limit = 200): AuditLogItem[] {
  const rows = db
    .prepare('SELECT payload FROM audit_logs ORDER BY rowid DESC LIMIT ?')
    .all(limit) as Payload<AuditLogItem>[];
  return parseAll(rows);
}

export function addAuditLog(entry: AuditLogItem): void {
  db.prepare(
    'INSERT OR REPLACE INTO audit_logs (id, created_at, action_type, user_name, payload) VALUES (?, ?, ?, ?, ?)'
  ).run(entry.id, entry.timestamp, entry.actionType, entry.userName, JSON.stringify(entry));
}
