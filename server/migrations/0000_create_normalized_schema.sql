-- ─────────────────────────────────────────────────────────────────────────
-- Step 0 — VACATE the legacy document-model tables.
--
-- A database created by the pre-Drizzle version holds the SAME table names
-- with a completely different shape (`id text PK` + `payload jsonb`). Those
-- tables are renamed to `legacy_*` here, NOT dropped:
--   * the data migration in this journal (0001) reads the payloads from
--     here and normalizes them into the new relational tables;
--   * the operator keeps a rollback path (drop legacy_* only after the
--     cutover is verified — see server/db/README.md).
--
-- The accumulated indexes are dropped first on purpose: the same index
-- names are recreated below for the NEW tables, and a renamed table keeps
-- its index names, which would clash.
-- Both steps are wrapped in existence guards, so the very same migration
-- is idempotent on a FRESH database (nothing legacy → no rename, straight
-- to CREATE TABLE).
-- ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- All index names the legacy schema ever created (the two server indexes
  -- per table plus the optional `--hardening` set). A renamed table keeps
  -- its index names, and the same names are recreated below for the NEW
  -- tables — so every one of them is dropped up front.
  DROP INDEX IF EXISTS public.idx_projects_status;
  DROP INDEX IF EXISTS public.idx_projects_priority;
  DROP INDEX IF EXISTS public.idx_projects_department;
  DROP INDEX IF EXISTS public.idx_projects_payload_gin;
  DROP INDEX IF EXISTS public.idx_projects_county;
  DROP INDEX IF EXISTS public.idx_projects_anti_overlap;
  DROP INDEX IF EXISTS public.idx_locations_county;
  DROP INDEX IF EXISTS public.idx_crises_harms_county;
  DROP INDEX IF EXISTS public.idx_users_role;
  DROP INDEX IF EXISTS public.idx_audit_logs_created;
  DROP INDEX IF EXISTS public.idx_audit_logs_action;
  DROP INDEX IF EXISTS public.idx_analysis_sources_origin;
  DROP INDEX IF EXISTS public.idx_analysis_sources_status;
END $$;--> statement-breakpoint
DO $$
DECLARE
  tbl text;
  seq_name text;
BEGIN
  -- The legacy identity columns own sequences with the EXACT names the new
  -- tables' GENERATED ALWAYS AS IDENTITY columns request; free them first.
  FOREACH seq_name IN ARRAY ARRAY['audit_logs_seq_seq', 'analysis_sources_seq_seq'] LOOP
    IF to_regclass(format('public.%I', seq_name)) IS NOT NULL THEN
      EXECUTE format('ALTER SEQUENCE public.%I RENAME TO legacy_%s', seq_name, seq_name);
    END IF;
  END LOOP;

  FOREACH tbl IN ARRAY ARRAY[
    'analysis_sources', 'app_meta', 'audit_logs', 'budget_sources',
    'contractors', 'crises_harms', 'departments', 'executors',
    'locations', 'organization', 'priorities', 'projects',
    'roles_permissions', 'users'
  ] LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL
       AND to_regclass(format('public.legacy_%s', tbl)) IS NULL THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO legacy_%s', tbl, tbl);
    END IF;
  END LOOP;
END $$;--> statement-breakpoint

