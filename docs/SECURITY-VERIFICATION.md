# Server-side security verification record

> Task: `E0-SEC-1` (server-side security verification and stale documentation).
> Status: **not run** — no verification record exists for the current commit.
> This file is both the checklist and the retained evidence record.

## 1. Scope and procedure

| Field | Value |
|---|---|
| Commit under test | _(full SHA)_ |
| Environment | Local PostgreSQL + `bun run dev` (repeat against the deployed preview if one exists) |
| Required accounts | `SYSTEM_ADMIN`; one role without each tested permission; two accounts with different `allowedLocationId` / `scopeLevel` |
| Verifier | _(name and role)_ |
| Date | _(Persian and ISO)_ |
| Overall result | _(Pass only when every row is Pass or an approved N/A)_ |

Rules:

- Every row needs a result: `Pass`, `Fail`, `Blocked` or `N/A` with a reason.
  A blank row is not a result.
- Evidence is a short request/response or log excerpt plus the timestamp; never
  paste tokens, cookies, passwords, OTP codes or connection strings.
- A `Fail` blocks `E0-SEC-1` and is fixed and re-run before sign-off.
- `N/A` is allowed only where the surface does not exist in this build; state
  why.

Useful probes (adjust host/port to the running server):

```bash
# S1 — anonymous business API
curl -i http://localhost:3000/api/projects

# S6 — audit log without permission
curl -i http://localhost:3000/api/audit-logs

# S10 — development-only routes outside development
APP_ENV=production curl -i http://localhost:3000/dev/seed-users
```

Signed-in checks use the seeded development accounts exposed by the local
development login panel; do not record their credentials here.

## 2. Checklist and evidence

| ID | Check | Method | Expected | Result | Evidence |
|---|---|---|---|---|---|
| `S1` | Anonymous API access | Call representative `GET`/`POST` routes for projects, priorities, budgets, crises, audit logs and taxonomy without a cookie or bearer token | `401` with code `AUTH_REQUIRED`; no data or mutation | | |
| `S2` | Permission enforcement on mutations | For every mutating route in `docs/API_DOCS.md` §5, sign in as a role lacking the documented flag and repeat with a role holding it | Missing flag → `403 FORBIDDEN`; held flag → success; `SYSTEM_ADMIN` bypass is intentional | | |
| `S3` | Identity and ownership from session | Send body/query `createdByUserId`, `updatedByUserId`, `actorUserId` and another user's id on create/update | Server ignores or overwrites with the session user; no foreign id persists | | |
| `S4` | Location / tenant isolation | With two accounts of different `allowedLocationId` / `scopeLevel`, read, update and delete each other's priority, project, budget and audit records | Foreign records are filtered or rejected; no cross-scope write succeeds | | |
| `S5` | Session controls | Inspect `csr_at` / `csr_rt` cookies and auth config; wait out or force access expiry; refresh twice; revoke via a password change | Access ≈ 15 min, refresh ≈ 4 h absolute, rotation on refresh, old family revoked, `httpOnly` always and `Secure` in production, revocation via `tokensValidFrom` | | |
| `S6` | Audit trail | Trigger login, logout and a mutation; read `/api/audit-logs` with and without `canAuditLogs`; inspect the dashboard shortcut as each role | Events written with the correct `actorUserId`; list and create gated by `canAuditLogs`; shortcut hidden without it | | |
| `S7` | Error and secret hygiene | Force a validation error, a 404, a 409 and a database outage; search the client bundle and server logs for credentials | No SQL, stack trace or secret in responses; database outage → `503`; no secret in bundle or logs | | |
| `S8` | Authentication abuse controls | Exceed OTP request and verify limits from one IP; try a wrong mobile and a wrong password | OTP request `6 / 10 min / IP`, verify `20 / min / IP`, generic errors that do not disclose account existence | | |
| `S9` | Documentation matches guards | Compare `docs/API_DOCS.md` §2 and §5 with `server/app.ts` and route files; search for stale `(gap)` markers | Write-guard statement present, every mutating route shows its 🔑 flag, no stale warning remains | | |
| `S10` | Development routes fail closed | Request `/dev/seed-users` and `/dev/seed-users/:id/credentials` with `APP_ENV=production`, with `APP_ENV` unset, and once with `DEV_SEED_LOGIN=1` on a non-deployed run | Production and unset → `404` with code `NOT_FOUND` and no SPA fallback; only an explicit `APP_ENV=development`, `VERCEL_ENV=development` or `DEV_SEED_LOGIN=1` opts in | | |

## 3. Documentation correction

The stale warning in `docs/API_DOCS.md` §2 previously claimed several mutating
routes were authenticated but not permission-gated. Correction `50ab01a`
replaced it with the as-implemented write-guard statement and added the missing
🔑 flags in §5. `S9` verifies that correction against the code and is not
complete until the table matches every route.

## 4. Sign-off

| Field | Value |
|---|---|
| Verifier name | |
| Verifier role | |
| Decision | _(Verified / Failed — see result)_ |
| Date | |
| Commit | |

The verifier must be a `SYSTEM_ADMIN` («مدیر سامانه») or a technical lead
nominated by one. After signing, record the result in the Phase 0 status in
`docs/BACKLOG.md` with this file's path, the commit, the date and the verifier.

## 5. Record change log

| Date | Change | By |
|---|---|---|
| 2026-11-09 | Record created with `S1` … `S10`, method, expected results and evidence fields; not yet run | Backlog ambiguity revision |
