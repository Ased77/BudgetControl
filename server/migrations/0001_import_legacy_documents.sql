-- ─────────────────────────────────────────────────────────────────────────
-- Data migration — the old document model into the normalized tables.
--
-- Source: `legacy_*` tables (renamed by 0000), whose scalar columns were
-- indexed mirrors of a `payload jsonb` holding the whole entity.
--
-- Guarantees:
--   * every table import is an existence-guarded no-op on a fresh database;
--   * FK references are copied ONLY when the parent row exists — the
--     document model silently tolerated stale ids; the normalized model
--     would refuse the insert, so dangling ids are nulled on the way in
--     (the UI already renders an empty name for a missing parent);
--   * numeric fields are truncated/clamped into their column ranges (the
--     CHECKs would otherwise turn one bad legacy row into a boot failure);
--   * audit_logs / analysis_sources bring their legacy `seq` along
--     (OVERRIDING SYSTEM VALUE) so "newest first" ordering survives, and
--     the identity sequences are reset past the imported maximum.
--
-- Runbook: `bun run db:legacy:list` reports the legacy_* tables remaining.
-- Dropping them is a deliberately manual step.
-- ─────────────────────────────────────────────────────────────────────────

-- ---------------------------------------------------------------- organization
DO $$
BEGIN
IF to_regclass('public.legacy_organization') IS NOT NULL THEN
  INSERT INTO organization (id, name, org_type, activity_sector, national_code,
    province, city, county, district, total_budget, currency_unit, budget_period,
    fiscal_year, description, updated_at)
  SELECT id,
    COALESCE(payload->>'name', ''), COALESCE(payload->>'orgType', 'GOVERNMENT'),
    COALESCE(payload->>'activitySector', ''), payload->>'nationalCode',
    COALESCE(payload->>'province', ''), COALESCE(payload->>'city', ''),
    COALESCE(payload->>'county', ''), COALESCE(payload->>'district', ''),
    COALESCE(trunc((payload->>'totalBudget')::numeric), 0)::bigint,
    COALESCE(payload->>'currencyUnit', 'TOMAN'),
    COALESCE(payload->>'budgetPeriod', '1_YEAR'),
    COALESCE(payload->>'fiscalYear', ''), payload->>'description',
    COALESCE(payload->>'updatedAt', '')
  FROM legacy_organization
  ON CONFLICT (id) DO NOTHING;
END IF;
END $$;

-- ------------------------------------------------------------------- locations
DO $$
BEGIN
IF to_regclass('public.legacy_locations') IS NOT NULL THEN
  INSERT INTO locations (id, level, province, county, city, district, population,
    coordinates_lat, coordinates_lng)
  SELECT id,
    COALESCE(payload->>'level', 'NATIONAL'), COALESCE(payload->>'province', ''),
    COALESCE(payload->>'county', ''), COALESCE(payload->>'city', ''),
    COALESCE(payload->>'district', ''),
    COALESCE(trunc((payload->>'population')::numeric), 0)::bigint,
    (payload->'coordinates'->>'lat')::double precision,
    (payload->'coordinates'->>'lng')::double precision
  FROM legacy_locations
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO location_indicators (location_id, poverty_rate, marginalization_rate,
    unemployment_rate, social_harms_index, vulnerable_groups_population,
    infrastructure_deficit, crisis_vulnerability_score, health_access_deficit,
    education_drop_out_rate, cultural_deficit_score, environmental_risk_score)
  SELECT id,
    COALESCE((payload->'indicators'->>'povertyRate')::double precision, 0),
    COALESCE((payload->'indicators'->>'marginalizationRate')::double precision, 0),
    COALESCE((payload->'indicators'->>'unemploymentRate')::double precision, 0),
    COALESCE((payload->'indicators'->>'socialHarmsIndex')::double precision, 0),
    COALESCE(trunc((payload->'indicators'->>'vulnerableGroupsPopulation')::numeric), 0)::bigint,
    COALESCE((payload->'indicators'->>'infrastructureDeficit')::double precision, 0),
    COALESCE((payload->'indicators'->>'crisisVulnerabilityScore')::double precision, 0),
    COALESCE((payload->'indicators'->>'healthAccessDeficit')::double precision, 0),
    COALESCE((payload->'indicators'->>'educationDropOutRate')::double precision, 0),
    COALESCE((payload->'indicators'->>'culturalDeficitScore')::double precision, 0),
    COALESCE((payload->'indicators'->>'environmentalRiskScore')::double precision, 0)
  FROM legacy_locations
  WHERE payload ? 'indicators' AND jsonb_typeof(payload->'indicators') = 'object'
  ON CONFLICT (location_id) DO NOTHING;
