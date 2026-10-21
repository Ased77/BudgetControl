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

Both are fixed: `server.ts` now exports the app, and the Vite build targets
`public/` when `VERCEL` is set.

## How the deployment is wired

Vercel detects the **Express** framework from `package.json` + `server.ts`
(imports `express`) and applies two default rules: serve files from the build
output first, then send everything else to one Express function.

```
server.ts            default-exports the Express app  -> the Vercel function
                     (same file is the Docker/local bootstrap: it only calls
                     listen() when VERCEL is unset)
server/app.ts        createApp(): every /api route, no port, no lifecycle
vercel.json          `framework: "express"` (pins the preset from the repo, so a
                     dashboard preset cannot silently drop the function) +
                     buildCommand `vite build && node scripts/vercel-static.mjs`,
                     plus the SPA fallback rewrite (which must keep excluding
                     `api/` and `dev/` — anything else becomes index.html)
public/              copy of dist/ made by that script — the Express preset
                     serves static files from here (the directory is fixed)
static/              font sources copied into the build (Vite publicDir)
dist/                the one build output; Docker, local server and the copy step
```

- `/api/*` has no matching static file, so it reaches the Express function with
  the original path intact — no rewrites or path juggling.
- `/` and `/assets/*`, `/fonts/*` are served straight from `public/`.
- Any other path is rewritten to `/index.html` so a refresh or a shared link
  still boots the SPA.
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
- **Check that a function actually exists.** `vercel.json` pins
  `framework: "express"`, so the preset no longer has to be guessed — but a
  wrong **Root Directory** (anything but the repo root, where `server.ts`
  lives) still yields a deployment with no function. The tell is the shape of
  the 404: Vercel's own `text/plain` 404 with `X-Vercel-Error: NOT_FOUND` means
  the request never reached Express (no function, or the SPA rewrite caught
  it); a JSON `{"error":"Not found"}` means Express answered and the route
  simply is not mounted (dev routes with `APP_ENV=production`). `curl /api/health`
  is the fastest way to tell.

## One-time setup

1. **Environment variables** (Project → Settings → Environment Variables), for
   Production and Preview:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | `postgres://user:password@host:5432/dbname?sslmode=require` |
   | `PG_POOL_MAX` | `3` — each function instance opens its own pool |
   | `PG_CONNECTION_TIMEOUT_MS` | `5000` (optional, default) |
   | `APP_ENV` | `production` — the only value that unmounts the dev-only `/dev/*` routes (leave it unset on a throwaway preview where you want the seed panel) |

   Do **not** set `PORT` or `NODE_ENV`; Vercel provides them.

2. **Build settings** (Project → Settings → Build & Development Settings):
   Framework Preset **Express** (leave it on auto-detect), Root Directory =
   repository root. Clear any leftover **Output Directory** (`dist`) or build
   command from an earlier attempt — `vercel.json` supplies the build command,
   and the output directory is not configurable for Express.

3. **Seed the database once** from a machine that can reach it (optional, but it
   keeps the first request fast):

   ```bash
   DATABASE_URL='postgres://…?sslmode=require' bun run db:init
   ```

   Without this, the first request seeds ~22k rows inside the function. Vercel's
   default function duration (300s on Fluid compute) is plenty of room; if a
   project overrides it lower, seeds should be run first.

4. Deploy. The build runs `vite build` into `public/`, and `server.ts` is
   compiled into a single Node function with `express` and `pg`.

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
