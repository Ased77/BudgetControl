# Deploying to Vercel

## Why the deployment returned `404 NOT_FOUND`

Vercel's 404 on **every** path (including `/`) means the deployment had nothing
to serve: no recognised entry point and no static output. This project had both
problems:

1. **No entry Vercel recognises as a backend.** `server.ts` existed, but the
   app was built inside an `async function startServer()` and the module
   exported nothing. Vercel's Express detection looks for `app`, `index` or
   `server` files (project root or `src/`) that *export* the Express app or
   start a port listener — a nested, awaited `listen()` is neither.
2. **No build output in the directory Vercel serves.** The Express preset
   serves static files from `public/`, while Vite wrote the client to `dist/`,
   so even a successful build left nothing at the web root.

Static output is fixed by the build command copying the Vite build into
`public/`, and the backend by `api/handler.ts`, which Vercel builds as a Node
Function whatever the framework preset says. See the wiring section below.

## How the deployment is wired

**The API ships as a Node Function in `api/`, not via the Express framework
preset.** The preset was tried first (`framework: "express"` pinned in
`vercel.json`, root `server.ts` default-exporting the app), but deployments
built from it served the SPA only: `/api/health` answered Vercel's plain-text
`NOT_FOUND`, i.e. no function was created at all. A file under `api/` is built
as a function for **every** preset, so that is now the entry point.

```
api/handler.ts       the Vercel Function: delegates to the Express app, nothing
                     else (no routes, middleware or auth duplicated)
server/serverless.ts the app + the one-shot initializeDatabase() promise,
                     importable without the local bootstrap side effects
server/rewrite-path.ts  restores the original path from the `__original` query
server.ts            Docker/local bootstrap; also default-exports the same app
server/app.ts        createApp(): every /api route, no port, no lifecycle
vercel.json          rewrites `/api/:path*` and `/dev/:path*` to
                     `/api/handler?__original=…` (a rewrite replaces the path a
                     function sees, so the original is carried in the query),
                     plus buildCommand `VITE_APP_ENV=production vite build &&
                     node scripts/vercel-static.mjs` and the SPA fallback rewrite
public/              copy of dist/ made by that script — the CDN serves it
static/              font sources copied into the build (Vite publicDir)
dist/                the one build output; Docker, local server and the copy step
```

- `/api/*` and `/dev/*` are rewritten to the function; `server/app.ts` restores
  the path before routing, so Express sees exactly what the client requested.
- `/` and `/assets/*`, `/fonts/*` are served straight from `public/`.
- Any other path is rewritten to `/index.html` so a refresh or a shared link
  still boots the SPA. The SPA pattern must keep excluding `api/` and `dev/`.
- `initializeDatabase()` runs once per function instance on the first request
  (schema, seed, version-gated repairs), serialized by a transaction-scoped
  PostgreSQL advisory lock so two cold starts cannot seed the same rows at the
  same time.

### Two traps that fail a deployment quietly

- **Do not put `functions` patterns in `vercel.json` for this project.** They
  only match files inside an `api/` directory; a pattern such as `server.ts`
  aborts the build with *"The pattern \"server.ts\" defined in `functions`
  doesn't match any Serverless Functions inside the `api` directory"*. The alias
  then keeps serving the previous deployment, which looks exactly like the
  change "not taking effect". Function duration is a project setting (default
  300s on Fluid compute).
- **Check that a function actually exists.** Read the shape of the 404:
  Vercel's own `text/plain` 404 with `X-Vercel-Error: NOT_FOUND` means the
  request never reached Express (no function was built, or a rewrite sent it
  elsewhere); a JSON `{"error":…}` means Express answered and the route itself
  said no (`{"error":"Not found"}` for the dev routes, which are never mounted
  on Vercel, or a 401 from the `/api` guard for an unknown API path).
  `curl -i /api/health` is the fastest way to tell.
- **A failed build leaves the previous deployment live.** The alias keeps
  serving the last successful build, so a change can look "not applied" when it
  simply never shipped. Compare the bundle hash in `dist/index.html` with the
  one the site serves before debugging anything else.

## One-time setup

