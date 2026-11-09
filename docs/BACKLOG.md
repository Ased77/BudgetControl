# Cultural Budget Integration — Backlog

> Backlog snapshot: 2026-11-09
> Ambiguity revision: 2026-11-09, two passes (see [Resolved ambiguities](#resolved-ambiguities) and [Resolved ambiguities — second pass](#resolved-ambiguities--second-pass-2026-11-09))
> Scope: cultural taxonomy foundation, transparency work, Phase 1 integration,
> project-flow changes and indicator evidence.
> Source of truth: the recovered `docs/CULTURAL-TAXONOMY.md` from commit
> `f1e00b0`, its task-status tables, and the implementation commits immediately
> preceding it. Where a definition below is new, it is dated and authoritative
> for this backlog.

## Status legend

| Marker | Meaning |
|---|---|
| ✅ Done | Implemented and recorded as complete in the recovered task record. |
| 🟡 Partial | Implemented in part; a named verification or review item remains. |
| ⬜ Pending | Not complete; an owner or action is still required. |
| ❓ Unresolved | Historical marker: the task ID is known from the numbering, but its scope was not preserved in the repository. |
| 🗑 Retired | Removed from the active map after review. Not counted, not implemented, and recorded under [Retired task IDs](#retired-task-ids). |

> All checkboxes are intentionally reset to open. The status markers record the
> last recovered state, not current verification. Re-checking a task means
> confirming its acceptance criteria against the current checkout.

## Snapshot

**Active checklist:** 5 of 22 tasks checked.

`E1-PRJ-1` was the single unresolved ID in the recovered record. It is now
retired, so the active map has 22 tasks while the historical table below still
shows the recovered 23. One task (`E0-TAX-2`) is Pending and one (`E0-TAX-9`)
is Partial. Re-verification also found two acceptance gaps in the recovered
`E0-TR-2` audit shortcut; they are recorded under that task and do not change
its historical Done status.

Recovered historical status:

| Workstream | Tasks | Done | Partial | Pending | Unresolved |
|---|---:|---:|---:|---:|---:|
| Phase 0 — taxonomy | 10 | 8 | 1 | 1 | 0 |
| Phase 0 — transparency | 5 | 5 | 0 | 0 | 0 |
| Phase 0 — security | 1 | 1 | 0 | 0 | 0 |
| Phase 1 — integration | 4 | 4 | 0 | 0 | 0 |
| Phase 1 — project flow | 2 | 1 | 0 | 0 | 1 |
| Phase 1 — evidence | 1 | 1 | 0 | 0 | 0 |
| **Total** | **23** | **20** | **1** | **1** | **1** |

---

## Phase 0 — Foundation

### E0-TAX — Cultural taxonomy reference section

- [x] **E0-TAX-1 — Dataset and content model**
  - [x] Define 12 stable domain codes, `CT-01` … `CT-12`.
  - [x] Define 21 indicators with unit, direction and definition.
  - [x] Define 36 actions across the domains.
  - [x] Keep the taxonomy data-only and versioned.
  - [x] Treat titles as display text and `CT-xx` codes as join keys.
  - **Artifact:** `src/data/culturalTaxonomy.ts` — restored on 2026-11-09 from
    the `dist/server.cjs.map` `sourcesContent` of the recovered build, so the
    dataset matches the version `۱٫۱` content that the sign-off record reviews.
  - **Verified on the current checkout:** 12 unique codes in `CT-01` … `CT-12`
    order; 21 unique indicators, each with unit, direction and definition and
    no evidence value; 36 unique action ids, three per domain, each assigned
    to exactly one domain; the module has no imports and no I/O, so it stays
    data-only and versioned; `CULTURAL_DOMAINS_BY_CODE` and
    `getCulturalDomainByCode()` resolve codes (titles are display text only).
- [ ] **E0-TAX-2 — Domain review and sign-off**
  - [ ] Record the owner in `docs/TAXONOMY-SIGNOFF.md`: role
        `CULTURE_BUDGET_HEAD` («مدیرکل بودجه فرهنگی»), full name, user id and
        appointment date. The role is the accountable owner; the named person
        must be filled in before the signature.
  - [ ] Owner reviews the 12 `CT-01` … `CT-12` domains, all 21 indicators
        (unit, direction, definition), all 36 actions and the reference
        priority links against `src/data/culturalTaxonomy.ts`.
  - [ ] Owner approves taxonomy version `۱٫۱` (`CULTURAL_TAXONOMY_VERSION`,
        change-log row `۱٫۱ draft — ۱۴۰۵/۰۸/۱۷`) by recording one decision
        (`Approved` / `Approved with conditions` / `Rejected`) in §4 of the
        record.
  - [ ] Update the taxonomy document header (`Owner: …`,
        `Review status: …`) and change log only after the signature exists.
  - [ ] Record the approval in the Phase 0 status with the record path, date
        and commit.
  - **Artifact:** `docs/TAXONOMY-SIGNOFF.md` — the only accepted approval
    record. Chat messages, email and commit messages are not sign-off.
  - **Why the individual name is still blank:** the repository contains no
    appointment record, and a seeded demo account or Git author is not evidence
    of ownership. Inventing a name would be worse than the gap. The accountable
    role is fixed above; the appointing authority must complete §1 before the
    signature.
  - **Prepared (2026-11-09):** §2 `Commit reviewed` and the §3 verification
    evidence are recorded in `docs/TAXONOMY-SIGNOFF.md` against commit
    `7996751`. Lines 2, 5 and 8 of §3 stay open until `E0-TAX-3` … `E0-TAX-8`
    and `E0-TAX-10` land. Still missing: the owner's full name, user id,
    appointment date and the §4 decision.
  - **Demo fixture added (2026-11-09):** `docs/TAXONOMY-SIGNOFF.demo.md` holds
    mock owner values and a mock decision for demonstration screens and tests.
    It is explicitly not a sign-off, is not the artifact this task accepts, and
    does not change the status below.
  - **Blocker:** the record is unsigned; no owner approval exists.
- [x] **E0-TAX-3 — Route, navigation and access**
  - [x] Add `/cultural-taxonomy`.
  - [x] Add the top-level «حوزه‌های فرهنگی» navigation destination.
  - [x] Make the section read-only for every role with `canViewDashboard`.
  - [x] Avoid introducing a new permission flag.
  - **Artifact:** `CulturalTaxonomyView` (`src/components/CulturalTaxonomyView.tsx`)
    as a read-only page shell; `CULTURAL_TAXONOMY` added to `VALID_TABS` and
    `TAB_PATHS` (`/cultural-taxonomy`) in `src/context/AppContext.tsx`; a
    top-level leaf «حوزه‌های فرهنگی» in `NAV_MENU_ITEMS` (`src/App.tsx`); and the
    gate `CULTURAL_TAXONOMY: (p) => p?.canViewDashboard ?? true` in
    `src/utils/sectionAccess.ts`.
  - **No new permission flag:** `SystemRolePermission` and the seed matrix are
    untouched; the section reuses the `canViewDashboard` baseline, and the
    `SYSTEM_ADMIN` bypass in `canAccessSection` applies as everywhere else.
  - **Verified (2026-11-09):** `tsc --noEmit` clean. A static render of the page
    confirms one `h1`, an `h1` before the `h2`, the version and review status,
    the 12 / 21 / 36 counts, the `CT-xx` join-key text, and zero
    `button`/`input`/`select`/`textarea`/`form` elements, so the page has no
    write surface. Gate checks: a role with `canViewDashboard` opens it; a role
    without it is denied; the `SYSTEM_ADMIN` bypass still applies; an unknown tab
    is refused. The page was **not** opened in a browser.
  - **Scope note:** the shell and access only. The coverage banner and KPI strip
    (`E0-TAX-4`), domain cards (`E0-TAX-5`), search and filters (`E0-TAX-6`),
    coverage calculation (`E0-TAX-7`) and permission-gated CTAs (`E0-TAX-8`)
    remain open and were deliberately not built here.
- [x] **E0-TAX-4 — Page shell, coverage banner and KPI**
  - [x] Add the coverage banner.
  - [x] Add the KPI strip.
  - [x] Derive coverage from live priorities rather than static claims.
  - **Artifact:** `CulturalTaxonomyCoverage` (`src/components/CulturalTaxonomyCoverage.tsx`)
    renders the banner, its progressbar and a four-card KPI strip (coverage
    percent, covered domains, mapped priorities, uncovered domains);
    `CulturalTaxonomyView` feeds it `priorities` from `AppContext`.
    `computeTaxonomyCoverage()` and `readTaxonomyDomainCode()` in
    `src/utils/taxonomyCoverage.ts` hold the counting rule.
  - **Live data only:** the banner has three states (`none` / `partial` /
    `full`) chosen by the live count, and the progressbar exposes
    `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow` and a Persian
    `aria-valuetext`. The reference map's `relatedPriorityIds` never contributes.
  - **Missing DTO field:** `taxonomyDomainId` does not exist in this checkout's
    `CsrPriority` DTO or API responses (`E1-INT-1` is not restored), so the
    helper reads it defensively: absent, blank, non-string and unknown codes
    mean “not mapped”. On today's data coverage is therefore 0 of 12, and the
    banner states that instead of falling back to the static suggestions.
  - **Verified (2026-11-09):** `tsc --noEmit` clean, plus 14 assertions over the
    helper and a static render: empty 0/12, static suggestions never count,
    trimmed codes accepted and unknown/non-string ignored, duplicate codes cover
    once, 2 of 12 → 17%, full coverage → 100%, all three banner states, the
    progressbar's name/min/max/now/value-text, KPI figures, and zero
    `button`/`input`/`select`/`textarea`/`form` elements. The page was **not**
    opened in a browser.
  - **Overlap:** the same helper satisfies `E0-TAX-7`'s three counting rules;
    that task's own review can confirm them.
- [x] **E0-TAX-5 — Domain cards and expandable detail**
  - [x] Show domain code, title, short title and description.
  - [x] Show indicators, actions, outcomes and budget classification.
  - [x] Show suggested reference priority links.
  - [x] Add expandable detail and priority links.
  - **Artifact:** `CulturalTaxonomyDomains` and `CulturalTaxonomyDomainCard`
    (`src/components/CulturalTaxonomyDomains.tsx`), rendered by
    `CulturalTaxonomyView`. Twelve cards in a responsive grid; each header is an
    `h3 > button` carrying the code, title, short title, per-domain indicator and
    action counts and the description, with `aria-expanded` and `aria-controls`
    on a `role="region"` detail. One card is open at a time and Escape on the
    trigger folds it without moving focus; the open state is local and never
    persisted.
  - **Detail sections:** «شاخص‌ها» (label, unit, direction, family), «اقدام‌های
    استاندارد» (title, delivery mode, description), «پیامدهای مورد انتظار»,
    «طبقه‌بندی بودجه», and «پیوندهای پیشنهادی اولویت». The summary panel keeps
    the reference totals as one line (۱۲ حوزه · ۲۱ شاخص · ۳۶ اقدام).
  - **Priority links:** suggestions resolve against the live priority list, so a
    chip reads that priority's real title and navigates to `PRIORITIES`. An id
    absent from the live data is rendered as a muted «یافت نشد» label instead of
    a dead button; the note above the chips states they are suggestions and not
    coverage. Hiding them per permission is `E0-TAX-8` and was not done here.
  - **Verified (2026-11-09):** `tsc --noEmit` clean. A static render check
    confirms 12 collapsed triggers and no detail on first render, all 12 codes,
    titles, short titles and descriptions, 12 `h3` headers, and — rendering each
    card expanded — the detail region with matching `id`/`aria-controls`/
    `aria-labelledby`, all five section headings, 52 of 52 domain-level indicator
    references (21 unique indicators, repeated across domains), 36 of 36 actions
    with their delivery-mode label, every outcome, every budget classification,
    one link button per resolvable suggestion, the «یافت نشد» fallback with no
    button, and no form controls in any state. Click, Escape and focus behaviour
    were **not** exercised in a browser (`E0-TAX-9` covers that matrix).
- [x] **E0-TAX-6 — Search, filters and empty state**
  - [x] Add text search.
  - [x] Add the five indicator-family filters.
  - [x] Add the uncovered-domain filter.
  - [x] Add reset behaviour and an explicit empty state.
  - **Artifact:** `CulturalTaxonomyFilterBar`, `CulturalTaxonomyEmptyState` and the
    filter state in `CulturalTaxonomyDomains`
    (`src/components/CulturalTaxonomyDomains.tsx`); the pure matching rules live
    in `src/utils/taxonomyFilters.ts` (`TaxonomyFilterState`,
    `normalizeTaxonomyText`, `isTaxonomyFilterActive`, `matchesTaxonomyFilters`,
    `filterCulturalDomains`).
  - **Search:** covers code, title, short title, description, keywords,
    outcomes, indicator labels and units, and action titles and descriptions.
    Input is normalised first — Persian yeh/kaf, no harakat, ZWNJ treated as a
    word break, single spaces, lower case — and every whitespace-separated term
    must match, so `ct-04`, `سینما` and `موسیقی بومی` all work.
  - **Families:** five toggle chips (`SUPPLY`, `PARTICIPATION`, `EQUITY`,
    `WORKFORCE`, `HERITAGE`) with `aria-pressed`; a domain matches when it has
    at least one indicator in any selected family (union inside the group, AND
    with the other filters).
  - **Uncovered filter:** takes its codes from `computeTaxonomyCoverage(...).uncoveredDomainCodes`,
    the same helper behind the banner, so the filter and the KPI cannot
    disagree. `uncoveredCodes` lists the domains **without** a mapping.
  - **Reset and empty state:** reset clears all three filters and is disabled
    while pristine; a zero-result state renders an explicit
    `cultural-taxonomy-empty-state` panel with its own reset button.
  - **Announcements:** the result line is a `role="status"` / `aria-live="polite"`
    region and states either «۱۲ حوزه نمایش داده میشود.», «n از ۱۲ حوزه …» or
    «هیچ حوزهای با این جستجو و فیلترها یافت نشد.», so both the count and the
    empty result are announced rather than only drawn.
  - **Verified (2026-11-09):** `tsc --noEmit` clean and 43 assertions pass over
    the helpers and static renders: code/title/indicator search, Arabic-letter
    and ZWNJ tolerance, multi-term AND, nonsense and blank queries; the SUPPLY
    (6), HERITAGE (2) and union (7) domain sets; uncovered-only with all, none
    and a single unmapped code plus combined filters; active-state detection;
    agreement with the coverage helper; the labelled search field, six unpressed
    chips, disabled/enabled reset, both result strings, the live region, the
    empty state's heading and reset, and 12 collapsed cards with exactly one
    input on first render. Typing, clicking and the announced behaviour were
    **not** exercised in a browser (`E0-TAX-9`).
- [ ] **E0-TAX-7 — Coverage calculation**
  - [ ] Count only priorities with an explicit matching `taxonomyDomainId`.
  - [ ] Do not count static reference links as coverage.
  - [ ] Do not write or auto-assign classifications.
- [ ] **E0-TAX-8 — Permission-gated CTAs**
  - [ ] Hide priority links without the required access.
  - [ ] Hide project-creation links without the required access.
- [ ] **E0-TAX-9 — Accessibility and responsive QA**
  - [ ] Keep semantic buttons, labels, progressbar semantics and focus styles.
  - [ ] Run every cell in the matrix below against the current checkout,
        using the test script and pass criteria in this item.
  - [ ] Record `Pass`, `Fail` or `Blocked` per cell, plus tester, date and
        commit. A blank cell is not a result.
  - [ ] Fix every `Fail` and re-run the affected cell before marking the task
        complete; record `Blocked` cells with the missing environment.
  - [ ] Record the final result in the taxonomy document's Phase 0 status row.
  - **Assistive-technology and viewport matrix**

    | Cell | Assistive technology | Browser / OS | Scope | Result |
    |---|---|---|---|---|
    | `AT-1` | NVDA 2025.1 or later | Chrome stable / Windows 11 | Test script P1–P10 | Not run |
    | `AT-2` | JAWS 2025 or later | Chrome stable / Windows 11 | Test script P1–P10 | Not run |
    | `AT-3` | VoiceOver | Safari stable / macOS 14 or later | Test script P1–P10 | Not run |
    | `AT-4` | VoiceOver | Safari stable / iOS 17 or later | Test script P1–P10 | Not run |
    | `KB-1` | None (keyboard only) | Chrome stable / Windows 11 | Test script P1–P10 | Not run |
    | `ZM-1` | Screen reader optional | Chrome, 200% zoom | Test script P8–P10 | Not run |
    | `ZM-2` | Screen reader optional | Chrome, 400% zoom | Test script P8–P10 | Not run |
    | `RS-1` | Screen reader optional | Chrome, 320 CSS px wide | Test script P8–P10 | Not run |
    | `RS-2` | Screen reader optional | Chrome, 768 CSS px wide | Test script P8–P10 | Not run |

  - **Test script**
    1. P1 — Load `/cultural-taxonomy`; confirm a unique page title, one `h1`,
       a navigation landmark and the «حوزه‌های فرهنگی» current-page state.
    2. P2 — Tab through the header, search field, five family filters, the
       uncovered filter and reset. Order follows RTL reading order, every stop
       has a visible focus indicator, and there is no keyboard trap.
    3. P3 — Search a Persian term and a nonsense term. Confirm the result count
       is announced and the empty state is announced, not just drawn.
    4. P4 — Activate each family filter and the uncovered filter. Confirm the
       pressed/selected state is announced and reset restores all 12 domains.
    5. P5 — Expand and collapse a domain card. Confirm `aria-expanded` changes,
       the accessible name identifies the domain, focus stays on the trigger,
       and Escape collapses without moving focus away.
    6. P6 — Read the coverage banner and KPI strip. Confirm counts are coherent,
       and the progressbar exposes an accessible name, value, min and max.
    7. P7 — Inspect controls and media. Icon-only buttons have accessible
       names; decorative icons are hidden from assistive technology; headings
       are hierarchical.
    8. P8 — With a role that lacks `canManagePriorities` / `canCreateProject`,
       confirm hidden CTAs leave no focus stop and are absent from the
       accessibility tree.
    9. P9 — At 200% and 400% zoom, confirm text and controls remain usable and
       no control is clipped or overlaps its neighbour.
    10. P10 — At 320 px and 768 px, confirm content reflows to one column where
        required; the main content has no horizontal scrolling and no
        information is lost.
  - **Pass criteria**
    - Every `AT-*`, `KB-1`, `ZM-*` and `RS-*` cell is `Pass`; one `Fail` keeps
      the task Partial.
    - Keyboard: every interactive element is reachable, focus is visible at
      ≥ 3:1 contrast, order is logical, and no trap exists.
    - Screen reader: labels, roles, states and the progressbar value are
      announced; no unnamed button, link or field; filter states are announced.
    - Visual: no information conveyed by colour alone; text contrast ≥ 4.5:1
      (≥ 3:1 for large text); non-text UI contrast ≥ 3:1.
    - Reflow: usable at 400% zoom and 320 CSS px; no loss of content or
      function and no two-dimensional scrolling for the main content.
    - Automated scan: zero critical or serious axe-core violations on the
      route; every moderate or minor finding is triaged with an owner.
  - **Blocker:** no completed run exists; all cells are `Not run`.
- [ ] **E0-TAX-10 — Reference document and version log**
  - [ ] Document the taxonomy purpose, section behaviour and domain map.
  - [ ] Document the indicator families and integration contract.
  - [ ] Record the version history.

### E0-TR — Transparency and trust

- [ ] **E0-TR-1 — Demo-data banner**
  - [ ] Render one persistent banner in the workspace shell
        (`DataProvenanceBanner`), above page content on every signed-in section;
        it is not dismissible and has no close control.
  - [ ] Drive it only from `GET /api/health` → `dataset.demo`: `true` only for
        `app_meta.demo_seed = bundled-v1` or `DEMO_DATA=1`; `false` for a legacy
        import; `null` when the database is down or the marker read fails.
  - [ ] Implement exactly three states:
        - `true` → amber banner with `role="note"`, aria-label
          «هشدار داده نمایشی», and the demo/seed wording;
        - `false` → no banner and no demo claim;
        - `null` or request failure → no banner and no «live» / «official» label
          anywhere.
  - **Required surfaces:** every signed-in screen through the shared shell. No
    tab is exempt and no screen draws a second global banner. A local badge on
    a data card is allowed but must not contradict the shell state.
  - **Acceptance:** a demo deployment shows the banner on dashboard, priorities,
    projects, budget sources and taxonomy; a legacy import shows none; stopping
    PostgreSQL removes the banner and leaves no live claim; a query parameter or
    `localStorage` flag cannot force or hide it.
- [ ] **E0-TR-2 — Audit shortcut**
  - [ ] Keep two entry points: the Settings button
        `settings-view-open-audit-logs` («لاگ ممیزی») and the dashboard insight
        strip button («مشاهده لاگ‌های خام»).
  - [ ] Both must navigate to the `ROLES_PERMISSIONS` section with the
        `AUDIT_LOGS` sub-tab active and the hash `#audit-logs` set before the
        section renders.
  - [ ] Permission is `canAuditLogs`; `SYSTEM_ADMIN` bypasses the flag as it
        does elsewhere. The server's `GET /api/audit-logs` guard remains
        authoritative; hiding a button is not authorization.
  - [ ] Visibility: show each shortcut only when
        `canAccessSection('ROLES_PERMISSIONS', permissions, role)` is true.
        Otherwise it is absent from the DOM and the tab order, not merely
        `aria-disabled`.
  - [ ] A non-admin always lands on the read-only audit table; the matrix
        sub-tab is not reachable by hash or last-visit state. An admin can
        switch to the matrix.
  - **Acceptance:** admin sees both shortcuts and reaches the audit table;
    `INTERNAL_AUDITOR` sees both and reaches only the audit table; a role
    without `canAuditLogs` sees neither, cannot focus one, and direct navigation
    falls back; after either click the URL hash is `#audit-logs` and the audit
    rows are visible.
  - **Known gaps:** the dashboard button calls
    `setActiveTab('AUDIT_LOGS')`, which is not a section gate, so
    `canAccessTab` ignores it and the click does nothing. The Settings button is
    rendered for every Settings visitor without checking `canAuditLogs`. Both
    must be fixed before this item can be re-checked as done.
- [ ] **E0-TR-3 — Remove dead views**
  - [ ] Delete `ArchitectureDocsView.tsx`, `CompanySetupView.tsx`,
        `CsrDomainsCatalogView.tsx`, `PredictiveModelView.tsx` and
        `SmartRecommendationView.tsx`.
  - [ ] Remove their imports, routes, navigation entries, section gates, tour
        steps and lazy chunks. No compatibility alias may keep them renderable.
  - **Acceptance:** searching `src` for any of the five component names returns
    zero matches; no `NAV_MENU_ITEMS` entry or section gate points at them; the
    production build emits no chunk for them; `bun run build` and `bun run lint`
    pass; no link or hash reaches a blank page.
  - **Note:** the current `main` checkout still contains these files (see
    [Repository warning](#repository-warning)); verify against the recovered
    commit or after restoring the taxonomy branch.
- [ ] **E0-TR-4 — Global glossary**
  - [ ] Accountable owner: `SYSTEM_ADMIN` maintains structure, uniqueness and
        consistency. Category reviewers: `TREASURY_FINANCE_HEAD` (budget),
        `CULTURE_BUDGET_HEAD` (CSR and culture), `PLAN_OFFICER` (planning) and
        `INTERNAL_AUDITOR` (governance). A category change needs its reviewer's
        approval.
  - [ ] Required term list — these 30 ids at this snapshot, grouped by
        category:
        - `BUDGET` (8): `budget-ceiling`, `allocation-percentage`,
          `absorption-rate`, `per-capita-budget`, `fiscal-year`,
          `current-vs-development`, `allocation-lock`, `budget-classification`.
        - `CSR` (6): `csr`, `stakeholders`, `social-impact`,
          `sustainability-report`, `gri`, `community-participation`.
        - `PLANNING` (8): `needs-assessment`, `indicator`, `composite-index`,
          `deprivation`, `spatial-equity`, `performance-based-budgeting`, `kpi`,
          `monitoring-evaluation`.
        - `GOVERNANCE` (4): `transparency`, `audit-trail`, `conflict-of-interest`,
          `data-governance`.
        - `CULTURE` (4): `cultural-domain`, `cultural-taxonomy`,
          `standard-action`, `intangible-heritage`.
  - [ ] Every entry carries a term, category, definition, and a formula where
        one applies; aliases include the Persian and English variants actually
        used in the UI.
  - [ ] Coverage boundary: domain terms, acronyms and formulas that appear in
        UI labels, help text or API machine codes. Excluded: role names, field
        validation messages, component names and one-off tooltips.
  - [ ] Availability: a single global trigger
        (`app-workspace-identity-bar-glossary`) is visible to every signed-in
        role, including a `canViewDashboard`-only role. The drawer is not
        permission-gated and needs no per-section link.
  - **Acceptance:** all 30 required ids present exactly once with unique ids;
    every category non-empty (8/6/8/4/4); any later addition satisfies the
    boundary and has reviewer approval; searching any term or its first alias
    finds it; definitions and formulas match the corresponding page help;
    Escape closes the drawer, focus moves into search on open and returns to the
    trigger on close; the trigger stays usable at 320 CSS px on every section.
- [ ] **E0-TR-5 — Exact and compact money display**
  - [ ] Persist the browser-local preference at `csr.numberDisplayMode` with
        values `compact` (default) and `exact`; it is never sent to the server.
  - [ ] Compact tiers, with Persian digits, thousands separator «،» (U+060C)
        and decimal separator «٫» (U+066B):
        - `>= 1_000_000_000_000` Toman → «همت», up to 2 decimals;
        - `>= 1_000_000_000` → «میلیارد تومان», up to 2 decimals;
        - `>= 1_000_000` → «میلیون تومان», up to 1 decimal;
        - `< 1_000_000` → whole «تومان», 0 decimals.
  - [ ] Exact mode prints the whole amount with 0 decimals and the «تومان»
        suffix. Both modes round to the displayed precision (half away from
        zero) and trim trailing zeros.
  - [ ] Zero, negatives and compactness are fixed by these examples:

    | Toman | Compact | Exact |
    |---|---|---|
    | `0` | ۰ تومان | ۰ تومان |
    | `12_345` | ۱۲،۳۴۵ تومان | ۱۲،۳۴۵ تومان |
    | `1_234_567` | ۱٫۲ میلیون تومان | ۱،۲۳۴،۵۶۷ تومان |
    | `2_500_000_000` | ۲٫۵ میلیارد تومان | ۲،۵۰۰،۰۰۰،۰۰۰ تومان |
    | `14_600_000_000_000` | ۱۴٫۶ همت | ۱۴،۶۰۰،۰۰۰،۰۰۰،۰۰۰ تومان |
    | `-2_500_000_000` | -۲٫۵ میلیارد تومان | -۲،۵۰۰،۰۰۰،۰۰۰ تومان |

  - [ ] Negative values use a leading minus sign directly before the digits,
        never parentheses and never a separate colour-only cue.
  - [ ] The preference applies to `formatMoney`, `formatMoneyParts`,
        `formatToman` / `formatLargeBudgetPersian` and `compactToman`. Chart
        axes and stored prose keep deterministic formatting: `formatHemmat`
        stays in همت and audit text uses the always-compact formatter.
  - [ ] Display only: stored Toman amounts, calculations, exports and audit
        text never change with the preference.
  - **Acceptance:** the example table matches the formatter in both modes;
    switching the preference re-renders money without a reload and survives a
    reload; clearing the key returns to compact; no API request carries the
    preference; audit rows and stored amounts are byte-identical before and
    after switching.

### E0-SEC — Security verification

- [ ] **E0-SEC-1 — Server-side security verification and stale documentation**
  - [ ] Verify the ten checks `S1` … `S10` in
        `docs/SECURITY-VERIFICATION.md` on one recorded commit.
  - [ ] Attach evidence to every row: request/response or log excerpt, date,
        environment, verifier.
  - [ ] Correct the stale API-documentation warning: `docs/API_DOCS.md` §2
        must carry the write-guard statement, every mutating route in §5 must
        show its 🔑 permission flag, and no `(gap)` marker may remain.
  - [ ] Record the verification in the Phase 0 status with the record path,
        commit, date, verifier and overall result.
  - **Artifact:** `docs/SECURITY-VERIFICATION.md` — checklist, evidence and
    sign-off in one record.
  - **Checklist (full method and expected result in the record)**
    - `S1` — Anonymous access to every non-public `/api/*` route returns
      `401 AUTH_REQUIRED`.
    - `S2` — Every mutating route enforces its documented permission and
      returns `403 FORBIDDEN` to a signed-in role without it.
    - `S3` — Identity and ownership come from the session only; client-supplied
      actor / creator / updater ids are rejected or overwritten.
    - `S4` — Two accounts with different `allowedLocationId` / `scopeLevel`
      cannot read or mutate each other's records.
    - `S5` — Session controls hold: 15-minute access token, 4-hour absolute
      refresh, rotation, revocation via `tokensValidFrom`, `httpOnly` cookies
      and `Secure` in production.
    - `S6` — Authentication events and mutations are audited with
      `actorUserId`; `GET` / `POST /api/audit-logs` require `canAuditLogs`;
      the dashboard audit shortcut is hidden without that permission.
    - `S7` — Errors leak no SQL, stack or secret; a database outage returns
      `503`; no secret appears in the client bundle or logs.
    - `S8` — Authentication abuse controls hold: OTP request `6 / 10 min / IP`,
      OTP verify `20 / min / IP`, generic credential errors.
    - `S9` — `docs/API_DOCS.md` matches the implemented guards, with no stale
      warning.
    - `S10` — Development seed and login routes fail closed outside local
      development.
  - **Blocker:** no signed verification record exists for the current commit.

---

## Phase 1 — Integration

### E1-INT — Taxonomy integration

- [ ] **E1-INT-1 — Nullable taxonomy join key**
  - [ ] Add optional `taxonomyDomainId` to priority and project DTOs.
  - [ ] Add nullable PostgreSQL `text` columns to both tables in
        `server/migrations/0007_add_taxonomy_domain.sql`, using
        `ADD COLUMN IF NOT EXISTS`, with no foreign key and no default.
  - [ ] Add the matching Drizzle schema fields and the
        `server/migrations/meta/_journal.json` entry.
  - [ ] Map the field in the priority and project repositories: absent or
        `undefined` → `NULL`, a `CT-xx` code → the text value, an explicit clear
        → `NULL`.
  - [ ] Keep existing records `NULL`; perform no backfill and no automatic
        classification.
  - [ ] Document the field and update the API schemas.
  - **Apply / rollback acceptance**
    - Apply `0007` to an empty database and to a database with existing
      priorities and projects. Both columns exist, are `text` and nullable, and
      the migration runner records the version once.
    - Run the same migration a second time: it is a no-op and raises no error.
    - After the migration, `SELECT count(*) FROM priorities WHERE
      taxonomy_domain_id IS NOT NULL` and the same query on `projects` both
      return 0.
    - Round-trip through the API/repository: create without the field → `NULL`;
      update with `CT-03` → `CT-03`; update with an empty value → `NULL`; read
      back the same value each time.
    - Roll back with
      `ALTER TABLE priorities DROP COLUMN IF EXISTS taxonomy_domain_id;` and
      the same statement for `projects`; every other column and row survives.
      Re-apply `0007` after the rollback and repeat the round-trip.
    - The API keeps `taxonomyDomainId` optional in requests and present as
      `null` in responses; no client is required to send it.
- [ ] **E1-INT-2 — Taxonomy code validation**
  - [ ] Add `validateTaxonomyDomainId()`.
  - [ ] Accept known `CT-xx` codes and trim surrounding whitespace.
  - [ ] Treat empty or missing values as “clear the mapping”.
  - [ ] Reject unknown and non-string values with `400 INVALID_TAXONOMY_DOMAIN`.
  - [ ] Validate priority create.
  - [ ] Validate priority update.
  - [ ] Validate every row of the bulk priority import before replacing the matrix.
  - [ ] Validate project create.
  - [ ] Validate project update.
  - [ ] Document the machine code and update OpenAPI.
- [ ] **E1-INT-3 — Read-only taxonomy reference API**
  - [ ] Add a typed `CulturalTaxonomyReference` payload.
  - [ ] Include version, review status and label maps.
  - [ ] Include all 12 domains, their actions and their indicators.
  - [ ] Include the evidence-confidence labels and pending-evidence label.
  - [ ] Add authenticated `GET /api/cultural-taxonomy`.
  - [ ] Send `Cache-Control: private, max-age=300`.
  - [ ] Persist nothing and perform no automatic mapping.
  - [ ] Add the path and schemas to `openapi.yaml` and `openapi.json`.
  - [ ] Document the endpoint in `docs/API_DOCS.md`.
  - [ ] Add an HTTP integration test with these cases:
        1. Anonymous `GET /api/cultural-taxonomy` → `401`, JSON body with
           `code: AUTH_REQUIRED`, and no taxonomy payload.
        2. Invalid or expired token → `401` with the same code.
        3. Valid session cookie → `200` and `Content-Type` starting with
           `application/json`.
        4. Same request with `Authorization: Bearer <jwt>` → identical `200`
           body.
        5. Response header is exactly `Cache-Control: private, max-age=300`
           (no `public`, no `s-maxage`).
        6. Body identity: `version` = `۱٫۱`; `reviewStatus` =
           «در انتظار تأیید متولی»; `families` has 5 keys; `deliveryModes`
           has 5; `evidenceConfidence` has `HIGH`/`MEDIUM`/`LOW`;
           `evidencePendingLabel` = «ثبت نشده».
        7. Payload counts: `domains.length` = 12 with unique
           `CT-01` … `CT-12` codes; `indicators.length` = 21; the sum of
           `domains[].actions.length` = 36 and every action belongs to exactly
           one domain.
        8. Evidence is empty: all 21 indicators lack `source`,
           `referenceYear` and `confidence`, and none claims a citation.
        9. Read-only: two consecutive calls return the same body, and the row
           counts plus the number of non-null `taxonomy_domain_id` values in
           priorities and projects are unchanged.
- [ ] **E1-INT-4 — Manual taxonomy mapping**
  - [ ] Add the reusable `TaxonomyDomainSelect` (select + explicit empty
        option) and `TaxonomyDomainBadge` (code + title, nothing when unset).
  - [ ] Wire every surface in this matrix; “selector” means an editable
        control and “badge” means read-only display.

    | # | Surface | Component / location | Kind | Clear / empty behaviour |
    |---|---|---|---|---|
    | 1 | Priority card | `PrioritiesView`, card meta row | Badge | No badge when `taxonomyDomainId` is absent |
    | 2 | Priority edit modal | `PrioritiesView`, form | Selector | Empty option saves `null`; badge disappears and coverage drops |
    | 3 | Project quick-entry / CRUD modal | `ProjectsView`, create and edit | Selector | Opens with the stored value; empty saves `null`; resets to empty after create |
    | 4 | Project detail modal | `ProjectsView`, detail panel | Badge | Panel omitted entirely when unset |
    | 5 | Project wizard step 4 | `CreateProjectView`, strategic-priority step | Selector | Independent of the selected priority; changing priority resets it to empty |
    | 6 | Project wizard review | `CreateProjectView`, review step | Read-only row | Shows `CT-xx — title` or «بدون نقشه‌برداری» |
    | 7 | Project wizard summary | `CreateProjectView`, core attributes | Badge | Shows the badge or «بدون نقشه‌برداری» |
    | 8 | Taxonomy reference page | `CulturalTaxonomyView` | Read-only mapped-priority list and coverage count | Domain with no mappings lists none and counts as uncovered; no selector and no writes here |

  - [ ] Keep rows without a domain valid everywhere; never derive a mapping
        from a title, category or static reference link.
  - [ ] Count only explicit `taxonomyDomainId` matches in taxonomy coverage;
        clearing a mapping decreases coverage immediately.
  - [ ] Reject unknown or non-string codes with
        `400 INVALID_TAXONOMY_DOMAIN` (see `E1-INT-2`); a badge never renders an
        unknown code.
  - **Acceptance:** set a domain on a priority and see it on the card, in the
    edit modal, in coverage, and in the taxonomy page's mapped list; clear it
    and see all four revert. Repeat for a project through the CRUD modal and the
    wizard: the review row and summary show the code or «بدون نقشه‌برداری»,
    changing the priority clears the manual domain, and saving empty stores
    `NULL`. A role without `canManagePriorities` cannot reach the priority
    editor, and one without `canCreateProject` cannot open the project
    create/edit form; badges stay readable on surfaces the role may view, and no
    surface auto-assigns a domain.

### E1-PRJ — Project flow

> `E1-PRJ-1` was retired on 2026-11-09; see
> [Retired task IDs](#retired-task-ids). `E1-PRJ-2` is the only active task in
> this group.

- [ ] **E1-PRJ-2 — Proposal without a strategic priority**
  - [ ] Make priority selection optional in the project wizard.
  - [ ] Add «بدون اولویت راهبردی (پیشنهاد)» to the quick-entry form.
  - [ ] Store an empty priority as `NULL`.
  - [ ] Use the consistent fallback title «بدون اولویت راهبردی».
  - [ ] Allow a priority to be assigned later through project edit.
  - [ ] Update the taxonomy integration documentation.

### E1-EVD — Indicator evidence

- [ ] **E1-EVD-1 — Indicator evidence metadata**
  - [ ] Add optional `source`, `referenceYear` and `confidence` to every indicator.
  - [ ] Add confidence labels and the explicit pending label «ثبت نشده».
  - [ ] Add `hasCulturalIndicatorEvidence()`.
  - [ ] Show evidence completeness on indicator cards.
  - [ ] Show explicit «ثبت نشده» rows instead of blank fields.
  - [ ] Show the count of indicators with complete evidence in the KPI area.
  - [ ] Bump the taxonomy version to `۱٫۱`.
  - [ ] Never invent a source or citation.
  - [ ] Leave all 21 indicators marked incomplete until real evidence is recorded.
  - [ ] Record every value under the rubric and approval process below; a
        value that has not been approved stays absent.
  - **Confidence rubric** — confidence must not exceed the weakest criterion
    actually satisfied.

    | Level | Label | Criteria (all must hold) |
    |---|---|---|
    | `HIGH` | بالا | Primary official statistical source — for example the Statistical Centre of Iran, a ministry registry or the budget law. The cited table matches the indicator's definition, unit and direction exactly; the reference year is within three Persian years of the taxonomy version date; a retrievable locator (URL, document number or dataset id) is recorded. |
    | `MEDIUM` | متوسط | An official source that misses exactly one `HIGH` condition: reference year older than three years, a documented partial definition or unit mismatch, or an authoritative administrative registry rather than a statistical series. |
    | `LOW` | پایین | A derived or secondary estimate, or a documented expert assessment, with its method recorded. It is not a primary statistic. A primary statistic must not be labelled `LOW` to avoid citation work. |

  - **Recording rules**
    - A row is either a complete trio (`source`, `referenceYear`,
      `confidence`) or all three fields absent. Never record a partial row.
    - `source` names the issuing organisation, the publication or dataset and
      the locator. A bare organisation or a placeholder URL is invalid.
    - `referenceYear` is a Persian year such as «۱۴۰۳», not an ISO date.
    - Missing or unapproved evidence renders «ثبت نشده» and makes
      `hasCulturalIndicatorEvidence()` false. Today 0 of 21 indicators are
      complete; the target is 21 approved indicators.
  - **Evidence-approval process**
    1. The taxonomy owner nominates recorders in §1 of
       `docs/TAXONOMY-SIGNOFF.md`. A recorder proposes the complete trio plus
       the citation.
    2. The owner checks the proposal against the rubric and either approves or
       rejects it. A recorder may not approve their own entry; an entry recorded
       by the owner is approved by `SYSTEM_ADMIN`.
    3. The approval is recorded in the evidence-approval log (§5) of the
       sign-off record with indicator id, source, year, confidence, approver
       and date.
    4. The complete trio is merged with the change; the merged commit is
       referenced in the approval row. Rejected or unsupported evidence stays
       absent and is never merged as a placeholder.
    5. Any later change to `source`, `referenceYear` or `confidence` needs a new
       approval row; the previous row stays in the log.
    - The runtime completeness test stays the three-field presence check in
      `hasCulturalIndicatorEvidence()`. The approval row is the governance
      condition for merging those fields, so an unapproved trio must never be
      present in the first place.

---

## Retired task IDs

| Task | Retired | Reason | Coverage of any surviving intent |
|---|---|---|---|
| `E1-PRJ-1` | 2026-11-09 | No recovered document, commit message, task map or code artefact defines its scope. The ID exists only as an implication of the Phase 1 numbering. | The two known project-flow outcomes are covered: manual domain selection in the project wizard and edit flow by `E1-INT-4`, and proposals without a strategic priority by `E1-PRJ-2`. No unimplemented behaviour is known to remain. |

Retirement rules:

- A retired ID is never reused and never counted in the active checklist.
- Reinstating it requires a recovered source document and a new entry in this
  table explaining the recovery.
- The implementation history contains no commit attributable to `E1-PRJ-1`;
  no completion claim is made for it.

## Recovered implementation map

| Task group | Recovered commit |
|---|---|
| `E0-TAX-1` … `E0-TAX-8`, `E0-TAX-10`, `E0-TR-1` … `E0-TR-4` | `50ab01a` — taxonomy section, provenance banner, glossary and dead-view cleanup |
| `E0-TR-5` | `041a291` — exact and compact money display modes |
| `E1-INT-1` | `9d200ea` — nullable taxonomy domain IDs |
| `E1-INT-4` | `a2d515c` — manual taxonomy mapping |
| `E1-PRJ-2` | `7c34d81` — projects without a strategic priority |
| `E1-EVD-1` | `3a47d5d` — indicator evidence metadata |
| `E1-INT-2` | `b33341d` — taxonomy ID validation on writes |
| `E1-INT-3` | `29aacd7` — read-only taxonomy reference API |

`E0-TAX-9` is partially recorded in the taxonomy commit; the remaining
assistive-technology QA has no implementation commit. `E0-SEC-1` is recorded
only as a verification and documentation correction in the Phase 0 status; the
signed record described above is still outstanding.

## Ambiguity review

Every task and subtask was checked against its wording, the recovered
documentation and the available commits.

### Resolved ambiguities

The five items below were resolved on 2026-11-09. Their definitions above are
normative; this table records where each definition lives and what closed the
ambiguity.

| Task | Was ambiguous because | Resolution | Defined in |
|---|---|---|---|
| `E0-TAX-2` | Owner was the placeholder `D1`; no sign-off artifact or version. | Owner is the `CULTURE_BUDGET_HEAD` role («مدیرکل بودجه فرهنگی»), personally named in the sign-off record. Approval artifact is `docs/TAXONOMY-SIGNOFF.md`; the version being approved is `۱٫۱`. The decision values and the post-signature document updates are fixed. | `E0-TAX-2` above; `docs/TAXONOMY-SIGNOFF.md` §1, §2, §4 |
| `E0-TAX-9` | “Formal screen-reader QA” had no AT matrix, browsers, script or pass criteria. | Nine-cell matrix (`AT-1` … `AT-4`, `KB-1`, `ZM-1` … `ZM-2`, `RS-1` … `RS-2`) with a ten-step script and six pass criteria; every cell records `Pass` / `Fail` / `Blocked` with tester, date and commit. | `E0-TAX-9` above |
| `E0-SEC-1` | “Verify server-side security” was broad with no checklist or retained evidence. | Ten checks `S1` … `S10` with method, expected result, evidence fields and `SYSTEM_ADMIN` sign-off; the stale-documentation correction is an explicit check (`S9`). | `E0-SEC-1` above; `docs/SECURITY-VERIFICATION.md` |
| `E1-PRJ-1` | No recovered document or commit defined the task. | Retired after exhaustive repository and Git-history search, with the surviving known intent traced to `E1-INT-4` and `E1-PRJ-2`. The ID is not reused. | [Retired task IDs](#retired-task-ids) |
| `E1-EVD-1` | The `HIGH` / `MEDIUM` / `LOW` rubric and the approval process were undefined. | Rubric defines all three levels against source authority, definition match and reference-year freshness. Approval: nominated recorder proposes a complete trio, taxonomy owner approves (`SYSTEM_ADMIN` if the owner recorded it), the approval row is logged in the sign-off record, and no partial or unapproved row is merged. | `E1-EVD-1` above; `docs/TAXONOMY-SIGNOFF.md` §5 |

### Resolved ambiguities — second pass (2026-11-09)

These eight items were resolved after checking the recovered implementation.
No ambiguity remains open; the table records the decision and its normative
location.

| Task | Was ambiguous because | Resolution | Defined in |
|---|---|---|---|
| `E0-TR-1` | Surfaces and unknown-provenance rendering were unspecified. | One non-dismissible shell banner on every signed-in screen; exactly three states (`true` / `false` / `null`) with server-owned `dataset.demo`; unknown never reads as live. | `E0-TR-1` above |
| `E0-TR-2` | Destination, permission and visibility were unnamed. | Two entry points; destination `ROLES_PERMISSIONS` + `#audit-logs`; `canAuditLogs` (admin bypass); hidden from DOM without it; non-admins stay on the audit sub-tab. Two known control-flow gaps are recorded. | `E0-TR-2` above |
| `E0-TR-3` | Acceptance did not require imports, routes and nav to be gone. | Five named files deleted, zero `src` references, no nav/gate/lazy chunk, build and lint pass. | `E0-TR-3` above |
| `E0-TR-4` | No owner, term list or boundary. | `SYSTEM_ADMIN` owns structure with four category reviewers; exactly 30 ids in 5 categories; global identity-bar trigger for every signed-in role; explicit inclusion/exclusion boundary. | `E0-TR-4` above |
| `E0-TR-5` | Separators, precision, negatives and zero were undefined. | Tier thresholds, Persian separators, 0/1/2 decimal rules, zero and negative behaviour, a six-row example table, and the display-only guarantee for stored and audit values. | `E0-TR-5` above |
| `E1-INT-1` | Migration acceptance and rollback were unstated. | Nullable `text` columns with `IF NOT EXISTS`, fresh/populated/second-run apply, null backfill check, API round-trip, documented `DROP COLUMN` rollback and re-apply. | `E1-INT-1` above |
| `E1-INT-3` | The HTTP test had no cases. | Nine cases covering anonymous/invalid/bearer/cookie auth, exact private cache header, payload identity, 12/21/36 counts, empty evidence and no-write behaviour. | `E1-INT-3` above |
| `E1-INT-4` | “Review surfaces” was not exhaustive and clear semantics were missing. | Eight-row surface matrix covering priority card/edit, project CRUD/detail, wizard step 4/review/summary and the taxonomy page, with clear/empty behaviour, validation and coverage rules. | `E1-INT-4` above |

## Cross-cutting verification backlog

- [ ] Apply and test migration `0007` against a live PostgreSQL instance.
- [ ] Run an authenticated HTTP check for `GET /api/cultural-taxonomy`.
- [ ] Verify the taxonomy selectors, badges and evidence rows in a browser.
- [ ] Repeat the taxonomy and proposal flows with two accounts to confirm data isolation.
- [ ] Complete every cell of the `E0-TAX-9` assistive-technology matrix and record the results.
- [ ] Run `S1` … `S10` in `docs/SECURITY-VERIFICATION.md`, attach evidence and obtain the record's sign-off from `SYSTEM_ADMIN` or a nominated technical lead (`E0-SEC-1`).
- [ ] Complete `docs/TAXONOMY-SIGNOFF.md` and obtain the taxonomy owner's signature (`E0-TAX-2`).
- [ ] Record the first evidence approval rows for `E1-EVD-1`; until then keep all 21 indicators incomplete.
- [ ] Fix and verify both audit shortcuts for admin, auditor and no-audit roles (`E0-TR-2`).
- [ ] Check the `E0-TR-5` example table against the formatter in both modes.
- [ ] Verify the glossary's 30 entries, search, category filters and global trigger (`E0-TR-4`).

## Task coverage check

The recovered task record accounts for:

- `E0-TAX-1` … `E0-TAX-10` — all ten subtasks included above.
- `E0-TR-1` … `E0-TR-5` — all five subtasks included above.
- `E0-SEC-1` — included above.
- `E1-INT-1` … `E1-INT-4` — all four subtasks included above.
- `E1-PRJ-1` — retired; recorded under [Retired task IDs](#retired-task-ids).
- `E1-PRJ-2` — included above.
- `E1-EVD-1` — included above.

No other Phase 0 or Phase 1 task IDs were found in the recovered documents,
commit messages, API documentation or OpenAPI files. The active map therefore
contains 22 tasks: 20 recovered as Done, one Partial (`E0-TAX-9`) and one
Pending (`E0-TAX-2`). The ambiguity review above covers all active tasks; no
ambiguity item remains open. The outstanding work is verification: the
assistive-technology run (`E0-TAX-9`), the taxonomy sign-off (`E0-TAX-2` and
`E0-TAX-9`) and the two recorded audit-shortcut gaps (`E0-TR-2`).

## Repository warning

At this snapshot, the current `main` working tree does **not** contain the
taxonomy source files or `docs/CULTURAL-TAXONOMY.md`. The prior implementation
is recoverable from unreachable Git commits (`50ab01a` through `f1e00b0`) and
from `dist/`, which was built after the taxonomy work. The statuses above are
therefore historical records, not proof that the implementation is present in
the current checkout.