END IF;
END $$;

-- ----------------------------------------------------------------- departments
DO $$
BEGIN
IF to_regclass('public.legacy_departments') IS NOT NULL THEN
  INSERT INTO departments (id, name, code, category, category_fa, head_person_name,
    contact_number, email, logo_data_url, allocated_budget_toman,
    absorbed_budget_toman, active_projects_count, performance_score,
    administrative_level, province, county, description)
  SELECT id,
    COALESCE(payload->>'name', ''), COALESCE(payload->>'code', ''),
    COALESCE(payload->>'category', 'INFRASTRUCTURE'),
    COALESCE(payload->>'categoryFa', ''), COALESCE(payload->>'headPersonName', ''),
    COALESCE(payload->>'contactNumber', ''), payload->>'email', payload->>'logoDataUrl',
    COALESCE(trunc((payload->>'allocatedBudgetToman')::numeric), 0)::bigint,
    COALESCE(trunc((payload->>'absorbedBudgetToman')::numeric), 0)::bigint,
    COALESCE(trunc((payload->>'activeProjectsCount')::numeric), 0)::integer,
    LEAST(100, GREATEST(0, COALESCE((payload->>'performanceScore')::double precision, 0))),
    COALESCE(payload->>'administrativeLevel', 'COUNTY'),
    COALESCE(payload->>'province', ''), payload->>'county',
    COALESCE(payload->>'description', '')
  FROM legacy_departments
  ON CONFLICT (id) DO NOTHING;
END IF;
END $$;

-- -------------------------------------------------------------- budget_sources
DO $$
BEGIN
IF to_regclass('public.legacy_budget_sources') IS NOT NULL THEN
  INSERT INTO budget_sources (id, title, code, source_type, source_type_fa,
    total_amount_toman, allocated_amount_toman, remaining_amount_toman, fiscal_year,
    sponsor_organization, target_scope, restriction_note, status, province, county)
  SELECT id,
    COALESCE(payload->>'title', ''), COALESCE(payload->>'code', ''),
    COALESCE(payload->>'sourceType', 'CSR'), COALESCE(payload->>'sourceTypeFa', ''),
    COALESCE(trunc((payload->>'totalAmountToman')::numeric), 0)::bigint,
    COALESCE(trunc((payload->>'allocatedAmountToman')::numeric), 0)::bigint,
    COALESCE(trunc((payload->>'remainingAmountToman')::numeric), 0)::bigint,
    COALESCE(payload->>'fiscalYear', ''),
    COALESCE(payload->>'sponsorOrganization', ''), COALESCE(payload->>'targetScope', ''),
    payload->>'restrictionNote', COALESCE(payload->>'status', 'ACTIVE'),
    payload->>'province', payload->>'county'
  FROM legacy_budget_sources
  ON CONFLICT (id) DO NOTHING;
END IF;
END $$;

