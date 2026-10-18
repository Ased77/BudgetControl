# SQLite → PostgreSQL + Docker — runbook

> **Superseded data layer.** This document describes the *document-model*
> port (indexed scalar column + `jsonb payload`) that this repo shipped
> first. The data layer has since been rebuilt on **Drizzle ORM** with a
> normalized relational schema and versioned migrations — see
> [server/db/README.md](server/db/README.md) for the current architecture,
> commands (`db:generate`, `db:init`, `db:check`, `db:legacy:list`) and the
> document-model → normalized cutover runbook. Decision #2 below (raw SQL
> over an ORM) is the one this layer revisits; §5's prediction — "if schema
> evolution becomes frequent, Drizzle is the natural upgrade" — is what
> happened.

Everything below was executed against this repository: the SQLite data
(22,043 rows across 14 tables) was imported into `postgres:16-alpine`, the API
was exercised against it, and the container stack was built and started.

---

## 1. What changed and why

| File | Change |
| --- | --- |
| [server/database.ts](server/database.ts) | Rewritten on `pg` (node-postgres): connection pool, transactions, batched upserts, idempotent `initializeDatabase()`; every accessor is now `async`. |
| [server/config.ts](server/config.ts) | **New.** One place that turns environment variables into a validated `PoolConfig` (no password in any log line). |
| [server/schema.ts](server/schema.ts) | **New.** Single source of truth for the DDL, imported by the server, `db:init` and the importer. |
| [server.ts](server.ts) | All accessors awaited; `/api/health` now pings PostgreSQL and returns 503 when it is down; graceful shutdown on SIGTERM/SIGINT; Vite imported lazily (build tooling must not be a runtime dependency). |
| [scripts/db-init.ts](scripts/db-init.ts) | **New.** `bun run db:init` — applies the schema (idempotent). |
| [scripts/db-check.ts](scripts/db-check.ts) | **New.** `bun run db:check` — connection target, server version, schema version, per-table counts. |
| [scripts/wait-for-db.ts](scripts/wait-for-db.ts) | **New.** `bun run db:wait` — blocks until PostgreSQL answers. |
| [scripts/db-import-sqlite.ts](scripts/db-import-sqlite.ts) | **New.** `bun run db:import:sqlite` — the one-time data migration (reads SQLite through `bun:sqlite`, no native addon). |
| [Dockerfile](Dockerfile) | **New.** Multi-stage build; `runtime`, `builder` and `tools` targets. |
| [docker-compose.yml](docker-compose.yml) | **New.** `db` + `app` (+ on-demand `migrate`), healthchecks, volume, dedicated network. |
| [docker/entrypoint.sh](docker/entrypoint.sh) | **New.** Wait for the database → apply the schema → `exec` the command. |
| [.env.example](.env.example), [.dockerignore](.dockerignore), [.gitattributes](.gitattributes) | **New.** Environment template, build-context filter, LF enforcement for shell scripts. |
| [package.json](package.json) | `pg` added as the only new runtime dependency; build/client-only packages moved to `devDependencies`; `db:*` scripts added. |
| `src/services/api.ts`, `src/context/AppContext.tsx`, `src/components/SettingsView.tsx` | Comment/label accuracy (`SQLite` → `PostgreSQL`). |

---

## 2. Phase 1 — the PostgreSQL migration

### 2.1 Dependencies

```bash
bun add pg             # 8.23.1  — runtime, pure JavaScript
bun add -d @types/pg   # 8.23.1  — types for the above
```

That is the entire addition. `better-sqlite3` was **removed**: nothing in the
running application touches SQLite any more, and the one-time importer reads the
legacy file with `bun:sqlite`, which is compiled into the Bun runtime. No native
addon, no prebuilt-binary download and no C++ toolchain anywhere in the build —
which is also what lets the shipped image be Alpine.

### 2.2 Connection settings

Environment driven, one module ([server/config.ts](server/config.ts)):

```
DATABASE_URL                  # full URL; wins over the discrete variables
PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
PGPASSWORD_FILE               # Docker/Compose secret file
PGSSLMODE                     # disable | require | verify-full | no-verify
PG_POOL_MAX PG_CONNECTION_TIMEOUT_MS PG_IDLE_TIMEOUT_MS PG_STATEMENT_TIMEOUT_MS
```

A missing password fails at boot with an actionable message instead of surfacing
later as `password authentication failed`. An intentionally empty password must
be explicit (`PGPASSWORD=""`), so `pgpass`/trust setups still work.

### 2.3 Data-model changes

