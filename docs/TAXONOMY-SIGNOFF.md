# Cultural taxonomy — sign-off record

> Task: `E0-TAX-2` (domain review and sign-off).
> Taxonomy version under approval: **`۱٫۱`** (`CULTURAL_TAXONOMY_VERSION`).
> Status: **awaiting signature** — the §3 dataset checks were prepared and
> recorded on 2026-11-09, but no owner approval exists yet.
> This file is the only accepted approval artifact. Chat messages, email and
> commit messages do not constitute sign-off.
> Demo copy: `docs/TAXONOMY-SIGNOFF.demo.md` carries mock values for
> demonstration only. It is not an appointment, approval or signature and is
> never accepted as one.

## 1. Owner and reviewers

| Field | Value |
|---|---|
| Accountable role | `CULTURE_BUDGET_HEAD` («مدیرکل بودجه فرهنگی») |
| Owner full name | _(required before signature)_ |
| Owner user id (`auth_users.id`) | _(required before signature)_ |
| Appointment date | _(required before signature)_ |
| Evidence recorders nominated by the owner | _(names and user ids)_ |
| Approver for owner-authored evidence | `SYSTEM_ADMIN` («مدیر سامانه») |
| Backup reviewer if the owner is unavailable | _(name and role)_ |

The role owns the taxonomy. The named person is required: a signature without a
name and user id is invalid. Only `CULTURE_BUDGET_HEAD` may sign, except that a
`SYSTEM_ADMIN` may sign in the documented absence of an appointed owner and must
state why in §4.

## 2. Version under approval

| Field | Value |
|---|---|
| Version string | `۱٫۱` |
| Source of truth | `src/data/culturalTaxonomy.ts` at commit `3a47d5d` |
| Change-log rows | `1.0 draft — Initial 12-domain taxonomy section, read-only`; `1.1 draft — ۱۴۰۵/۰۸/۱۷ — Indicator evidence metadata and pending-state UI` |
| Review date | _(to be filled at signature)_ |
| Commit reviewed | `79967510ee55c8eda582b152eaa8dbe37def6d48` |

Approving this version approves the 12 domain codes, their titles, the 21
indicators, the 36 actions, the reference priority links and the empty evidence
state. It does not approve any evidence value; those are approved individually
in §5.

## 3. Review checklist

The owner confirms each line before deciding. A failed line blocks approval.

- [ ] `CT-01` … `CT-12` exist exactly once, are stable join keys, and no title
      change has altered a code.
- [ ] All 21 indicators have a unit, a direction (`HIGHER_IS_BETTER` /
      `LOWER_IS_BETTER`) and a definition consistent with the reference
      document.
- [ ] All 36 actions exist and each is assigned to one domain with a delivery
      mode.
- [ ] Reference priority links are suggestions only and are not presented as
      live coverage.
- [ ] Coverage counts only priorities with an explicit matching
      `taxonomyDomainId`; static links are excluded.
- [ ] No indicator carries a fabricated or placeholder source; every unsigned
      evidence row renders «ثبت نشده».
- [ ] The five indicator-family labels and the three confidence labels match the
      implementation.
- [ ] The version change log records `۱٫۱` and the document header will name
      this owner after signature.

### 3a. Verification evidence (prepared 2026-11-09; not a signature)

Mechanical checks against `src/data/culturalTaxonomy.ts` at commit `7996751`.
Their purpose is to let the owner's review confirm already-verified facts; they
do not substitute for the owner's own confirmation in §3 or the decision in §4.

The reviewed file differs from `3a47d5d:src/data/culturalTaxonomy.ts` only by
two additive blocks introduced by `E1-INT-3` — the `CulturalTaxonomyReference`
interface and `getCulturalTaxonomyReference()`. Neither adds, removes or renames
a domain, indicator or action, neither records an evidence value, and the
version stays `۱٫۱`.