-- ---------------------------------------------------------------- crises_harms
DO $$
BEGIN
IF to_regclass('public.legacy_crises_harms') IS NOT NULL THEN
  INSERT INTO crises_harms (id, title, code, category, level, province, county,
    district_or_village, severity_score, urgency, affected_population, primary_cause,
    recommended_intervention, status, active_projects_count, deficit_index_fa)
  SELECT id,
    COALESCE(payload->>'title', ''), COALESCE(payload->>'code', ''),
    COALESCE(payload->>'category', ''), COALESCE(payload->>'level', 'COUNTY'),
    COALESCE(payload->>'province', ''), COALESCE(payload->>'county', ''),
    COALESCE(payload->>'districtOrVillage', ''),
    LEAST(100, GREATEST(0, COALESCE((payload->>'severityScore')::double precision, 0))),
    COALESCE(payload->>'urgency', 'MEDIUM'),
    COALESCE(trunc((payload->>'affectedPopulation')::numeric), 0)::bigint,
    COALESCE(payload->>'primaryCause', ''), COALESCE(payload->>'recommendedIntervention', ''),
    COALESCE(payload->>'status', 'UNRESOLVED'),
    COALESCE(trunc((payload->>'activeProjectsCount')::numeric), 0)::integer,
    COALESCE(payload->>'deficitIndexFa', '')
  FROM legacy_crises_harms
  ON CONFLICT (id) DO NOTHING;
END IF;
END $$;

-- ------------------------------------------------------------------ priorities
DO $$
BEGIN
IF to_regclass('public.legacy_priorities') IS NOT NULL THEN
  INSERT INTO priorities (id, code, title, description, category, default_percentage,
    current_percentage, recommended_percentage, is_locked, is_active,
    related_indicators, icon_name, weight_factor, min_percent, max_percent, sub_items)
  SELECT id,
    GREATEST(1, COALESCE(trunc((payload->>'code')::numeric), 1)::integer),
    COALESCE(payload->>'title', ''), COALESCE(payload->>'description', ''),
    COALESCE(payload->>'category', ''),
    LEAST(100, GREATEST(0, COALESCE((payload->>'defaultPercentage')::double precision, 0))),
    LEAST(100, GREATEST(0, COALESCE((payload->>'currentPercentage')::double precision, 0))),
    (CASE WHEN payload ? 'recommendedPercentage' THEN
      LEAST(100, GREATEST(0, (payload->>'recommendedPercentage')::double precision)) END),
    COALESCE((payload->'isLocked')::boolean, false),
    COALESCE((payload->'isActive')::boolean, true),
    COALESCE(ARRAY(
      SELECT jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(payload->'relatedIndicators') = 'array'
             THEN payload->'relatedIndicators' ELSE '[]'::jsonb END
      )), ARRAY[]::text[]),
    COALESCE(payload->>'iconName', ''),
    (payload->>'weightFactor')::double precision,
    (payload->>'minPercent')::double precision,
    (payload->>'maxPercent')::double precision,
    COALESCE(ARRAY(
      SELECT jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(payload->'subItems') = 'array'
             THEN payload->'subItems' ELSE '[]'::jsonb END
      )), ARRAY[]::text[])
  FROM legacy_priorities
  ON CONFLICT (id) DO NOTHING;
END IF;
END $$;

-- -------------------------------------------------------------------- executors
DO $$
BEGIN
IF to_regclass('public.legacy_executors') IS NOT NULL THEN
  INSERT INTO executors (id, name, code, type, type_fa, managing_director,
    contact_phone, active_projects_count, completed_projects_count, success_rate,
    capacity_status, coverage_region, province, county)
  SELECT id,
    COALESCE(payload->>'name', ''), COALESCE(payload->>'code', ''),
    COALESCE(payload->>'type', 'GOVERNMENTAL'), COALESCE(payload->>'typeFa', ''),
    COALESCE(payload->>'managingDirector', ''), COALESCE(payload->>'contactPhone', ''),
    COALESCE(trunc((payload->>'activeProjectsCount')::numeric), 0)::integer,
    COALESCE(trunc((payload->>'completedProjectsCount')::numeric), 0)::integer,
    LEAST(100, GREATEST(0, COALESCE((payload->>'successRate')::double precision, 0))),
    COALESCE(payload->>'capacityStatus', 'AVAILABLE'),
    COALESCE(payload->>'coverageRegion', ''),
    payload->>'province', payload->>'county'
  FROM legacy_executors
  ON CONFLICT (id) DO NOTHING;