CREATE TABLE "analysis_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "analysis_sources_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"origin" text NOT NULL,
	"kind" text NOT NULL,
	"provider" text NOT NULL,
	"source_url" text,
	"published_at" text NOT NULL,
	"linked_areas" text[] DEFAULT '{}'::text[] NOT NULL,
	"reliability_score" double precision NOT NULL,
	"status" text NOT NULL,
	"reviewed_by" text,
	"review_note" text,
	"province" text NOT NULL,
	"county" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "analysis_sources_origin_check" CHECK ("analysis_sources"."origin" IN ('AI', 'HUMAN')),
	CONSTRAINT "analysis_sources_kind_check" CHECK ("analysis_sources"."kind" IN ('NEWS', 'OFFICIAL_STAT', 'FIELD_REPORT', 'SATELLITE', 'INTERVIEW', 'SOCIAL_MEDIA')),
	CONSTRAINT "analysis_sources_status_check" CHECK ("analysis_sources"."status" IN ('PENDING', 'APPROVED', 'REJECTED')),
	CONSTRAINT "analysis_sources_reliability_check" CHECK ("analysis_sources"."reliability_score" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "app_meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "audit_logs_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"timestamp" text NOT NULL,
	"user_name" text NOT NULL,
	"user_role" text NOT NULL,
	"action_type" text NOT NULL,
	"target_priority_title" text,
	"old_value" text,
	"new_value" text,
	"rationale" text,
	"province" text,
	"county" text
);
--> statement-breakpoint
CREATE TABLE "budget_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"code" text NOT NULL,
	"source_type" text NOT NULL,
	"source_type_fa" text NOT NULL,
	"total_amount_toman" bigint NOT NULL,
	"allocated_amount_toman" bigint NOT NULL,
	"remaining_amount_toman" bigint NOT NULL,
	"fiscal_year" text NOT NULL,
	"sponsor_organization" text NOT NULL,
	"target_scope" text NOT NULL,
	"restriction_note" text,
	"status" text NOT NULL,
	"province" text,
	"county" text,
	CONSTRAINT "budget_sources_type_check" CHECK ("budget_sources"."source_type" IN ('CSR', 'GOVERNMENT', 'DEHYARI_MUNICIPALITY', 'CHARITY_FOUNDATION', 'BANK_FACILITY', 'PUBLIC_PARTICIPATION')),
	CONSTRAINT "budget_sources_status_check" CHECK ("budget_sources"."status" IN ('ACTIVE', 'DEPLETED', 'RESERVED')),
	CONSTRAINT "budget_sources_amount_check" CHECK ("budget_sources"."total_amount_toman" >= 0 AND "budget_sources"."allocated_amount_toman" >= 0 AND "budget_sources"."remaining_amount_toman" >= 0)
);
--> statement-breakpoint
CREATE TABLE "contractors" (
	"id" text PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"ceo_name" text NOT NULL,
	"national_id" text NOT NULL,
	"grade" text NOT NULL,
	"grade_fa" text NOT NULL,
	"specialty_field" text NOT NULL,
	"active_contracts_count" integer NOT NULL,
	"total_contract_value_toman" bigint NOT NULL,
	"performance_score" double precision NOT NULL,
	"satisfaction_rating" double precision NOT NULL,
	"free_capacity_slots" integer NOT NULL,
	"phone" text NOT NULL,
	"status" text NOT NULL,
	"province" text,
	"county" text,
	CONSTRAINT "contractors_grade_check" CHECK ("contractors"."grade" IN ('GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'LOCAL_AUTHORIZED')),
	CONSTRAINT "contractors_status_check" CHECK ("contractors"."status" IN ('VERIFIED', 'UNDER_EVALUATION', 'SUSPENDED')),
	CONSTRAINT "contractors_score_check" CHECK ("contractors"."performance_score" BETWEEN 0 AND 100),
	CONSTRAINT "contractors_rating_check" CHECK ("contractors"."satisfaction_rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "crises_harms" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"code" text NOT NULL,
	"category" text NOT NULL,
	"level" text NOT NULL,
	"province" text NOT NULL,
	"county" text NOT NULL,
	"district_or_village" text NOT NULL,
	"severity_score" double precision NOT NULL,
	"urgency" text NOT NULL,
	"affected_population" bigint NOT NULL,
	"primary_cause" text NOT NULL,
	"recommended_intervention" text NOT NULL,
	"status" text NOT NULL,
	"active_projects_count" integer NOT NULL,
	"deficit_index_fa" text NOT NULL,
	CONSTRAINT "crises_harms_level_check" CHECK ("crises_harms"."level" IN ('NATIONAL', 'PROVINCIAL', 'COUNTY', 'RURAL_DISTRICT')),
	CONSTRAINT "crises_harms_urgency_check" CHECK ("crises_harms"."urgency" IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
	CONSTRAINT "crises_harms_status_check" CHECK ("crises_harms"."status" IN ('UNRESOLVED', 'UNDER_INTERVENTION', 'CONTROLLED')),
	CONSTRAINT "crises_harms_severity_check" CHECK ("crises_harms"."severity_score" BETWEEN 0 AND 100),
	CONSTRAINT "crises_harms_population_check" CHECK ("crises_harms"."affected_population" >= 0)
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"category" text NOT NULL,
	"category_fa" text NOT NULL,
	"head_person_name" text NOT NULL,
	"contact_number" text NOT NULL,
	"email" text,
	"logo_data_url" text,
	"allocated_budget_toman" bigint NOT NULL,
	"absorbed_budget_toman" bigint NOT NULL,
	"active_projects_count" integer NOT NULL,
	"performance_score" double precision NOT NULL,
	"administrative_level" text NOT NULL,
	"province" text NOT NULL,
	"county" text,
	"description" text NOT NULL,
	CONSTRAINT "departments_category_check" CHECK ("departments"."category" IN ('INFRASTRUCTURE', 'HEALTH', 'EDUCATION', 'SOCIAL_WELFARE', 'AGRICULTURE', 'ENVIRONMENT', 'MUNICIPAL_RURAL')),
	CONSTRAINT "departments_level_check" CHECK ("departments"."administrative_level" IN ('NATIONAL', 'PROVINCIAL', 'COUNTY', 'RURAL_DISTRICT')),
	CONSTRAINT "departments_score_check" CHECK ("departments"."performance_score" BETWEEN 0 AND 100),
	CONSTRAINT "departments_budget_non_negative_check" CHECK ("departments"."allocated_budget_toman" >= 0 AND "departments"."absorbed_budget_toman" >= 0)
);
--> statement-breakpoint
CREATE TABLE "executors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"type_fa" text NOT NULL,
	"managing_director" text NOT NULL,
	"contact_phone" text NOT NULL,
	"active_projects_count" integer NOT NULL,
	"completed_projects_count" integer NOT NULL,
	"success_rate" double precision NOT NULL,
	"capacity_status" text NOT NULL,
	"coverage_region" text NOT NULL,
	"province" text,
	"county" text,
	CONSTRAINT "executors_type_check" CHECK ("executors"."type" IN ('GOVERNMENTAL', 'JIHADI_FOUNDATION', 'PUBLIC_COMMUNITY', 'NGO', 'COOPERATIVE', 'PRIVATE')),
	CONSTRAINT "executors_capacity_check" CHECK ("executors"."capacity_status" IN ('AVAILABLE', 'OPTIMAL', 'OVERLOADED')),
	CONSTRAINT "executors_success_rate_check" CHECK ("executors"."success_rate" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "location_indicators" (
	"location_id" text PRIMARY KEY NOT NULL,
	"poverty_rate" double precision NOT NULL,
	"marginalization_rate" double precision NOT NULL,
	"unemployment_rate" double precision NOT NULL,
	"social_harms_index" double precision NOT NULL,
	"vulnerable_groups_population" bigint NOT NULL,
	"infrastructure_deficit" double precision NOT NULL,
	"crisis_vulnerability_score" double precision NOT NULL,
	"health_access_deficit" double precision NOT NULL,
	"education_drop_out_rate" double precision NOT NULL,
	"cultural_deficit_score" double precision NOT NULL,
	"environmental_risk_score" double precision NOT NULL,
	CONSTRAINT "location_indicators_score_check" CHECK (("location_indicators"."poverty_rate" BETWEEN 0 AND 100)
      AND ("location_indicators"."marginalization_rate" BETWEEN 0 AND 100)
      AND ("location_indicators"."unemployment_rate" BETWEEN 0 AND 100)
      AND ("location_indicators"."social_harms_index" BETWEEN 0 AND 100)
      AND ("location_indicators"."infrastructure_deficit" BETWEEN 0 AND 100)
      AND ("location_indicators"."crisis_vulnerability_score" BETWEEN 0 AND 100)
      AND ("location_indicators"."health_access_deficit" BETWEEN 0 AND 100)
      AND ("location_indicators"."education_drop_out_rate" BETWEEN 0 AND 100)
      AND ("location_indicators"."cultural_deficit_score" BETWEEN 0 AND 100)
      AND ("location_indicators"."environmental_risk_score" BETWEEN 0 AND 100)),
	CONSTRAINT "location_indicators_population_check" CHECK ("location_indicators"."vulnerable_groups_population" >= 0)
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"province" text NOT NULL,
	"county" text NOT NULL,
	"city" text NOT NULL,
	"district" text NOT NULL,
	"population" bigint NOT NULL,
	"coordinates_lat" double precision,
	"coordinates_lng" double precision,
	CONSTRAINT "locations_level_check" CHECK ("locations"."level" IN ('NATIONAL', 'PROVINCIAL', 'COUNTY', 'RURAL_DISTRICT')),
	CONSTRAINT "locations_population_check" CHECK ("locations"."population" >= 0)
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"org_type" text NOT NULL,
	"activity_sector" text NOT NULL,
	"national_code" text,
	"province" text NOT NULL,
	"city" text NOT NULL,
	"county" text NOT NULL,
	"district" text NOT NULL,
	"total_budget" bigint NOT NULL,
	"currency_unit" text NOT NULL,
	"budget_period" text NOT NULL,
	"fiscal_year" text NOT NULL,
	"description" text,
	"updated_at" text NOT NULL,
	CONSTRAINT "organization_org_type_check" CHECK ("organization"."org_type" IN ('GOVERNMENT', 'PUBLIC', 'PRIVATE', 'SEMI_PRIVATE', 'COOPERATIVE')),
	CONSTRAINT "organization_currency_check" CHECK ("organization"."currency_unit" IN ('TOMAN', 'RIAL')),
	CONSTRAINT "organization_budget_period_check" CHECK ("organization"."budget_period" IN ('1_YEAR', '3_YEARS', '5_YEARS'))
);
--> statement-breakpoint
CREATE TABLE "priorities" (
	"id" text PRIMARY KEY NOT NULL,
	"code" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"default_percentage" double precision NOT NULL,
	"current_percentage" double precision NOT NULL,
	"recommended_percentage" double precision,
	"is_locked" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"related_indicators" text[] DEFAULT '{}'::text[] NOT NULL,
	"icon_name" text NOT NULL,
	"weight_factor" double precision,
	"min_percent" double precision,
	"max_percent" double precision,
	"sub_items" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "priorities_code_unique" UNIQUE("code"),
	CONSTRAINT "priorities_code_check" CHECK ("priorities"."code" >= 1),
	CONSTRAINT "priorities_default_percentage_check" CHECK ("priorities"."default_percentage" BETWEEN 0 AND 100),
	CONSTRAINT "priorities_current_percentage_check" CHECK ("priorities"."current_percentage" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "project_contributions" (
	"project_id" text NOT NULL,
	"department_id" text NOT NULL,
	"share_percentage" double precision NOT NULL,
	"share_amount_toman" bigint NOT NULL,
	"role_description" text,
	CONSTRAINT "project_contributions_project_id_department_id_pk" PRIMARY KEY("project_id","department_id"),
	CONSTRAINT "project_contributions_share_check" CHECK ("project_contributions"."share_percentage" BETWEEN 0 AND 100),
	CONSTRAINT "project_contributions_amount_check" CHECK ("project_contributions"."share_amount_toman" >= 0)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"priority_id" text,
	"department_id" text,
	"requesting_department_id" text,
	"budget_source_id" text,
	"executor_id" text,
	"contractor_id" text,
	"crisis_harm_id" text,
	"created_by_user_id" text,
	"is_multi_department" boolean DEFAULT false NOT NULL,
	"administrative_level" text NOT NULL,
	"province" text NOT NULL,
	"county" text NOT NULL,
	"district" text NOT NULL,
	"target_area" text NOT NULL,
	"estimated_cost_toman" bigint NOT NULL,
	"current_year_allocated_toman" bigint,
	"future_years_allocated_toman" bigint,
	"csr_share_percentage" double precision,
	"government_share_percentage" double precision,
	"charity_share_percentage" double precision,
	"dehyari_share_percentage" double precision,
	"bank_facility_share_percentage" double precision,
	"beneficiaries_count" bigint NOT NULL,
	"cost_per_beneficiary_toman" bigint NOT NULL,
	"target_beneficiary_groups" text[] DEFAULT '{}'::text[] NOT NULL,
	"anti_overlap_status" text NOT NULL,
	"overlap_warning_details" text,
	"urgency_level" text,
	"status" text NOT NULL,
	"start_year" integer NOT NULL,
	"end_year" integer NOT NULL,
	"duration_months" integer NOT NULL,
	"progress_percentage" double precision NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "projects_status_check" CHECK ("projects"."status" IN ('PROPOSED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED')),
	CONSTRAINT "projects_level_check" CHECK ("projects"."administrative_level" IN ('NATIONAL', 'PROVINCIAL', 'COUNTY', 'RURAL_DISTRICT')),
	CONSTRAINT "projects_anti_overlap_check" CHECK ("projects"."anti_overlap_status" IN ('CLEAR', 'POTENTIAL_DUPLICATE', 'INEFFICIENT_PER_CAPITA', 'UNPRIORITIZED')),
	CONSTRAINT "projects_urgency_check" CHECK ("projects"."urgency_level" IS NULL OR "projects"."urgency_level" IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
	CONSTRAINT "projects_progress_check" CHECK ("projects"."progress_percentage" BETWEEN 0 AND 100),
	CONSTRAINT "projects_years_check" CHECK ("projects"."start_year" <= "projects"."end_year"),
	CONSTRAINT "projects_shares_check" CHECK (("projects"."csr_share_percentage" IS NULL OR "projects"."csr_share_percentage" BETWEEN 0 AND 100)
      AND ("projects"."government_share_percentage" IS NULL OR "projects"."government_share_percentage" BETWEEN 0 AND 100)
      AND ("projects"."charity_share_percentage" IS NULL OR "projects"."charity_share_percentage" BETWEEN 0 AND 100)
      AND ("projects"."dehyari_share_percentage" IS NULL OR "projects"."dehyari_share_percentage" BETWEEN 0 AND 100)
      AND ("projects"."bank_facility_share_percentage" IS NULL OR "projects"."bank_facility_share_percentage" BETWEEN 0 AND 100)),
	CONSTRAINT "projects_cost_check" CHECK ("projects"."estimated_cost_toman" >= 0 AND "projects"."cost_per_beneficiary_toman" >= 0)
);
--> statement-breakpoint
CREATE TABLE "roles_permissions" (
	"role" text PRIMARY KEY NOT NULL,
	"role_title_fa" text NOT NULL,
	"description" text NOT NULL,
	"can_view_dashboard" boolean DEFAULT true NOT NULL,
	"can_edit_departments" boolean DEFAULT false NOT NULL,
	"can_manage_budget" boolean DEFAULT false NOT NULL,
	"can_manage_crises" boolean DEFAULT false NOT NULL,
	"can_manage_priorities" boolean DEFAULT false NOT NULL,
	"can_create_project" boolean DEFAULT false NOT NULL,
	"can_approve_projects" boolean DEFAULT false NOT NULL,
	"can_manage_executors" boolean DEFAULT false NOT NULL,
	"can_manage_contractors" boolean DEFAULT false NOT NULL,
	"can_export_reports" boolean DEFAULT false NOT NULL,
	"can_audit_logs" boolean DEFAULT false NOT NULL,
	"scope_level" text NOT NULL,
	CONSTRAINT "roles_permissions_role_check" CHECK ("roles_permissions"."role" IN ('ADMIN', 'PROVINCIAL_GOVERNOR', 'DEPARTMENT_HEAD', 'OFFICE_HEAD', 'REGIONAL_MANAGER', 'PLANNING_SPECIALIST', 'AUDITOR', 'DEHYAR_COUNCIL')),
	CONSTRAINT "roles_permissions_scope_check" CHECK ("roles_permissions"."scope_level" IN ('NATIONAL', 'PROVINCIAL', 'COUNTY', 'RURAL_DISTRICT'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"role_fa" text NOT NULL,
	"role_title_fa" text NOT NULL,
	"avatar" text NOT NULL,
	"organization" text NOT NULL,
	"department_id" text,
	"allowed_location_id" text,
	"province" text,
	"county" text,
	CONSTRAINT "users_role_check" CHECK ("users"."role" IN ('ADMIN', 'PROVINCIAL_GOVERNOR', 'DEPARTMENT_HEAD', 'OFFICE_HEAD', 'REGIONAL_MANAGER', 'PLANNING_SPECIALIST', 'AUDITOR', 'DEHYAR_COUNCIL'))
);
--> statement-breakpoint
ALTER TABLE "location_indicators" ADD CONSTRAINT "location_indicators_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_contributions" ADD CONSTRAINT "project_contributions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_contributions" ADD CONSTRAINT "project_contributions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_priority_id_priorities_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."priorities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_requesting_department_id_departments_id_fk" FOREIGN KEY ("requesting_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_budget_source_id_budget_sources_id_fk" FOREIGN KEY ("budget_source_id") REFERENCES "public"."budget_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_executor_id_executors_id_fk" FOREIGN KEY ("executor_id") REFERENCES "public"."executors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_crisis_harm_id_crises_harms_id_fk" FOREIGN KEY ("crisis_harm_id") REFERENCES "public"."crises_harms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_allowed_location_id_locations_id_fk" FOREIGN KEY ("allowed_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_analysis_sources_origin" ON "analysis_sources" USING btree ("origin");--> statement-breakpoint
CREATE INDEX "idx_analysis_sources_status" ON "analysis_sources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_seq" ON "audit_logs" USING btree ("seq");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "idx_crises_harms_county" ON "crises_harms" USING btree ("county");--> statement-breakpoint
CREATE INDEX "idx_crises_harms_status" ON "crises_harms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_locations_county" ON "locations" USING btree ("county");--> statement-breakpoint
CREATE INDEX "idx_locations_province_county" ON "locations" USING btree ("province","county");--> statement-breakpoint
CREATE INDEX "idx_projects_status" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_projects_priority" ON "projects" USING btree ("priority_id");--> statement-breakpoint
CREATE INDEX "idx_projects_department" ON "projects" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_projects_province_county" ON "projects" USING btree ("province","county");--> statement-breakpoint
CREATE INDEX "idx_projects_executor" ON "projects" USING btree ("executor_id");--> statement-breakpoint
CREATE INDEX "idx_projects_contractor" ON "projects" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");