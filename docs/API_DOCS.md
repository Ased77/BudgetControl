# CSR Budgeting API — Developer Documentation

> سامانه جامع و ملی مدیریت هوشمند توسعه روستایی و شهری (CSR Budgeting)
>
> Machine-readable contract: [`openapi.yaml`](../openapi.yaml) (OpenAPI 3.1, generated from the implementation).
> Source of truth: `server/app.ts`, `server/auth/*`, `server/db/*`, `src/types.ts`.

## 1. Overview

| | |
|---|---|
| **Purpose** | National budget-allocation and executive-project monitoring platform: priority matrix, multi-source budgets, crises/harms registry, anti-overlap project monitoring, audit trail. |
| **Base URL** | `http://localhost:3000` (local dev/Docker) · Vercel deployment (canonical production URL not set in repo — see Open Questions). |
| **API prefix** | All API routes live under `/api/*`. Everything else serves the SPA. |
| **Version** | `0.0.0` (from `package.json`; no stable versioning strategy yet). |
| **Content type** | `application/json` everywhere (JSON body limit: 10 MB). |
| **Language** | User-facing error strings are **Persian (fa)**; machine-readable `code` fields are English UPPER_SNAKE. Money is **Toman** (1 Toman = 10 Rial). Dates returned by the API are **Persian display strings** (e.g. `۱۴۰۴/۰۵/۱۲`), NOT ISO timestamps. |

### Environments

| Environment | How it runs | Static client |
|---|---|---|
| Local dev | `bun run dev` (`server.ts`, Vite middleware) | Vite dev server |
| Docker / prod server | `bun dist/server.cjs` after `bun run build` | Express serves `dist/` |
| Vercel (serverless) | `server.ts` exported as a single Express function; no `listen()` | CDN serves the build; unknown `/api/*` paths return JSON 404 |

Database is **PostgreSQL** (Drizzle ORM). On boot (or first serverless request) the server runs schema/seed/repair initialization; a failed DB is answered **503** by every DB-backed route, and `GET /api/health` reports `degraded`.

## 2. Authentication & Authorization

### 2.1 Two-layer session credentials

| Cookie | Content | TTL | Scope |
|---|---|---|---|
| `csr_at` | HS256 **JWT** — `sub` is the user_id; claims: `role`, `departmentId?`, `allowedLocationId?`; iss `csr-budgeting`, aud `csr-web` | 15 min (`AUTH_ACCESS_TTL_SECONDS`) | path `/` |
| `csr_rt` | Opaque **48-byte base64url** refresh token (only sha256 stored server-side) | 30 days (`AUTH_REFRESH_TTL_DAYS`) | path `/api/auth` only |

Both cookies are `httpOnly` (+ `Secure` in production). The SPA never sees a token string.

**Machine clients** (non-browser) send the access JWT as `Authorization: Bearer <jwt>` instead of the cookie. Transport is not trust — verification is identical.

### 2.2 Obtaining credentials

```text
POST /api/auth/login    { "email": "...", "password": "..." }   → Set-Cookie: csr_at=…; csr_rt=…
POST /api/auth/refresh  { } (cookie only)                        → rotated csr_rt + fresh csr_at
```

- `POST /api/auth/register` is **disabled by default** (`AUTH_ALLOW_REGISTRATION=0` — internal tool; admins provision accounts; see §2.4).
- `POST /api/auth/refresh` **rotates** the refresh token on every call. Presenting a consumed/revoked token revokes the **whole rotation family** (theft containment).
- `POST /api/auth/logout` revokes the family + clears cookies; idempotent.
- A password change / admin lockout sets an account-wide `tokensValidFrom` gate: tokens issued earlier are rejected even if unexpired.

### 2.3 Request authentication

```http
GET /api/projects HTTP/1.1
Cookie: csr_at=<jwt>
# or
Authorization: Bearer <jwt>
```

`requireAuth` on every `/api` route (except health + identity endpoints) verifies, **per request**: signature/expiry → user still exists → account still active → token not older than the revocation gate. `401` means "refresh or re-login"; `403` means "you are known and rejected".