END IF;
END $$;

-- ------------------------------------------------------------------ contractors
DO $$
BEGIN
IF to_regclass('public.legacy_contractors') IS NOT NULL THEN
  INSERT INTO contractors (id, company_name, ceo_name, national_id, grade, grade_fa,
    specialty_field, active_contracts_count, total_contract_value_toman,
    performance_score, satisfaction_rating, free_capacity_slots, phone, status,
    province, county)
  SELECT id,
    COALESCE(payload->>'companyName', ''), COALESCE(payload->>'ceoName', ''),
    COALESCE(payload->>'nationalId', ''), COALESCE(payload->>'grade', 'GRADE_5'),
    COALESCE(payload->>'gradeFa', ''), COALESCE(payload->>'specialtyField', ''),
    COALESCE(trunc((payload->>'activeContractsCount')::numeric), 0)::integer,
    COALESCE(trunc((payload->>'totalContractValueToman')::numeric), 0)::bigint,
    LEAST(100, GREATEST(0, COALESCE((payload->>'performanceScore')::double precision, 0))),
    LEAST(5, GREATEST(1, COALESCE((payload->>'satisfactionRating')::double precision, 3))),
    COALESCE(trunc((payload->>'freeCapacitySlots')::numeric), 0)::integer,
    COALESCE(payload->>'phone', ''),
    COALESCE(payload->>'status', 'UNDER_EVALUATION'),
    payload->>'province', payload->>'county'
  FROM legacy_contractors
  ON CONFLICT (id) DO NOTHING;
END IF;
END $$;

-- ----------------------------------------------------------------------- users
DO $$
BEGIN
IF to_regclass('public.legacy_users') IS NOT NULL THEN
  INSERT INTO users (id, name, role, role_fa, role_title_fa, avatar, organization,
    department_id, allowed_location_id, province, county)
  SELECT id,
    COALESCE(payload->>'name', ''), COALESCE(payload->>'role', 'AUDITOR'),
    COALESCE(payload->>'roleFa', ''), COALESCE(payload->>'roleTitleFa', ''),
    COALESCE(payload->>'avatar', ''), COALESCE(payload->>'organization', ''),
    (CASE WHEN payload->>'departmentId' IS NOT NULL
             AND EXISTS (SELECT 1 FROM departments d WHERE d.id = payload->>'departmentId')
       THEN payload->>'departmentId' END),
    (CASE WHEN payload->>'allowedLocationId' IS NOT NULL
             AND EXISTS (SELECT 1 FROM locations l WHERE l.id = payload->>'allowedLocationId')
       THEN payload->>'allowedLocationId' END),
    payload->>'province', payload->>'county'
  FROM legacy_users
  ON CONFLICT (id) DO NOTHING;
END IF;
END $$;

-- ------------------------------------------------------------ roles_permissions
DO $$
BEGIN
IF to_regclass('public.legacy_roles_permissions') IS NOT NULL THEN
  INSERT INTO roles_permissions (role, role_title_fa, description, can_view_dashboard,
    can_edit_departments, can_manage_budget, can_manage_crises, can_manage_priorities,
    can_create_project, can_approve_projects, can_manage_executors,
    can_manage_contractors, can_export_reports, can_audit_logs, scope_level)
  SELECT role,
    COALESCE(payload->>'roleTitleFa', ''), COALESCE(payload->>'description', ''),
    COALESCE((payload->'canViewDashboard')::boolean, true),
    COALESCE((payload->'canEditDepartments')::boolean, false),
    COALESCE((payload->'canManageBudget')::boolean, false),
    COALESCE((payload->'canManageCrises')::boolean, false),
    COALESCE((payload->'canManagePriorities')::boolean, false),
    COALESCE((payload->'canCreateProject')::boolean, false),
    COALESCE((payload->'canApproveProjects')::boolean, false),
    COALESCE((payload->'canManageExecutors')::boolean, false),
    COALESCE((payload->'canManageContractors')::boolean, false),
    COALESCE((payload->'canExportReports')::boolean, false),
    COALESCE((payload->'canAuditLogs')::boolean, false),
    COALESCE(payload->>'scopeLevel', 'NATIONAL')
  FROM legacy_roles_permissions
  ON CONFLICT (role) DO NOTHING;
