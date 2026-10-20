# Authentication architecture — verified `user_id` from the first byte

This document is the contract for how identity works in BudgetControl.
`user_id` (`auth_users.id`, a UUID) is real from the very first step: it
exists only where credentials were verified, is validated server-side on
**every** request, and is the FK target of every business row's actor
column. There is no guest id, no impersonation, no client-assigned id.

---

## 1. Flow, end to end

```
                 ┌───────────────────────────── the SPA ─────────────────────────────┐
mobile+password  │  LoginView → AuthContext.login()                                  │
 ───────────────►│      fetch POST /api/auth/login  (credentials:'include')          │
                 └──────────────────────── correlator ───────────────────────────────┘
                              │
                              ▼
 Express  authRouter
   · /register  hashPassword(scrypt) → INSERT auth_users  ← user_id minted HERE
   · /login     verifyPassword → issueSession()
   · /refresh   rotate (reuse detection → family revoke)
   · /logout    revoke family + clear cookies
                              │
                              ▼
 issueSession():
   access  = JWT HS256 { sub: auth_users.id, role, departmentId,
                         allowedLocationId, iat, exp=15min, iss, aud }
   refresh = 48 random bytes (base64url), cookie only
   DB      = INSERT refresh_tokens(id, userId, sha256(refresh), familyId, exp)
   cookies = csr_at (httpOnly, path=/)  ·  csr_rt (httpOnly, path=/api/auth)
                              │
                              ▼ (every subsequent request)
 requireAuth middleware                    (server/auth/middleware.ts)
   1. token present?            → 401 AUTH_REQUIRED
   2. signature/exp/iss/aud ok? → 401 (expired vs forged, same outcome)
   3. user row still exists?    → 401 (deleted mid-flight)
   4. account active?           → 401 (admin lockout)
   5. iat ≥ tokens_valid_from?  → 401 (global-revocation gate)
   ⇒ req.auth = { userId, role, departmentId, allowedLocationId }
                              │
                              ▼
 requirePermission('canCreateProject') …   (roles_permissions matrix, 30s cache)
   verifies role: ─✔─▸ handler
                  └─✘─▸ 403 FORBIDDEN
                              │
                              ▼
 Route handler passes actorId(req)  — req.auth.userId, the ONLY legal read
   ↳ upsertProject(project, actorId) → repo stamps projects.created_by_user_id
                              │
                              ▼
 PostgreSQL (schema.ts / migration 0002)
   projects.created_by_user_id uuid NOT NULL REFERENCES auth_users(id)
   …same FK on: departments, budget_sources, crises_harms, priorities,
                executors, contractors, analysis_sources (actor_user_id),
                audit_logs (actor_user_id), organization (updated_by_user_id)
   ⇒ the DATABASE refuses any row without a verified identity.
```

## 2. Single source of truth

| Layer | Rule |
|---|---|
| Identity | `auth_users.id` (UUID minted by `crypto.randomUUID()` at register/bootstrap). The legacy `users` registry is display data only. |
| Transport | httpOnly cookies `csr_at` + `csr_rt`; Bearer also accepted (`Authorization: Bearer`) for machine clients — never from body/query. |
| Server state | `req.auth` set exclusively by `requireAuth`; route code may only call `actorId(req)`. |
| Database | NOT NULL FK on every mutable table → rows without an identity are impossible. |

## 3. Token lifecycle & edge cases

- **Expiry (access):** 15-min default (`AUTH_ACCESS_TTL_SECONDS`); client transport retries once after `/api/auth/refresh`; a second 401 ends the session (no refresh storms).
- **Expiry (refresh):** 30-day default; an absent/expired refresh cookie returns 401 → user re-authenticates.
- **Rotation:** every refresh consumes the presented token and mints a successor in the same `family_id`. Presenting a consumed/revoked token (replay of a stolen one) revokes the whole family.
- **Revocation, targeted:** `POST /api/auth/logout` revokes the family. `revokeAllRefreshTokensForUser()` exists for admin/password flows.
- **Revocation, global:** password change bumps `tokens_valid_from`; any access token with `iat < tokens_valid_from` dies on its next use even without a DB hit against refresh_tokens.
- **Door lock:** `is_active=false` → all sessions invalid immediately (checked per request).
- **Missing/invalid user_id:** a JWT without a resolvable `sub` row can never pass `requireAuth`. Handlers without an auth context throw in `actorId()` (401), and the database would reject the write anyway. Defense in depth.
- **Brute force:** in-memory per-instance limiter (8/min/IP) on /register and /login. Multi-replica deployments add a shared store (Redis) ahead of the map.

## 4. Secrets & configuration

| Env | Role |
|---|---|
| `AUTH_JWT_SECRET` | required, ≥32 chars — signs the access token. Refuses to boot if missing |
| `AUTH_ACCESS_TTL_SECONDS` / `AUTH_REFRESH_TTL_DAYS` | lifetimes |
| `AUTH_COOKIE_SECURE` / `AUTH_COOKIE_SAMESITE` | cookie flags (Secure auto in prod) |
| `AUTH_ALLOW_REGISTRATION` | self-service signup gate (default OFF) |
| `AUTH_BOOTSTRAP_MOBILE` / `AUTH_BOOTSTRAP_PASSWORD` | the first operator account (falls back to a generated one-time password printed once) |

DB access is standard `PG*`/`DATABASE_URL` (unchanged, see server/config.ts).

## 5. Anti-patterns — explicitly eliminated

1. **Client-generated identity** — `login(userId)` from a user-picker was the previous simulator; REMOVED. Identity is minted server-side at registration.
2. **Trusting client-side user values** — `req.body.createdByUserId`, `userRole`, `userName` are never authoritative; every server-side route re-derives identity from the session. The DTOs may carry display data; identity columns don't accept it.
3. **UUIDs created before auth** — no anonymous "session user" row is created; the UUID for a person is DURING the auth transaction (hash → insert → issue session) and is never provisional.
4. **Tokens in JS** — no localStorage/sessionStorage token, no `redux-persist` session. Cookies only (httpOnly). XSS can neither read them nor re-mint identity.
5. **Role-based trust in client claims alone** — matrix verification re-reads `roles_permissions` (30s cache) per guarded route; a stale token role cannot escalate.
6. **Identity-switching in-session** — the legacy persona switcher is gone; changing identity requires re-authentication.
7. **Silent fallbacks** — repositories require an `actorId` argument at compile time; no caller can "forget" attribution, and the DB misses nothing.

## 6. Deployment notes

- Migrations 0000–0002 apply automatically (`bun run db:init`; Docker entrypoint does it; Vercel is pre-migrated with `DB_SKIP_MIGRATIONS=1`).
- Legacy rows are attributed to the SYSTEM actor (`00000000-0000-4000-8000-000000000001`, disabled, unloggable).
- First boot without `AUTH_BOOTSTRAP_*` prints a one-time admin password **once** to stderr; change it immediately (`AUTH_BOOTSTRAP_PASSWORD` for controlled deployments).
- The client never handles tokens explicitly; if you grow a CLI or mobile client, login with the same endpoint and send `Authorization: Bearer <access>` (the refresh flow requires a cookie domain, so CLI sessions use long-lived refresh handled in its own secure store).