### 2.4 Roles & permissions

Authorization is a role matrix (`roles_permissions` table, served at `GET /api/roles-permissions`). Roles: `ADMIN`, `PROVINCIAL_GOVERNOR`, `DEPARTMENT_HEAD`, `OFFICE_HEAD`, `REGIONAL_MANAGER`, `PLANNING_SPECIALIST`, `AUDITOR`, `DEHYAR_COUNCIL`. Self-registration always assigns `DEHYAR_COUNCIL`.

Permission flags used by routes: `canManageBudget`, `canManagePriorities`, `canCreateProject`, `canEditDepartments`, `canManageCrises`, `canManageExecutors`, `canManageContractors`, `canAuditLogs`. The matrix is read with a 30 s cache and is **fail-closed** (unknown role → nothing).

> ⚠️ **Gap (as-implemented):** several routes are authenticated but **not** permission-gated — `DELETE` on priorities/projects/departments/budget-sources/crises-harms/executors/contractors, `PATCH /api/projects/:id/status`, and all `/api/analysis-sources` writes. Listed per-endpoint below.

## 3. Common Conventions

| Convention | Behavior |
|---|---|
| **Pagination** | None, except audit-logs: `?limit=` (default 200, max 1000, clamped server-side). A richer filtered paginator exists in the repository layer but is not exposed. |
| **Filtering / Sorting** | None exposed. Lists are fixed-order (by id or newest-first). |
| **IDs** | Client-assigned strings on create (upsert semantics: POST/PUT by `id` are insert-**or-replace**). |
| **Upserts** | All POST/PUT resource routes upsert on `id` — there is no separate update-only path. |
| **Body-id match** | On every `PUT /api/<resource>/{id}`, `body.id` must equal the URL id, else `400 {"error":"Body id must match URL id"}`. |
| **Error envelope** | `{ "error": <persian message>, "code"?: <machine-code> }`; 403 FORBIDDEN also echoes `"role"`. |
| **Machine codes** | `AUTH_REQUIRED`, `ACCOUNT_DISABLED`, `SESSION_REVOKED`, `REGISTRATION_DISABLED`, `EMAIL_TAKEN`, `RATE_LIMITED`, `FORBIDDEN`. |
| **DB error map** | unique violation → **409** · FK/referential violation → **409** (e.g. deleting a department that still owns projects) · serialization/deadlock/statement-timeout → **503**. |
| **Rate limiting** | Only on `POST /api/auth/login` and `/api/auth/register`: **8 attempts / 60 s per IP**, in-memory per instance (single-replica deployments only; fleets need a shared store). Exceeding → `429` `RATE_LIMITED`. |
| **Idempotency** | No idempotency-key support. Refresh/logout are naturally idempotent-ish (logout is; refresh deliberately is **not** — replay kills the family). |
| **Ownership stamping** | `updatedByUserId` (organization), `createdByUserId` (projects) are **always stamped server-side** from the session; client values are discarded/silently overridden. |
| **Unknown `/api/*` path** | Serverless mode: `404 {"error":"Not found"}`. Local mode falls through to the SPA index. |

## 4. Quickstart (curl)

```bash
# 1) Log in — session cookies are stored in cookies.txt
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@localhost","password":"<your-password>"}'

# 2) Check identity
curl -b cookies.txt http://localhost:3000/api/auth/me

# 3) List priorities and allocate the budget
curl -b cookies.txt http://localhost:3000/api/priorities
curl -b cookies.txt -X POST http://localhost:3000/api/calculate \
  -H 'Content-Type: application/json' \
  -d '{"totalBudgetToman":100000000000,"allocations":{"priority-water":25}}'

# (machine clients) alternatively:
#   curl -H "Authorization: Bearer $JWT" http://localhost:3000/api/projects
```

## 5. Endpoint Reference

Legend: 🔓 public · 🔒 authenticated · 🔑 permission-gated (flag). Responses shown as `code → shape`.