END IF;
END $$;

-- --------------------------------------------------------------------- projects
-- FK columns copy the id ONLY when the referenced parent row exists,
-- otherwise the column stays NULL (a stale id in the document model).
DO $$
BEGIN
IF to_regclass('public.legacy_projects') IS NOT NULL THEN
  INSERT INTO projects (id, code, title, priority_id, department_id,
    requesting_department_id, is_multi_department, budget_source_id, executor_id,
    contractor_id, crisis_harm_id, created_by_user_id, administrative_level,
    province, county, district, target_area, estimated_cost_toman,
    current_year_allocated_toman, future_years_allocated_toman, csr_share_percentage,
    government_share_percentage, charity_share_percentage, dehyari_share_percentage,
    bank_facility_share_percentage, beneficiaries_count, cost_per_beneficiary_toman,
    target_beneficiary_groups, anti_overlap_status, overlap_warning_details,
    urgency_level, status, start_year, end_year, duration_months,
    progress_percentage, description)
  SELECT id,
    COALESCE(payload->>'code', ''), COALESCE(payload->>'title', ''),
    (CASE WHEN EXISTS (SELECT 1 FROM priorities pr WHERE pr.id = payload->>'priorityId')
       THEN payload->>'priorityId' END),
    (CASE WHEN EXISTS (SELECT 1 FROM departments d WHERE d.id = payload->>'departmentId')
       THEN payload->>'departmentId' END),
    (CASE WHEN EXISTS (SELECT 1 FROM departments d WHERE d.id = payload->>'requestingDepartmentId')
       THEN payload->>'requestingDepartmentId' END),
    COALESCE((payload->'isMultiDepartment')::boolean, false),
    (CASE WHEN EXISTS (SELECT 1 FROM budget_sources b WHERE b.id = payload->>'budgetSourceId')
       THEN payload->>'budgetSourceId' END),
    (CASE WHEN EXISTS (SELECT 1 FROM executors e WHERE e.id = payload->>'executorId')
       THEN payload->>'executorId' END),
    (CASE WHEN EXISTS (SELECT 1 FROM contractors c WHERE c.id = payload->>'contractorId')
       THEN payload->>'contractorId' END),
    (CASE WHEN EXISTS (SELECT 1 FROM crises_harms ch WHERE ch.id = payload->>'crisisHarmId')
       THEN payload->>'crisisHarmId' END),
    (CASE WHEN EXISTS (SELECT 1 FROM users u WHERE u.id = payload->>'createdByUserId')
       THEN payload->>'createdByUserId' END),
    COALESCE(payload->>'administrativeLevel', 'COUNTY'),
    COALESCE(payload->>'province', ''), COALESCE(payload->>'county', ''),
    COALESCE(payload->>'district', ''), COALESCE(payload->>'targetArea', ''),
    COALESCE(trunc((payload->>'estimatedCostToman')::numeric), 0)::bigint,
    trunc((payload->>'currentYearAllocatedToman')::numeric)::bigint,
    trunc((payload->>'futureYearsAllocatedToman')::numeric)::bigint,
    (payload->>'csrSharePercentage')::double precision,
    (payload->>'governmentSharePercentage')::double precision,
    (payload->>'charitySharePercentage')::double precision,
    (payload->>'dehyariSharePercentage')::double precision,
    (payload->>'bankFacilitySharePercentage')::double precision,
    COALESCE(trunc((payload->>'beneficiariesCount')::numeric), 0)::bigint,
    COALESCE(trunc((payload->>'costPerBeneficiaryToman')::numeric), 0)::bigint,
    COALESCE(ARRAY(
      SELECT jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(payload->'targetBeneficiaryGroups') = 'array'
             THEN payload->'targetBeneficiaryGroups' ELSE '[]'::jsonb END
      )), ARRAY[]::text[]),
    COALESCE(payload->>'antiOverlapStatus', 'UNPRIORITIZED'),
    payload->>'overlapWarningDetails',
    payload->>'urgencyLevel',
    COALESCE(payload->>'status', 'PROPOSED'),
    COALESCE(trunc((payload->>'startYear')::numeric), 0)::integer,
    GREATEST(COALESCE(trunc((payload->>'endYear')::numeric), 0)::integer,
             COALESCE(trunc((payload->>'startYear')::numeric), 0)::integer),
    GREATEST(0, COALESCE(trunc((payload->>'durationMonths')::numeric), 0)::integer),
    LEAST(100, GREATEST(0, COALESCE((payload->>'progressPercentage')::double precision, 0))),
    COALESCE(payload->>'description', '')
  FROM legacy_projects
  ON CONFLICT (id) DO NOTHING;
