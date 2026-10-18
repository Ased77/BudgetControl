# Data-access layer (`server/db`)

A production-grade relational data-access layer on **Drizzle ORM +
`node-postgres`**, replacing the idempotent-DDL / `jsonb payload` document
model with a **normalized, versioned-migration** architecture.

## What changed, in one paragraph

The previous layer (`server/database.ts`, ~850 lines) kept every entity as a
JSON payload plus a few indexed scalar columns — the deliberate shape of the
SQLite→PostgreSQL port documented in `MIGRATION-POSTGRES.md`. This layer keeps
the compensation terms of that trade-off and removes the debt: every field is
now a typed column (`bigint` money, `double precision` scores, native
`text[]` lists), relationships are real FOREIGN KEYs, all display names are
derivable by joins instead of copied into JSON, indexing and CHECK
constraints are declared in TypeScript (`server/db/schema.ts`) and applied
through **versioned migration files** whose history is `server/migrations/`.

## Layout

```
server/db/
├── client.ts                        # the ONE drizzle client over the env-configured pg pool
├── schema.ts                        # all 16 tables: columns, FKs, indexes, CHECK constraints
├── relations.ts                     # drizzle relation graph (for `db.query.… with:` eager loads)
├── errors.ts                        # typed DB errors: ConflictError(409),
│                                    #   ReferentialViolationError(409), TransactionConflictError(503
│                                    #   retryable), StatementTimeoutError(503), NotFoundError(404)
├── transactions.ts                  # withTransaction · withTransactionRetrying · withSavepoint
├── seed.ts                          # one-time, transactional fresh-database seed (~22k rows)
├── repairs.ts                       # idempotent incremental data repairs
├── initialize.ts                    # runMigrations → seedIfEmpty → repairs; boot entrypoint
├── schema-tables.ts                 # table registry for operational tooling
├── index.ts                         # public barrel
└── repositories/
    ├── helpers.ts                   # sort whitelist, pagination typing, assertFound
    ├── organization.repository.ts
    ├── location.repository.ts        # 1:1 indicators example
    ├── priority.repository.ts        # bulk-replace example, window-function pagination
    ├── project.repository.ts         # 8-way join/pagination/junction + N+1 avoidance
    ├── lookup.repository.ts          # departments · budget_sources · crises · executors · contractors
    ├── user.repository.ts            # users + role matrix
    ├── audit-log.repository.ts       # seq-ordered trail + filtered page
    └── analysis-source.repository.ts

server/migrations/
├── 0000_create_normalized_schema.sql # + legacy rename guard (document model → legacy_*)
├── 0001_import_legacy_documents.sql  # payload → normalized rows (JSONB expansion)
└── meta/_journal.json                # drizzle migration journal
```

## How the API still works

Routes (in `server/app.ts`) keep calling the historical accessors exported by
the `server/database.ts` **facade**, which now delegates to repositories.
New code should import repositories directly:

```ts
import { projectRepository } from './server/db/index.js';

const page = await projectRepository.listProjectsPage({
  county: 'شهرستان اهواز',
  status: 'IN_PROGRESS',
  orderBy: 'progressPercentage',
  descending: true,
  limit: 50,
});
```

## Boot & commands

| command | what it does |
| --- | --- |
| `bun run db:init` | apply pending migrations (idempotent; advisory-locked) |
| `bun run db:generate` | generate a new migration from `schema.ts` changes |
| `bun run db:check` | report: applied migrations, seed gate, per-table counts |
| `bun run db:legacy:list` | report remaining `legacy_*` staging tables |
| `bun run db:import:sqlite` | stage legacy SQLite rows into `legacy_*` then normalize, reusing migration 0001 |

Boot sequence in the server (`initializeDatabase()`):
1. **migrate** under a `pg_advisory_lock` so replicas race-free apply DDL;
2. **seed** a fresh database *only* — gated by `app_meta.seeded` inside the
   same transaction, so a crash mid-seed retries cleanly;
3. **repairs** — idempotent (priority-titles refresh, OFFICE_HEAD role).

Legacy installs (pre-Drizzle, document model) are vacated by migration 0000
(tables renamed to `legacy_*`) and normalized by 0001 in the same run; the
verify/drop runbook is below.

## Extending with a new entity

1. **Schema** — add the table to `server/db/schema.ts` (typed columns, FKs,
   CHECKs, indexes) *and* to `server/db/schema-tables.ts`.