1. **Environment variables** (Project → Settings → Environment Variables), for
   Production and Preview:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | `postgres://user:password@host:5432/dbname?sslmode=require` (a platform-injected `POSTGRES_URL` is accepted as a fallback, with a warning) |
   | `AUTH_JWT_SECRET` | `openssl rand -hex 32` (≥ 32 chars) — signs session tokens; without it the app **boots** but every `/api/auth/*` route and the login page fail with `[auth] AUTH_JWT_SECRET is missing or shorter than 32 characters` |
   | `PG_POOL_MAX` | `3` — each function instance opens its own pool |
   | `PG_CONNECTION_TIMEOUT_MS` | `5000` (optional, default) |
   | `APP_ENV` | `production` (recommended) — the dev-only `/dev/*` routes are never mounted on a Vercel deployment anyway, so this is belt-and-braces rather than the primary gate |

   Do **not** set `PORT` or `NODE_ENV`; Vercel provides them.

   `DATABASE_URL` is not optional: `server/db/client.ts` builds the pool from
   the environment **at module load**, so a deployment without it fails every
   request with Vercel's opaque `FUNCTION_INVOCATION_FAILED` 500. `api/handler`
   now catches that boot failure and answers `500 {"code":"FUNCTION_BOOT_FAILED",
   "error":"…"}` with the reason (the dev seed panel shows it too), but the fix
   is setting the variable for both Production and Preview and redeploying.

   **`[config] No PostgreSQL password configured`** (the message the dev seed
   panel shows as `GET /dev/seed-users failed: 500`) means the function's
   environment has no connection URL and no `PGPASSWORD`. Check, in order:

   1. The variable exists for the *environment you are viewing* — a preview URL
      reads Preview variables, not Production ones.
   2. `POSTGRES_PASSWORD` from the Compose section of `.env.example` is **not**
      read by the app; the client wants `DATABASE_URL` or `PGPASSWORD`. The
      error now names those misplaced variables when it sees them.
   3. Redeploy after adding the variable; existing deployments keep their env.
   4. The host is reachable from Vercel — `localhost`/a Compose database never
      is, so point it at a hosted PostgreSQL endpoint (Neon, Supabase, RDS…).

   The message ends with a one-line audit — `Database variables this process
   received: none found (vercel, production)` — listing the recognized names
   that exist and whether each is empty. It never contains a value, so it is
   safe to paste. The boot-failure JSON carries the same data under `database`,
   which distinguishes "the variable never reached this deployment" (empty
   list) from "the variable exists but is blank" (`state: "empty"`).

   Read the audit before touching the code — it is the answer, not a symptom:

   | Audit says | Meaning | Fix |
   | --- | --- | --- |
   | `none found` | This deployment's runtime env has **no** recognized name. The code never ran, so nothing in `server/config.ts` can be at fault. | The value is in another project, another environment (Development only), the name has a typo/trailing space, or it was added **after** this deployment was built. |
   | `DATABASE_URL=empty` | The name exists with a zero-length value (dashboard row created but left blank, or a CI `--env` with no value). | Set the value, redeploy. |
   | `POSTGRES_URL=set` | A platform integration injected its own name. | Works with a warning; add `DATABASE_URL` explicitly to make the config portable. |
   | `PGPASSWORD=set` | Discrete variables only. | Fine, but `DATABASE_URL` (or `PGSSLMODE=require`) is preferred for a TLS-terminating host. |

   `AUTH_JWT_SECRET` missing is **not** part of this audit: auth is validated
   lazily, so the DB error masks it. After the database starts working the next
   failure is `[auth] AUTH_JWT_SECRET is missing or shorter than 32 characters`.
   Set both variables in the same visit.

   The dev seed feature is not available here by design: `isDevEnvironment()`
   rejects every deployed Vercel context, so `/dev/seed-users` is a 404 and the
   login page shows the real auth form only (the build also has
   `VITE_APP_ENV=production`). To exercise the seed accounts, use the local
   Docker stack or `vercel dev`.

2. **Build settings** (Project → Settings → Build & Development Settings):
   Root Directory = repository root (the folder containing `api/` and
   `server.ts`), and no **Output Directory** override. Either preset works:
   **Vite** serves the build from `dist/`, **Express** from `public/` — both
   directories exist after the build, and `api/handler.ts` is built regardless.
   The preset no longer decides whether the API exists, so there is nothing
   left to pin in `vercel.json`.

3. **Seed the database once** from a machine that can reach it (optional, but it
   keeps the first request fast):

   ```bash
   DATABASE_URL='postgres://…?sslmode=require' bun run db:init
   ```

   Without this, the first request seeds ~22k rows inside the function. Vercel's
   default function duration (300s on Fluid compute) is plenty of room; if a
   project overrides it lower, seeds should be run first.

4. Deploy. The build runs `vite build` into `public/`, and `api/handler.ts` is
   compiled into a Node function with `express` and `pg`; `vercel.json` sends
   `/api/*` and `/dev/*` to it.

## Verify after deploying

```bash
curl -s https://<deployment>/api/health
# {"status":"ok",…,"database":{"ok":true,"schemaVersion":"5",…}}

curl -sI https://<deployment>/ | head -1            # 200, text/html (CDN)
curl -s https://<deployment>/api/locations | head -c 80   # JSON array
```

Then open the site, hard-refresh a deep link and confirm the SPA still boots.

## Limits worth knowing

- **No background work.** Everything must fit in one request. The default
  duration on Fluid compute is 300s; it is not configured in `vercel.json`
  because `functions` patterns only match files under `api/` — a pattern for
  `server.ts` fails the build with "doesn't match any Serverless Functions".
- **Cold starts.** A fresh instance pays for the connection plus one version
  check; the seed only runs when the schema version is missing.
- **Connection count.** Serverless concurrency multiplies pools, so use a pooled
  endpoint (Neon/Supabase pooler) and keep `PG_POOL_MAX` low.
- **Ephemeral filesystem.** Nothing is written to disk; PostgreSQL is the only
  store. Docker/`server.ts` remains the deployment for anything that needs a
  persistent process.