| SQLite | PostgreSQL | Why |
| --- | --- | --- |
| `TEXT` | `text` | Identical semantics, unbounded. |
| `INTEGER` (`priorities.code`) | `integer` | Verified integers in the existing data (`typeof(code) = 'integer'`). |
| `payload TEXT` (JSON) | `jsonb` | Validated on write, compact, queryable/indexable later without another migration. |
| `rowid` (audit_logs, analysis_sources ordering) | `seq bigint GENERATED ALWAYS AS IDENTITY` | No `rowid` in PostgreSQL. The importer replays SQLite's rowid order, and upserts never touch `seq`, so "newest first" is preserved and stable. |
| `INSERT OR REPLACE INTO …` | `INSERT … ON CONFLICT (…) DO UPDATE SET …` | SQLite's REPLACE deleted + re-inserted (hence the explicit column lists); the PostgreSQL upsert updates in place, which is what keeps the identity column meaningful. |
| `db.transaction(() => …)` | `withTransaction(async (client) => …)` | Explicit `BEGIN`/`COMMIT`/`ROLLBACK` on one pooled client. |
| `journal_mode = WAL`, `foreign_keys = ON` | — | PostgreSQL is always transactional; the old schema never declared a single FOREIGN KEY, so there was nothing to mirror (relations are soft by design — adding FKs would break the existing delete endpoints). |
| `ORDER BY rowid DESC LIMIT ?` | `ORDER BY seq DESC LIMIT $1` | Parameter placeholders change from `?` to `$n` throughout. |

### 2.4 The synchronous → asynchronous port

This is the change that touches the most call sites, and it is unavoidable:
SQLite answered inside the process, so `listProjects()` could return an array;
PostgreSQL answers over TCP, so it returns a promise.

* every exported accessor in [server/database.ts](server/database.ts) is `async`
* every call site in [server.ts](server.ts) `await`s it (the handlers became
  `async`, and the existing `wrap()` helper already turns a rejected promise
  into a 500 JSON error)
* `deletePriority()`-style helpers now return `Promise<boolean>`, so the
  conditions became `if (!(await …))`

Without this the routes would have serialised `Promise` objects into the API
responses and the UI would have silently received empty payloads.

### 2.5 Seeding and boot order

`initializeDatabase()` runs **before** the port opens, and is idempotent:

1. schema (DDL, under a PostgreSQL advisory lock so two replicas booting at once
   cannot race `CREATE TABLE IF NOT EXISTS`)
2. the main seed, gated by `app_meta.schema_version` (`5`) — ~22k rows inserted
   in batched multi-row statements
3. the analysis-sources seed, gated by its own flag
4. the two incremental repairs (priority titles, `OFFICE_HEAD` role/user)

Importing a migrated database copies `app_meta` too, so a migrated installation
boots straight past the seed and never regenerates data over the operator's.

### 2.6 Importing the existing data

```bash
# 0. stop the app writing to SQLite (the importer copies the file, but a live
#    writer can still produce an inconsistent snapshot)
# 1. validate, write nothing
bun run db:import:sqlite --dry-run
# 2. exact copy (wipes the target tables first, requires --yes or a TTY prompt)
bun run db:import:sqlite --truncate --yes
# 3. or merge, keeping edits already made in PostgreSQL
bun run db:import:sqlite
```

Flags: `--sqlite <path>` (default `data/csr-app.db`), `--in-place`,
`--allow-diff`, `--dry-run`, `--truncate`, `--yes`.

What it guarantees:

* `payload` documents are re-validated as JSON — invalid data aborts the whole
  import with the offending table and id, in one transaction
* U+0000 code points are stripped (`PostgreSQL rejects NUL bytes in text/jsonb`)
* `audit_logs` / `analysis_sources` are read in `rowid` order so identity values
  line up with the previous "newest first" listing
* row counts are compared at the end; any difference is a non-zero exit unless
  `--allow-diff`

---

## 3. Phase 2 — Docker

```bash
cp .env.example .env      # then set POSTGRES_PASSWORD (openssl rand -hex 32)
docker compose up -d --build
```

* **[Dockerfile](Dockerfile)** — four stages, pinned `oven/bun:1.4.2`.
  `deps` (manifests only, so code edits never re-install packages) → `builder`
  (Vite client bundle + esbuild server and CLI bundles) → `tools` (runtime
  dependencies + sources for the operational CLIs) → `runtime` (production
  dependencies + `dist/` only, non-root `bun` user, read-only root filesystem).
  The runtime stage is Alpine: the production tree (`express`, `pg`, `dotenv`)
  is pure JavaScript and Vite is imported lazily, so no native addon is ever
  loaded.
* **[docker-compose.yml](docker-compose.yml)** — `db` + `app` on a dedicated
  `backend` bridge network, `pgdata` volume for persistence, healthchecks for
  both, and `depends_on: condition: service_healthy` so the app starts only once
  `pg_isready` passes. `migrate` lives behind the `tools` profile.
