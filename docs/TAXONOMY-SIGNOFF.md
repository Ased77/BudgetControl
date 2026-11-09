# Cultural taxonomy — sign-off record

> Task: `E0-TAX-2` (domain review and sign-off).
> Taxonomy version under approval: **`۱٫۱`** (`CULTURAL_TAXONOMY_VERSION`).
> Status: **awaiting signature** — no owner approval exists yet.
> This file is the only accepted approval artifact. Chat messages, email and
> commit messages do not constitute sign-off.

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
| Commit reviewed | _(full SHA)_ |

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

## 4. Decision and signature

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