END IF;
END $$;

-- project_contributions: expand the junction array; skip rows whose
-- department was dropped (their shares are meaningless without a parent).
DO $$
BEGIN
IF to_regclass('public.legacy_projects') IS NOT NULL THEN
  INSERT INTO project_contributions (project_id, department_id, share_percentage,
    share_amount_toman, role_description)
  SELECT p.id,
    c->>'departmentId',
    LEAST(100, GREATEST(0, COALESCE((c->>'sharePercentage')::double precision, 0))),
    COALESCE(trunc((c->>'shareAmountToman')::numeric), 0)::bigint,
    c->>'roleDescription'
  FROM legacy_projects p,
       jsonb_array_elements(
         CASE WHEN jsonb_typeof(p.payload->'contributingDepartments') = 'array'
              THEN p.payload->'contributingDepartments' ELSE '[]'::jsonb END
       ) AS c
  WHERE EXISTS (SELECT 1 FROM departments d WHERE d.id = c->>'departmentId')
  ON CONFLICT (project_id, department_id) DO NOTHING;
END IF;
END $$;

-- ------------------------------------------------------------------ audit_logs
-- seq is carried over explicitly (OVERRIDING SYSTEM VALUE) so "newest
-- first" ordering survives the import; the identity sequence is reset.
DO $$
BEGIN
-- NOTE: Nest the empty-check INSIDE the existence check. Writing both on one
-- `IF ... AND ...` line makes PL/pgSQL plan `legacy_audit_logs` eagerly and
-- abort with 42P01 on a fresh database where the table never existed.
IF to_regclass('public.legacy_audit_logs') IS NOT NULL THEN
  IF EXISTS (SELECT 1 FROM legacy_audit_logs) THEN
  INSERT INTO audit_logs (id, seq, timestamp, user_name, user_role, action_type,
    target_priority_title, old_value, new_value, rationale, province, county)
  OVERRIDING SYSTEM VALUE
  SELECT id, seq,
    COALESCE(payload->>'timestamp', ''),
    COALESCE(payload->>'userName', ''),
    COALESCE(payload->>'userRole', 'AUDITOR'),
    COALESCE(payload->>'actionType', 'BUDGET_UPDATE'),
    payload->>'targetPriorityTitle', payload->>'oldValue', payload->>'newValue',
    payload->>'rationale', payload->>'province', payload->>'county'
  FROM legacy_audit_logs
  ORDER BY seq
  ON CONFLICT (id) DO UPDATE SET
    timestamp = EXCLUDED.timestamp, user_name = EXCLUDED.user_name,
    user_role = EXCLUDED.user_role, action_type = EXCLUDED.action_type,
    target_priority_title = EXCLUDED.target_priority_title,
    old_value = EXCLUDED.old_value, new_value = EXCLUDED.new_value,
    rationale = EXCLUDED.rationale, province = EXCLUDED.province,
    county = EXCLUDED.county;

  PERFORM setval(
    pg_get_serial_sequence('public.audit_logs', 'seq'),
    COALESCE((SELECT MAX(seq) FROM public.audit_logs), 0) + 1,
    false
  );
  END IF;