* **[docker/entrypoint.sh](docker/entrypoint.sh)** — `wait-for-db` →
  `db-init` → `exec` the command, with `exec` so SIGTERM reaches the server and
  the graceful shutdown runs.
* **[.dockerignore](.dockerignore)** — keeps `node_modules`, `dist`, `data/`
  (52 MB SQLite) and `.env*` out of the build context.
* **[.env.example](.env.example)** — every required and optional variable, with
  the ones used only by host-side tooling documented separately.
* **[.gitattributes](.gitattributes)** — forces LF on `*.sh` and `.env*`: a CRLF
  shebang (`/bin/sh^M: bad interpreter`) is a classic Windows-to-container
  failure, and a trailing CR inside a compose variable silently corrupts a
  password.

Redis / Nginx / Celery are **not** added, because this application does not use
them: there is no queue, no background worker, no session store and no cache —
every request is a database query. Adding them would be unused surface area. If
TLS termination is needed, put nginx/Caddy/Traefik in front of
`127.0.0.1:${APP_HOST_PORT}`.

---

## 4. Phase 3 — Run, migrate, verify

### 4.1 Build and run

```bash
cp .env.example .env                                  # set a real password
docker compose up -d --build                          # db + app
docker compose ps                                     # both healthy
docker compose logs -f app                            # boot + seed output
open http://127.0.0.1:${APP_HOST_PORT:-3000}          # UI
curl -s http://127.0.0.1:3000/api/health | jq .       # database.ok == true
```

### 4.2 Running migrations inside the container

The entrypoint already ran `db-init` before the server started, and the server
re-applies the schema and seed on every boot (idempotent). Two command styles
exist, and it is worth knowing which image supports which:

```bash
# --- app image (dist/ + production dependencies only) ----------------------
docker compose exec app bun dist/cli/db-check.cjs            # report, exit 1 if not ready
docker compose exec app bun dist/cli/db-init.cjs             # apply schema again
docker compose exec app bun dist/cli/db-init.cjs --hardening # + optional indexes

# --- tools image (same dependencies + TypeScript sources) ------------------
# Used for anything that reads the legacy SQLite file or the TS sources.
docker compose --profile tools run --rm migrate bun run db:check
docker compose --profile tools run --rm migrate               # the import itself
# full control over the flags:
docker compose --profile tools run --rm migrate \
  bun run db:import:sqlite --sqlite /legacy/csr-app.db --dry-run
```

On the host, both forms work with the project's own tooling:
`bun run db:check`, `bun run db:init`, `bun run db:import:sqlite` (the last one
needs `PGHOST=localhost` and `PGPORT=${POSTGRES_HOST_PORT}` from `.env`).

### 4.3 Verification checklist

| # | Check | Command | Expected |
| --- | --- | --- | --- |
| 1 | Containers healthy | `docker compose ps` | `db` and `app` both `healthy` |
| 2 | API ↔ database wired | `curl -s localhost:3000/api/health` | `"status":"ok"`, `"persistence":"postgresql"`, `"database":{"ok":true,…}` |
| 3 | Schema + data present | `docker compose exec app bun dist/cli/db-check.cjs` | `14/14 tables present`, `expected v5 · found v5`, non-zero counts |
| 4 | Counts match SQLite | `bun run db:import:sqlite --dry-run` (host) or the `migrate` service output | every line `OK … n -> n` |
| 5 | Ordering survived | `curl -s localhost:3000/api/audit-logs?limit=3` | same ids, newest first, as the SQLite app returned |
| 6 | Writes work | `curl -X POST localhost:3000/api/audit-logs -H 'content-type: application/json' -d '{"id":"check-1","timestamp":"now","userName":"check","userRole":"ADMIN","actionType":"SYSTEM_UPDATE"}'` | `201 {"ok":true}` |
| 7 | Deletes work | `curl -X DELETE localhost:3000/api/audit-logs/…` … or any `DELETE` | `{"ok":true}` |
| 8 | Bulk import path | `curl -X PUT localhost:3000/api/priorities/import -H 'content-type: application/json' -d '[]'` | `{"count":0}` |
| 9 | Data survives a restart | `docker compose restart app && curl -s localhost:3000/api/projects \| jq length` | unchanged count (proves the volume, not memory) |
| 10 | Data survives a rebuild | `docker compose down && docker compose up -d` | unchanged count (volume kept; only `down -v` deletes it) |
| 11 | Degraded mode | `docker compose stop db` then `curl -i localhost:3000/api/health` | `503` + `"status":"degraded"` before any data is served |
| 12 | Graceful shutdown | `docker compose stop app` (watch `logs`) | `[api] SIGTERM received — draining`, exit 0 |

### 4.4 Rollback

The SQLite file is untouched by everything above.

```bash
git revert <migration commit>        # back to better-sqlite3
bun run dev                          # data/csr-app.db still has all rows
```