### 5.1 Authentication

#### `POST /api/auth/register` 🔓
Create identity + first session. Rate limited (8/min/IP). Assigns role `DEHYAR_COUNCIL`.
| Code | Meaning |
|---|---|
| 201 | `{ "user": PublicProfile }` + both cookies set |
| 400 | invalid email / short password / short displayName |
| 403 | `REGISTRATION_DISABLED` |
| 409 | `EMAIL_TAKEN` |
| 429 | `RATE_LIMITED` |

```json
// request
{ "email": "user@county.gov.ir", "password": "Str0ng-Passw0rd!", "displayName": "علی رضایی" }
// 201
{ "user": { "id":"…uuid", "email":"user@county.gov.ir", "name":"علی رضایی", "role":"DEHYAR_COUNCIL", "roleFa":"دهیار", "roleTitleFa":"دهیار / نماینده شورای اسلامی", "avatar":"", "organization":"سطح ملی" } }
```

#### `POST /api/auth/login` 🔓
Rate limited (8/min/IP). Wrong email/wrong password are indistinguishable.
| Code | Meaning |
|---|---|
| 200 | `{ "user": PublicProfile }` + cookies |
| 401 | `AUTH_REQUIRED` (bad credentials) or `ACCOUNT_DISABLED` |
| 429 | `RATE_LIMITED` |

#### `POST /api/auth/refresh` 🍪 csr_rt only
Rotates the refresh token; replay of a consumed token revokes the family.
| Code | Meaning |
|---|---|
| 200 | `{ "user": PublicProfile }`, both cookies re-issued |
| 401 | `AUTH_REQUIRED` (missing/expired) · `SESSION_REVOKED` (replay) · `ACCOUNT_DISABLED` — cookies cleared |

#### `POST /api/auth/logout` 🔓
Idempotent; always `200 → { "ok": true }`; revokes the rotation family + clears cookies.

#### `GET /api/auth/me` 🔒
`200 → { "user": PublicProfile }` — identity comes from the verified session, nothing else.

### 5.2 System

#### `GET /api/health` 🔓
Pings PostgreSQL on every call.
| Code | Body |
|---|---|
| 200 | `{ status:"ok", timestamp, service:"CSR Budgeting API", persistence:"postgresql", database:{ ok, latencyMs, schemaVersion, pool:{ total, idle, waiting } } }` |
| 503 | same shape with `status:"degraded"`, `database.ok:false` |

#### `GET /api/health/live` 🔓
Process-only liveness (legacy): `{ status:"ok", timestamp, service, persistence }`.

### 5.3 Calculation