| §3 line | Subject | Result | Evidence |
|---|---|---|---|
| 1 | Domain codes | Pass | 12 domains with 12 unique codes in `CT-01` … `CT-12` order, and 12 entries in the `CULTURAL_DOMAINS_BY_CODE` join-key map |
| 2 | Indicators | Partial | 21 indicators, all 21 with a unit, a valid direction and a definition; consistency against the reference document is unverifiable here because `docs/CULTURAL-TAXONOMY.md` is absent from this checkout (it exists in commit `3a47d5d`; restoring it is `E0-TAX-10`) |
| 3 | Actions | Pass | 36 unique action ids, exactly 3 per domain, all 36 with a valid delivery mode, each assigned to exactly one domain |
| 4 | Reference priority links | Pass | 7 suggestions (`CT-01:p7`, `CT-02:p6`, `CT-03:p6`, `CT-08:p7`, `CT-09:p6`, `CT-10:p6`, `CT-11:p7`); every target id `p6`/`p7` exists in `src/data/initialData.ts`, and the dataset computes no coverage from them |
| 5 | Coverage rule | Blocked | no coverage implementation exists in this checkout — the taxonomy view and route are absent (`E0-TAX-3` … `E0-TAX-8`) |
| 6 | Evidence state | Pass | 0 of 21 indicators carry `source`, `referenceYear` or `confidence`, and `hasCulturalIndicatorEvidence()` is false for all 21 |
| 7 | Label maps | Pass | 5 family labels, 5 delivery-mode labels and 3 confidence labels (`HIGH` / `MEDIUM` / `LOW`) exist with Persian text |
| 8 | Version change log | Blocked | the document and its change log are absent from this checkout (`E0-TAX-10`), so neither the log line nor the post-signature header update can be performed yet |

Lines 2, 5 and 8 stay open until `E0-TAX-3` … `E0-TAX-8` and `E0-TAX-10`
land. The dataset itself is complete and versioned at `۱٫۱`.

## 4. Decision and signature

Status as of 2026-11-09: **no decision taken.** §1 is still incomplete (owner
full name, user id and appointment date are required) and §3 lines 2, 5 and 8
stay open pending `E0-TAX-3` … `E0-TAX-8` and `E0-TAX-10`. The options below are
recorded for the signature; nothing is selected.

Decision (select one):

- [ ] Approved — version `۱٫۱` may be treated as the reviewed taxonomy.
- [ ] Approved with conditions — list every condition and its due date; the
      version stays draft until they are closed.
- [ ] Rejected — list the required changes and the version they must appear in.

Conditions:

| # | Condition | Owner | Due date | Closed on |
|---|---|---|---|---|
| 1 | | | | |

Signature block:

| Field | Value |
|---|---|
| Name | |
| Role | `CULTURE_BUDGET_HEAD` |
| User id | |
| Date (Persian and ISO) | |
| Commit signed | |

After signing:

1. Update the taxonomy document header to `Owner: <name>` and
   `Review status: approved for version ۱٫۱`.
2. Add the approval to the taxonomy change log.
3. Record the approval in the Phase 0 status in `docs/BACKLOG.md` with this
   file's path, the date and the commit.
4. Keep this record in the repository; later versions need a new §4 decision
   and a new row in §6.

## 5. Evidence approval log

Every approved indicator evidence trio is recorded here. The process is defined
in `E1-EVD-1` in `docs/BACKLOG.md`; a trio is `source`, `referenceYear` and
`confidence`, and a partial row is never approved.

| # | Indicator id | Source (issuer + publication/dataset + locator) | Reference year | Confidence | Recorder | Approver | Date | Commit |
|---|---|---|---|---|---|---|---|---|
| — | _(none yet)_ | — | — | — | — | — | — | — |

Rules:

- The recorder may not approve their own entry; owner-authored entries are
  approved by `SYSTEM_ADMIN`.
- The source must be retrievable and must match the indicator's definition, unit
  and direction. A bare organisation or placeholder URL is rejected.
- `confidence` is one of `HIGH`, `MEDIUM`, `LOW` and must satisfy the rubric in
  `E1-EVD-1`.
- Rejected proposals are not logged here and are not merged. All three fields
  stay absent.
- Until a row exists and the change is merged, the indicator shows «ثبت نشده»
  and does not count toward evidence completeness. Currently 0 of 21
  indicators are complete.

## 6. Record change log

| Date | Change | By |
|---|---|---|
| 2026-11-09 | Record created; owner, version, checklist and approval process defined; awaiting signature | Backlog ambiguity revision |
| 2026-11-09 | §2 commit reviewed recorded and §3 verification evidence attached from the current checkout; owner identity, review date and §4 decision still required | `E0-TAX-2` preparation |