Wipe the PostgreSQL data only if the migration is being re-run from scratch:
`docker compose down -v` (the `-v` is what deletes `pgdata`).

---

## 5. Architectural decisions

**1. Port the existing document model, do not normalise it.**
The tables store indexed scalar columns plus a JSON `payload` holding the whole
entity, and the API serves that exact object. Options were:
*Keep the shape* (chosen) — the smallest correct change, zero UI risk, JSONB
gets validation and future indexability. *Normalise into relational tables* —
better for SQL reporting and constraints, but it means rewriting every accessor,
mapping every field and re-testing the whole UI, for no user-visible gain today.

**2. Raw SQL instead of an ORM (Prisma/Drizzle/TypeORM).**
An ORM would generate the same statements while adding a schema file, a code
generation step, a client runtime and a second source of truth for the types
that [src/types.ts](src/types.ts) already defines. Raw SQL keeps the mapping
reviewable and the migration boring. If schema evolution becomes frequent,
Drizzle (SQL-shaped, no codegen lock-in) is the natural upgrade.

**3. Seed with batched statements, not an ORM's `createMany`.**
~22k rows x 500-row statements = ~45 round trips, finishing in seconds. The
alternative — one statement per row — takes a minute and makes a first boot look
hung.

**4. Alpine runtime, Debian builder.**
Alpine is the smallest official base, but musl-compatible prebuilt native
binaries are not guaranteed for build tooling, so the build runs on Debian slim
while the shipped image is Alpine. Nothing native survives into the runtime
image, which is what makes that split safe. (The first build attempt proved the
point: with `better-sqlite3` as a dev dependency, the Debian build fell back to
`node-gyp`, had no compiler, and failed — replacing it with `bun:sqlite`
removed the class of failure altogether rather than bolting a toolchain onto the
image.)

**5. Entry point waits instead of relying on `depends_on`.**
`service_healthy` orders container start, not application readiness. Waiting in
the container also makes the image work under schedulers that know nothing about
compose. The cost is one small loop at startup.

**6. Truncate-on-import versus merge.**
`--truncate` gives exact parity (including rows deleted in SQLite) and is the
right choice for a one-time cutover with the app stopped. Plain `upsert` is
idempotent and non-destructive, which is right when PostgreSQL already holds
newer operator edits, but rows deleted in SQLite survive. Both are supported;
neither is automated — a destructive default would be a trap.

---

## 6. Security & best practices

Already in place:

* **No secret in the image or the compose file.** Values arrive through
  `${…}` interpolation from a gitignored `.env`; the app container receives only
  the variables it needs, and no `.env` is copied into any stage.
* **`PGPASSWORD_FILE` / Compose secrets** are supported for schedulers that
  mount secrets as files, which keeps values out of `docker inspect`.
* **Non-root, read-only, no-new-privileges, init.** The app runs as the
  unprivileged `bun` user on an immutable root filesystem with a `tmpfs` for
  `/tmp`; a compromised process cannot modify the application code.
* **Least-privilege database ports.** PostgreSQL and the app are published on
  loopback only. Nothing is reachable from the network by default.
* **Parameterised SQL everywhere.** Every value travels as a bound parameter
  (`$1…$n`); no user input is concatenated into a statement.
* **Pool error handling and timeouts.** `pool.on('error')` prevents an idle
  client error from killing the process; connection and statement timeouts stop
  a hung query from pinning a connection forever.
* **Health as a real check.** `/api/health` returns 503 while the database is
  unreachable, so a broken stack is visible to the orchestrator rather than
  serving errors.

Recommended next:

1. **Rotate the password** that was used during the first cutover, and store it
   in Compose secrets or the platform's secret manager.
2. **Terminate TLS in front of the app** (nginx/Caddy/Traefik) and only then
   widen the port binding. Add `app.set('trust proxy', 1)` when a proxy is in
   front so client IPs in logs stay meaningful.
3. **Back up the volume**: `docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backup-$(date +%F).sql.gz`,
   on a schedule, with a restore rehearsal. A volume is not a backup.
4. **Apply the optional indexes** (`bun run db:init --hardening`) only when
   filtering moves into SQL; today the server filters in JavaScript, exactly as
   it did on SQLite.
5. **Restrict CORS / add auth** if the API is ever exposed beyond a trusted
   network: there is no authentication layer in front of these endpoints yet.
6. **Consider a locale-aware collation** (`--locale-provider=icu --icu-locale=fa-IR`)
   if you ever sort Persian text in SQL. It must be decided at `initdb` time;
   after that it needs a dump/restore. The application sorts in JavaScript today.
7. **Log retention and monitoring**: the stack rotates container logs
   (`max-size: 10m`, `max-file: 3`) and logs slow queries
   (`log_min_duration_statement`), so connect them to whatever you already use
   for alerting.