2. **Migrations** — `bun run db:generate --name add_my_table`; review the
   emitted SQL; if it can destroy data, hand-edit first. Apply with
   `bun run db:init`.
3. **Relations** — declare the graph edges in `server/db/relations.ts`.
4. **Repository** — create `my-entity.repository.ts` next to the others:
   list/get/upsert/delete at minimum (see `lookup.repository.ts` for the
   minimal shape and `project.repository.ts` for joins + junctions).
   Export it from `server/db/index.ts`.
5. **Facade** (optional, for route compatibility) — add a delegation line in
   `server/database.ts`, or switch the route to the repository directly.
6. **Seed** — if built-in data is expected on fresh installs: add the slice
   into `server/db/seed.ts` in FK-safe order (parents first).

## Conventions

* **No SQL injection surface**: repositories use the schema-typed query
  builder (bound parameters only); user-text filters go through `ilike`
  binding; sorting is a **server-side whitelist** contract
  (`SORTABLE` maps + `orderExpression`).
* **Money** is `bigint` (mode 'number') — exact integer Toman values; never
  `float`. Percentages/scores are `double precision` clamped by CHECKs.
* **FKs** use NO ACTION: deletes of referenced parents fail with a mapped
  `ReferentialViolationError` (HTTP 409). Cascades only exist where a child
  cannot exist alone (`location_indicators`, `project_contributions`).
* **Transactions**: raw pool work must be avoided; use
  `withTransactionRetrying` (auto-retries serialization failures and
  deadlocks) or, inside a transaction body, `withSavepoint`.
* **N+1**: display-name resolution is one LEFT JOIN statement; junction
  batches are one `IN (...)` per page — never one query per row.

## Generalized examples — business code ⇄ repositories

```ts
// 1) Simple lookup repositories: list / upsert / delete
import { upsertDepartment, listDepartments, deleteDepartment } from './db/repositories/lookup.repository.js';

// 2) Transactions + savepoint nesting
import { withTransactionRetrying, withSavepoint } from './db/db/transactions.js';
await withTransactionRetrying(async (tx) => {
  await tx.insert(projects).values({ ... });
  await withSavepoint(tx, async (sp) => { ...independent part... });
});

// 3) SQL-side pagination, sorting, filtering (white-listed sort fields)
const page = await projectRepository.listProjectsPage({
  status: 'IN_PROGRESS', county, search: 'آب',
  orderBy: 'estimatedCostToman', descending: true, limit: 20,
});
// Aggregation example: status counts per county
const counts = await projectRepository.countProjectsByStatus(county);

// 4) Survey DAOs over the junction (many-to-many with shares)
await upsertProject({ ..., contributingDepartments: [...] });

// 5) Error handling decisions at the boundary
try {
  await upsertProject(payload);
} catch (error) {
  if (error instanceof NotFoundError) return res.status(404)…
  if (error instanceof ConflictError) return res.status(409)…
  if (error instanceof ReferentialViolationError) return res.status(409)…
  if (error instanceof TransactionConflictError) return res.status(503).setHeader('Retry-After','1')…
}
```

## Cutover runbook (document-model → normalized)

1. **Stop the old app** (`docker compose stop app`) — otherwise it keeps
   writing payload rows into renamed-away tables.
2. `bun run db:init` — migrates (renames legacy tables + imports data).
3. `bun run db:check` — all 16 tables present, `legacy_*` reported.
4. Spot-check endpoints (e.g. `curl /api/projects`, `/api/audit-logs?limit=3`).
5. Rebuild and start the app image: `docker compose up -d --build`.
6. **Drop the safety net only after verification**, e.g.
   ```sql
   DROP TABLE legacy_organization, legacy_locations, …, legacy_app_meta CASCADE;
   ```
   (`bun run db:legacy:list` prints the exact statement.)
7. Rollback path (before dropping `legacy_*`): `git revert` the drizzle
   commit and re-start — the legacy tables are untouched.

## Migrations and Docker

```
bun run db:generate                # open "drizzle.config.ts" schema, emit SQL migration
bun run db:init                    # apply all pending migrations
bun run build                      # copies server/migrations → dist/migrations (runtime images)
docker compose --profile tools run --rm migrate bun run db:init
```

Environment variables: unchanged from before (the old `server/config.ts`
path feeds the same pool); new optional variable `DB_SKIP_MIGRATIONS=1` for
pre-migrated serverless targets whose bundle cannot ship the migrations
folder.