END IF;
END $$;

-- ------------------------------------------------------------- analysis_sources
DO $$
BEGIN
IF to_regclass('public.legacy_analysis_sources') IS NOT NULL THEN
  IF EXISTS (SELECT 1 FROM legacy_analysis_sources) THEN
  INSERT INTO analysis_sources (id, seq, title, summary, origin, kind, provider,
    source_url, published_at, linked_areas, reliability_score, status, reviewed_by,
    review_note, province, county, created_at)
  OVERRIDING SYSTEM VALUE
  SELECT id, seq,
    COALESCE(payload->>'title', ''), COALESCE(payload->>'summary', ''),
    COALESCE(payload->>'origin', 'HUMAN'), COALESCE(payload->>'kind', 'FIELD_REPORT'),
    COALESCE(payload->>'provider', ''), payload->>'sourceUrl',
    COALESCE(payload->>'publishedAt', ''),
    COALESCE(ARRAY(
      SELECT jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(payload->'linkedAreas') = 'array'
             THEN payload->'linkedAreas' ELSE '[]'::jsonb END
      )), ARRAY[]::text[]),
    LEAST(100, GREATEST(0, COALESCE((payload->>'reliabilityScore')::double precision, 50))),
    COALESCE(payload->>'status', 'PENDING'),
    payload->>'reviewedBy', payload->>'reviewNote',
    COALESCE(payload->>'province', ''), COALESCE(payload->>'county', ''),
    COALESCE(payload->>'createdAt', '')
  FROM legacy_analysis_sources
  ORDER BY seq
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, summary = EXCLUDED.summary, origin = EXCLUDED.origin,
    kind = EXCLUDED.kind, provider = EXCLUDED.provider, source_url = EXCLUDED.source_url,
    published_at = EXCLUDED.published_at, linked_areas = EXCLUDED.linked_areas,
    reliability_score = EXCLUDED.reliability_score, status = EXCLUDED.status,
    reviewed_by = EXCLUDED.reviewed_by, review_note = EXCLUDED.review_note,
    province = EXCLUDED.province, county = EXCLUDED.county,
    created_at = EXCLUDED.created_at;

  PERFORM setval(
    pg_get_serial_sequence('public.analysis_sources', 'seq'),
    COALESCE((SELECT MAX(seq) FROM public.analysis_sources), 0) + 1,
    false
  );
  END IF;
END IF;
END $$;

-- -------------------------------------------------------------------- app_meta
-- Copy forward the operator markers (harmless), then set the seed gate
-- only when the import actually found data — a half-initialized legacy
-- database with empty tables stays eligible for the fresh-database seed.
DO $$
DECLARE has_data boolean;
BEGIN
IF to_regclass('public.legacy_app_meta') IS NOT NULL THEN
  INSERT INTO app_meta (key, value)
  SELECT key, value FROM legacy_app_meta
  ON CONFLICT (key) DO NOTHING;
END IF;

SELECT (SELECT count(*) FROM projects) > 0
    OR (SELECT count(*) FROM departments) > 0
    OR (SELECT count(*) FROM locations) > 0
INTO has_data;

IF has_data THEN
  INSERT INTO app_meta (key, value) VALUES ('seeded', 'normalized-1')
  ON CONFLICT (key) DO UPDATE SET value = 'normalized-1';
END IF;
END $$;