#### `POST /api/calculate` 🔒
Allocate `totalBudgetToman` (falls back to the organization's stored `totalBudget`) across stored priorities. Per priority, uses `allocations[priorityId]` when given, else the stored `defaultPercentage`.

| Param | In | Type | Req |
|---|---|---|---|
| `totalBudgetToman` | body | number | no |
| `allocations` | body | object map `priorityId → percentage` | no |

```json
// request
{ "totalBudgetToman": 100000000000, "allocations": { "priority-water": 25, "priority-health": 15 } }
// 200
{
  "totalBudgetToman": 100000000000, "totalBudgetRial": 1000000000000,
  "sumPercentage": 40, "totalAllocatedToman": 40000000000, "totalAllocatedRial": 400000000000,
  "unallocatedToman": 60000000000, "isValid100Pct": false,
  "items": [
    { "priorityId":"priority-water", "code":1, "title":"آب شرب پایدار", "category":"زیرساخت",
      "percentage":25, "amountToman":25000000000, "amountRial":250000000000 }
  ]
}
```

#### `POST /api/recommend` 🔒
Rule-based smart percentage recommendation from deprivation `indicators` (+ `locationName` for prevalence context). Missing `indicators` falls back to the first stored location's indicators. Returns `{ scores: {priorityId: score}, explainability: {priorityId: {score, primaryDriver, rationale, keyMetrics[], prevalence?, isLocalHotspot?, isUniversalSevere?}}, summaryRationale, overallVulnerabilityIndex, universalCriticalCount?, localHotspotCount? }`.

### 5.4 Organization

#### `GET /api/organization` 🔒 → `200 OrganizationConfig`
Empty database returns a built-in default (`id:"org-national"`).

#### `PUT /api/organization` 🔑 `canManageBudget`
Insert-or-replace of the single org row; `updatedByUserId` stamped from session. `200 → OrganizationConfig` (fresh read). Errors: 401/403/409/503.

### 5.5 Locations

#### `GET /api/locations` 🔒 → `200 LocationData[]`
`indicators` is omitted when a location has no indicator row (legal state); `coordinates {lat,lng}` optional.

### 5.6 Priorities

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/priorities` | 🔒 | List the priority matrix → `CsrPriority[]` |
| POST | `/api/priorities` | 🔑 `canManagePriorities` | Upsert one → `201` echo |
| PUT | `/api/priorities/import` | 🔑 `canManagePriorities` | **Bulk replace all** with a JSON array → `200 {count}`; body must be an array else `400` |
| PUT | `/api/priorities/{id}` | 🔑 `canManagePriorities` | Upsert by id (body.id must match URL) → `200` echo |
| DELETE | `/api/priorities/{id}` | 🔒 *(no permission gate — gap)* | → `200 {ok:true}` / `404` |

```json
// POST /api/priorities request
{ "id":"priority-water", "code":1, "title":"آب شرب پایدار", "description":"تأمین آب شرب سالم مناطق محروم",
  "category":"زیرساخت", "defaultPercentage":25, "currentPercentage":25, "isActive":true,
  "relatedIndicators":["infra"], "iconName":"droplets" }
```

### 5.7 Projects

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/projects` | 🔒 | List (display names joined at read time) → `ExecutiveProject[]` |
| POST | `/api/projects` | 🔑 `canCreateProject` | Upsert → `201` echo |
| PUT | `/api/projects/{id}` | 🔑 `canCreateProject` | Upsert; `createdByUserId` forced to session user → `200` echo |
| PATCH | `/api/projects/{id}/status` | 🔒 *(no permission gate — gap)* | Body `{status}` → `200 ExecutiveProject` / `404` |
| DELETE | `/api/projects/{id}` | 🔒 *(no permission gate — gap)* | → `200 {ok:true}` / `404` |

### 5.8 Departments

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/departments` | 🔒 | → `Department[]` |
| POST | `/api/departments` | 🔑 `canEditDepartments` | Upsert → `201` echo |
| PUT | `/api/departments/{id}` | 🔑 `canEditDepartments` | Upsert (body.id match) → `200` echo |
| DELETE | `/api/departments/{id}` | 🔒 *(gap)* | → `200 {ok}` / `404` / **`409`** if projects still reference it |

### 5.9 Budget Sources

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/budget-sources` | 🔒 | → `BudgetSource[]` |
| POST | `/api/budget-sources` | 🔑 `canManageBudget` | Upsert → `201` echo |
| PUT | `/api/budget-sources/{id}` | 🔑 `canManageBudget` | Upsert (body.id match) → `200` echo |
| DELETE | `/api/budget-sources/{id}` | 🔒 *(gap)* | → `200 {ok}` / `404` |

### 5.10 Crises & Harms

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/crises-harms` | 🔒 | → `CrisisHarmItem[]` |
| POST | `/api/crises-harms` | 🔑 `canManageCrises` | Upsert → `201` echo |
| PUT | `/api/crises-harms/{id}` | 🔑 `canManageCrises` | Upsert (body.id match) → `200` echo |
| DELETE | `/api/crises-harms/{id}` | 🔒 *(gap)* | → `200 {ok}` / `404` |

### 5.11 Executors

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/executors` | 🔒 | → `ProjectExecutor[]` |
| POST | `/api/executors` | 🔑 `canManageExecutors` | Upsert → `201` echo |
| PUT | `/api/executors/{id}` | 🔑 `canManageExecutors` | Upsert (body.id match) → `200` echo |
| DELETE | `/api/executors/{id}` | 🔒 *(gap)* | → `200 {ok}` / `404` |

### 5.12 Contractors

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/contractors` | 🔒 | → `Contractor[]` |
| POST | `/api/contractors` | 🔑 `canManageContractors` | Upsert → `201` echo |
| PUT | `/api/contractors/{id}` | 🔑 `canManageContractors` | Upsert (body.id match) → `200` echo |
| DELETE | `/api/contractors/{id}` | 🔒 *(gap)* | → `200 {ok}` / `404` |

### 5.13 Users & Roles (read-only)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/users` | 🔒 | Business user registry (not auth accounts; no secrets) → `UserProfile[]` |
| GET | `/api/roles-permissions` | 🔒 | Access matrix behind `requirePermission` → `SystemRolePermission[]` |

### 5.14 Audit Logs

#### `GET /api/audit-logs` 🔑 `canAuditLogs`
Query: `limit` (integer 1–1000, default 200). → `200 AuditLogItem[]` (newest first; entries carry Persian display timestamps).

#### `POST /api/audit-logs` 🔑 `canAuditLogs`
Append entry. **`actorUserId` is derived from the session** — the payload supplies narrative/display data only. → `201 {ok:true}`. Upsert on `id` (`409` on conflict of other unique values).

```json
// request
{ "id":"al-0001", "timestamp":"۱۴۰۴/۰۵/۱۲", "userName":"علی رضایی", "userRole":"DEHYAR_COUNCIL",
  "actionType":"PRIORITY_EDIT", "targetPriorityTitle":"آب شرب پایدار",
  "oldValue":"۲۵٪", "newValue":"۳۰٪", "rationale":"افزایش اولویت بحران آب",
  "province":"سیستان و بلوچستان", "county":"سرباز" }
```

### 5.15 Analysis Sources

Inputs feeding the analytical engine (AI- or human-produced), with a human-in-the-loop review state (`PENDING | APPROVED | REJECTED`).

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/analysis-sources` | 🔒 | → `AnalysisSource[]` |
| POST | `/api/analysis-sources` | 🔒 *(gap)* | Upsert → `201` echo |
| PUT | `/api/analysis-sources/{id}` | 🔒 *(gap)* | Upsert (body.id match) → `200` echo |
| DELETE | `/api/analysis-sources/{id}` | 🔒 *(gap)* | → `200 {ok}` / `404` |

### 5.16 AI Analysis

#### `POST /api/ai-analysis` 🔒
Rule-based executive narrative — **always `isAiGenerated: false`**, no LLM call. Location resolution order: explicit `locationId` → longest county name contained in `locationName` → city match first location. Narrative is assembled from that county's recorded crises + projects.

Request (all fields optional): `{ "locationId":"loc-sarbaz", "locationName":"شهرستان سرباز", "totalBudgetToman":100000000000 }`

Response: `{ isAiGenerated:false, executiveSummary, keyTakeaways:[…], strategicAdvice }` (Persian).

## 6. Data Models

Full JSON Schemas live in `openapi.yaml#components/schemas`. Summary:

| Schema | Key fields (R = required) |
|---|---|
| `PublicProfile` | R: id, email, name, role, roleFa, roleTitleFa, avatar, organization · opt: departmentId, allowedLocationId, province, county |
| `OrganizationConfig` | R: id, name, orgType, activitySector, province, city, county, district, totalBudget, currencyUnit, budgetPeriod, fiscalYear, updatedAt · opt: nationalCode, description, updatedByUserId |
| `LocationData` | R: id, level, province, county, city, district, population · opt: indicators, coordinates |
| `LocalIndicators` | R (all 11): povertyRate, marginalizationRate, unemploymentRate, socialHarmsIndex, vulnerableGroupsPopulation, infrastructureDeficit, crisisVulnerabilityScore, healthAccessDeficit, educationDropOutRate, culturalDeficitScore, environmentalRiskScore |
| `CsrPriority` | R: id, code, title, description, category, defaultPercentage, currentPercentage, isActive, relatedIndicators, iconName |
| `ExecutiveProject` | R: id, code, title, priorityId/Title, departmentId/Name, budgetSourceId/Name, executorId/Name, administrativeLevel, province, county, district, targetArea, estimatedCostToman, beneficiariesCount, costPerBeneficiaryToman, antiOverlapStatus, status, start/endYear, durationMonths, progressPercentage, description |
| `Department` | R: id, name, code, category(+Fa), headPersonName, contactNumber, allocated/absorbedBudgetToman, activeProjectsCount, performanceScore, administrativeLevel, province, description |
| `BudgetSource` | R: id, title, code, sourceType(+Fa), total/allocated/remainingAmountToman, fiscalYear, sponsorOrganization, targetScope, status |
| `CrisisHarmItem` | R: id, title, code, category, level, province, county, districtOrVillage, severityScore, urgency, affectedPopulation, primaryCause, recommendedIntervention, status, activeProjectsCount, deficitIndexFa |
| `ProjectExecutor` | R: id, name, code, type(+Fa), managingDirector, contactPhone, active/completedProjectsCount, successRate, capacityStatus, coverageRegion |
| `Contractor` | R: id, companyName, ceoName, nationalId, grade(+Fa), specialtyField, activeContractsCount, totalContractValueToman, performanceScore, satisfactionRating, freeCapacitySlots, phone, status |
| `SystemRolePermission` | R: role, roleTitleFa, description, 11 boolean flags, scopeLevel |
| `AuditLogItem` | R: id, timestamp, userName, userRole, actionType · opt: targetPriorityTitle, oldValue, newValue, rationale, province, county |
| `AnalysisSource` | R: id, title, summary, origin, kind, provider, publishedAt, linkedAreas, reliabilityScore, status, province, county, createdAt |

**Enums:** role/org/budget enums as in code — `UserRole` (8), `AdministrativeLevel` (NATIONAL·PROVINCIAL·COUNTY·RURAL_DISTRICT), `ProjectStatus` (PROPOSED·APPROVED·IN_PROGRESS·COMPLETED·SUSPENDED), `AntiOverlapStatus` (CLEAR·POTENTIAL_DUPLICATE·INEFFICIENT_PER_CAPITA·UNPRIORITIZED), `UrgencyLevel` (CRITICAL·HIGH·MEDIUM·LOW), `OrgType` (5), `BudgetPeriod` (1_YEAR·3_YEARS·5_YEARS), `CurrencyUnit` (TOMAN·RIAL), `BudgetSourceType` (6), `ExecutorType` (6), `ContractorGrade` (6), `AnalysisSourceOrigin` (AI·HUMAN), `AnalysisSourceKind` (6), `AnalysisSourceStatus` (PENDING·APPROVED·REJECTED), `AuditActionType` (34).

## 7. Versioning & Changelog

- No API versioning scheme is implemented (no `/v1` prefix, no version header). Route shapes change without notice.
- Version metadata: `package.json → 0.0.0`.
- Relevant migration notes: [`MIGRATION-POSTGRES.md`](../MIGRATION-POSTGRES.md) (SQLite → PostgreSQL port). Auth architecture: [`docs/AUTH.md`](./AUTH.md).
- Comments in `server/db/schema.ts` document deliberate contract decisions (timestamps stay display strings; FK violations become HTTP 409; etc.).

## 8. Open Questions

1. **Production base URL** — not recorded in the repo (`servers` uses a placeholder). Needed for `openapi.yaml#/servers`.
2. **Missing permission gates** on DELETEs, `PATCH …/status`, and analysis-source writes — intentional or gap?
3. **Unexposed paginator** — `pageAuditLogs` (actionType/province/county filters + offset + total) exists in `server/db/repositories/audit-log.repository.ts` but no route uses it. Plan to expose?
4. **Auth rate limiting** is per-instance in memory — multi-replica deployments have no limiting. Acceptable?

