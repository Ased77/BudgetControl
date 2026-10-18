/* =========================================================================
   Drizzle schema — the normalized relational model.

   This replaces the document model (`indexed scalar column` + `jsonb
   payload`) that the SQLite→PostgreSQL port preserved. Normalization was
   chosen deliberately, so the rules used here are worth stating:

   1. Every field of the frontend types (src/types.ts) becomes a real,
      typed column — money in `bigint`, percentages/scores in
      `double precision`, string lists in native `text[]`. Nothing JSON-
      encoded that a query could want to filter, sort or aggregate on.
   2. Relationships are real FOREIGN KEYs with NO ACTION (the PG default,
      i.e. RESTRICT for deletes). Referential integrity is now enforced:
      deleting a department that still owns projects fails with a mapped
      ReferentialViolation (HTTP 409) instead of silently leaving stale
      ids behind, as the document model did.
   3. Denormalized display names carried inside the old payloads
      (project.departmentName, project.priorityTitle, ...) are dropped
      from storage and re-derived with joins at read time — one source of
      truth left, no drift possible.
   4. `text`/`double precision` + CHECK constraints are used for the
      enumerated domains instead of native ENUM types: a new enum member
      then costs one `ALTER TABLE ... DROP CONSTRAINT` + re-add instead of
      a locked-in pg_enum type. Doc comments carry the allowed values and
      CHECKs enforce them.
   5. Timestamps stay `text`. They are Persian display strings
      («۱۴۰۴/۰۵/۱۲») produced by the UI, not sortable instants; changing
      their type would change what the API returns.
   6. The `seq bigint GENERATED ALWAYS AS IDENTITY` columns of audit_logs
      and analysis_sources replace SQLite's rowid for insertion order.
      Upserts never write seq, so "newest first" ordering stays stable.
      Gaps from failed upserts are tolerated (an identity value is spent
      even when the INSERT conflicts).
   ========================================================================= */

import {
  bigint,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/* Column names are derived automatically from the property names by the
   `casing: 'snake_case'` config (see drizzle.config.ts and client.ts), so no
   per-column string needed. CHECK/INDEX SQL below references those derived
   (snake_case) names explicitly. */

/* =========================================================================
   app_meta — internal markers: seed gates for the server's `initialize` step.
   (Migration history itself lives in drizzle.__drizzle_migrations.)
   ========================================================================= */
export const appMeta = pgTable('app_meta', {
  key: text().primaryKey(),
  value: text().notNull(),
});

/* =========================================================================
   locations — provinces / counties / districts / villages.
   ========================================================================= */
/**
 * `level`: NATIONAL | PROVINCIAL | COUNTY | RURAL_DISTRICT
 */
export const locations = pgTable('locations', {
  id: text().primaryKey(),
  level: text().notNull(),
  province: text().notNull(),
  county: text().notNull(),
  city: text().notNull(),
  district: text().notNull(),
  /** Total population; bigint because level=NATIONAL rows hold the whole country. */
  population: bigint({ mode: 'number' }).notNull(),
  coordinatesLat: doublePrecision(),
  coordinatesLng: doublePrecision(),
}, (t) => [
  check('locations_level_check', sql`${t.level} IN ('NATIONAL', 'PROVINCIAL', 'COUNTY', 'RURAL_DISTRICT')`),
  check('locations_population_check', sql`${t.population} >= 0`),
  index('idx_locations_county').on(t.county),
  index('idx_locations_province_county').on(t.province, t.county),
]);

/**
 * The deprivation indices (src/types.ts LocalIndicators) as a strict
 * one-to-one table: exactly one indicator row per location, owned by it.
 * Keeping them here (instead of 11 extra columns) keeps the location table
 * flat for the very common "no indicators needed" code path, and models the
 * one-to-one case of the layer explicitly.
 */
export const locationIndicators = pgTable('location_indicators', {
  locationId: text().primaryKey().references(() => locations.id, { onDelete: 'cascade' }),
  povertyRate: doublePrecision().notNull(),
  marginalizationRate: doublePrecision().notNull(),
  unemploymentRate: doublePrecision().notNull(),
  socialHarmsIndex: doublePrecision().notNull(),
  vulnerableGroupsPopulation: bigint({ mode: 'number' }).notNull(),
  infrastructureDeficit: doublePrecision().notNull(),
  crisisVulnerabilityScore: doublePrecision().notNull(),
  healthAccessDeficit: doublePrecision().notNull(),
  educationDropOutRate: doublePrecision().notNull(),
  culturalDeficitScore: doublePrecision().notNull(),
  environmentalRiskScore: doublePrecision().notNull(),
}, (t) => [
  check('location_indicators_score_check', sql`(${t.povertyRate} BETWEEN 0 AND 100)
      AND (${t.marginalizationRate} BETWEEN 0 AND 100)
      AND (${t.unemploymentRate} BETWEEN 0 AND 100)
      AND (${t.socialHarmsIndex} BETWEEN 0 AND 100)
      AND (${t.infrastructureDeficit} BETWEEN 0 AND 100)
      AND (${t.crisisVulnerabilityScore} BETWEEN 0 AND 100)
      AND (${t.healthAccessDeficit} BETWEEN 0 AND 100)
      AND (${t.educationDropOutRate} BETWEEN 0 AND 100)
      AND (${t.culturalDeficitScore} BETWEEN 0 AND 100)
      AND (${t.environmentalRiskScore} BETWEEN 0 AND 100)`),
  check('location_indicators_population_check', sql`${t.vulnerableGroupsPopulation} >= 0`),
]);

/* =========================================================================
   organization — single-document table (profile + total budget).
   `org_type`:      GOVERNMENT | PUBLIC | PRIVATE | SEMI_PRIVATE | COOPERATIVE
   `currency_unit`: TOMAN | RIAL
   `budget_period`: 1_YEAR | 3_YEARS | 5_YEARS
   ========================================================================= */
export const organization = pgTable('organization', {
  id: text().primaryKey(),
  name: text().notNull(),
  orgType: text().notNull(),
  activitySector: text().notNull(),
  nationalCode: text(),
  province: text().notNull(),
  city: text().notNull(),
  county: text().notNull(),
  district: text().notNull(),
  /** Total budget in Toman (bigint: multi-billion values, exact integer). */
  totalBudget: bigint({ mode: 'number' }).notNull(),
  currencyUnit: text().notNull(),
  budgetPeriod: text().notNull(),
  /** Persian fiscal year label, e.g. «۱۴۰۴» — display string, not an int. */
  fiscalYear: text().notNull(),
  description: text(),
  updatedAt: text().notNull(),
}, (t) => [
  check('organization_org_type_check', sql`${t.orgType} IN ('GOVERNMENT', 'PUBLIC', 'PRIVATE', 'SEMI_PRIVATE', 'COOPERATIVE')`),
  check('organization_currency_check', sql`${t.currencyUnit} IN ('TOMAN', 'RIAL')`),
  check('organization_budget_period_check', sql`${t.budgetPeriod} IN ('1_YEAR', '3_YEARS', '5_YEARS')`),
]);

/* =========================================================================
   departments — the agencies that own and contribute to projects.
   `category`:              INFRASTRUCTURE | HEALTH | EDUCATION | SOCIAL_WELFARE |
                            AGRICULTURE | ENVIRONMENT | MUNICIPAL_RURAL
   `administrative_level`:  NATIONAL | PROVINCIAL | COUNTY | RURAL_DISTRICT
   ========================================================================= */
export const departments = pgTable('departments', {
  id: text().primaryKey(),
  name: text().notNull(),
  code: text().notNull(),
  category: text().notNull(),
  categoryFa: text().notNull(),
  headPersonName: text().notNull(),
  contactNumber: text().notNull(),
  email: text(),
  /** Downscaled data-URL logo; text is unbounded on purpose. */
  logoDataUrl: text(),
  allocatedBudgetToman: bigint({ mode: 'number' }).notNull(),
  absorbedBudgetToman: bigint({ mode: 'number' }).notNull(),
  activeProjectsCount: integer().notNull(),
  /** 0–100 */
  performanceScore: doublePrecision().notNull(),
  administrativeLevel: text().notNull(),
  province: text().notNull(),
  county: text(),
  description: text().notNull(),
}, (t) => [
  check('departments_category_check', sql`${t.category} IN ('INFRASTRUCTURE', 'HEALTH', 'EDUCATION', 'SOCIAL_WELFARE', 'AGRICULTURE', 'ENVIRONMENT', 'MUNICIPAL_RURAL')`),
  check('departments_level_check', sql`${t.administrativeLevel} IN ('NATIONAL', 'PROVINCIAL', 'COUNTY', 'RURAL_DISTRICT')`),
  check('departments_score_check', sql`${t.performanceScore} BETWEEN 0 AND 100`),
  check('departments_budget_non_negative_check', sql`${t.allocatedBudgetToman} >= 0 AND ${t.absorbedBudgetToman} >= 0`),
]);

/* =========================================================================
   budget_sources — multiple funding streams.
   `source_type`: CSR | GOVERNMENT | DEHYARI_MUNICIPALITY | CHARITY_FOUNDATION |
                  BANK_FACILITY | PUBLIC_PARTICIPATION
   `status`:      ACTIVE | DEPLETED | RESERVED
   ========================================================================= */
export const budgetSources = pgTable('budget_sources', {
  id: text().primaryKey(),
  title: text().notNull(),
  code: text().notNull(),
  sourceType: text().notNull(),
  sourceTypeFa: text().notNull(),
  totalAmountToman: bigint({ mode: 'number' }).notNull(),
  allocatedAmountToman: bigint({ mode: 'number' }).notNull(),
  remainingAmountToman: bigint({ mode: 'number' }).notNull(),
  fiscalYear: text().notNull(),
  sponsorOrganization: text().notNull(),
  targetScope: text().notNull(),
  restrictionNote: text(),
  status: text().notNull(),
  province: text(),
  county: text(),
}, (t) => [
  check('budget_sources_type_check', sql`${t.sourceType} IN ('CSR', 'GOVERNMENT', 'DEHYARI_MUNICIPALITY', 'CHARITY_FOUNDATION', 'BANK_FACILITY', 'PUBLIC_PARTICIPATION')`),
  check('budget_sources_status_check', sql`${t.status} IN ('ACTIVE', 'DEPLETED', 'RESERVED')`),
  check('budget_sources_amount_check', sql`${t.totalAmountToman} >= 0 AND ${t.allocatedAmountToman} >= 0 AND ${t.remainingAmountToman} >= 0`),
]);

/* =========================================================================
   crises_harms — harms, crises and local needs that projects respond to.
   `level`:   NATIONAL | PROVINCIAL | COUNTY | RURAL_DISTRICT
   `urgency`: CRITICAL | HIGH | MEDIUM | LOW
   `status`:  UNRESOLVED | UNDER_INTERVENTION | CONTROLLED
   ========================================================================= */
export const crisesHarms = pgTable('crises_harms', {
  id: text().primaryKey(),
  title: text().notNull(),
  code: text().notNull(),
  category: text().notNull(),
  level: text().notNull(),
  province: text().notNull(),
  county: text().notNull(),
  districtOrVillage: text().notNull(),
  /** 0–100 */
  severityScore: doublePrecision().notNull(),
  urgency: text().notNull(),
  affectedPopulation: bigint({ mode: 'number' }).notNull(),
  primaryCause: text().notNull(),
  recommendedIntervention: text().notNull(),
  status: text().notNull(),
  activeProjectsCount: integer().notNull(),
  /** Persian indicator label, e.g. «بحران حاد تنش آبی». */
  deficitIndexFa: text().notNull(),
}, (t) => [
  check('crises_harms_level_check', sql`${t.level} IN ('NATIONAL', 'PROVINCIAL', 'COUNTY', 'RURAL_DISTRICT')`),
  check('crises_harms_urgency_check', sql`${t.urgency} IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')`),
  check('crises_harms_status_check', sql`${t.status} IN ('UNRESOLVED', 'UNDER_INTERVENTION', 'CONTROLLED')`),
  check('crises_harms_severity_check', sql`${t.severityScore} BETWEEN 0 AND 100`),
  check('crises_harms_population_check', sql`${t.affectedPopulation} >= 0`),
  index('idx_crises_harms_county').on(t.county),
  index('idx_crises_harms_status').on(t.status),
]);

/* =========================================================================
   priorities — the CSR budget axes and their allocation matrix.
   ========================================================================= */
export const priorities = pgTable('priorities', {
  id: text().primaryKey(),
  /** Integer axis number used for sorting (p1..p11 → 1..11). */
  code: integer().notNull().unique(),
  title: text().notNull(),
  description: text().notNull(),
  category: text().notNull(),
  defaultPercentage: doublePrecision().notNull(),
  currentPercentage: doublePrecision().notNull(),
  recommendedPercentage: doublePrecision(),
  isLocked: boolean().notNull().default(false),
  isActive: boolean().notNull().default(true),
  relatedIndicators: text().array().notNull().default(sql`'{}'::text[]`),
  iconName: text().notNull(),
  weightFactor: doublePrecision(),
  minPercent: doublePrecision(),
  maxPercent: doublePrecision(),
  subItems: text().array().notNull().default(sql`'{}'::text[]`),
}, (t) => [
  check('priorities_code_check', sql`${t.code} >= 1`),
  check('priorities_default_percentage_check', sql`${t.defaultPercentage} BETWEEN 0 AND 100`),
  check('priorities_current_percentage_check', sql`${t.currentPercentage} BETWEEN 0 AND 100`),
]);

/* =========================================================================
   executors — the entities that implement projects.
   `type`:            GOVERNMENTAL | JIHADI_FOUNDATION | PUBLIC_COMMUNITY |
                      NGO | COOPERATIVE | PRIVATE
   `capacity_status`: AVAILABLE | OPTIMAL | OVERLOADED
   ========================================================================= */
export const executors = pgTable('executors', {
  id: text().primaryKey(),
  name: text().notNull(),
  code: text().notNull(),
  type: text().notNull(),
  typeFa: text().notNull(),
  managingDirector: text().notNull(),
  contactPhone: text().notNull(),
  activeProjectsCount: integer().notNull(),
  completedProjectsCount: integer().notNull(),
  /** 0–100 */
  successRate: doublePrecision().notNull(),
  capacityStatus: text().notNull(),
  coverageRegion: text().notNull(),
  province: text(),
  county: text(),
}, (t) => [
  check('executors_type_check', sql`${t.type} IN ('GOVERNMENTAL', 'JIHADI_FOUNDATION', 'PUBLIC_COMMUNITY', 'NGO', 'COOPERATIVE', 'PRIVATE')`),
  check('executors_capacity_check', sql`${t.capacityStatus} IN ('AVAILABLE', 'OPTIMAL', 'OVERLOADED')`),
  check('executors_success_rate_check', sql`${t.successRate} BETWEEN 0 AND 100`),
]);

/* =========================================================================
   contractors — the implementing companies.
   `grade`:  GRADE_1..GRADE_5 | LOCAL_AUTHORIZED
   `status`: VERIFIED | UNDER_EVALUATION | SUSPENDED
   ========================================================================= */
export const contractors = pgTable('contractors', {
  id: text().primaryKey(),
  companyName: text().notNull(),
  ceoName: text().notNull(),
  nationalId: text().notNull(),
  grade: text().notNull(),
  gradeFa: text().notNull(),
  specialtyField: text().notNull(),
  activeContractsCount: integer().notNull(),
  totalContractValueToman: bigint({ mode: 'number' }).notNull(),
  /** 0–100 */
  performanceScore: doublePrecision().notNull(),
  /** 1–5 stars */
  satisfactionRating: doublePrecision().notNull(),
  freeCapacitySlots: integer().notNull(),
  phone: text().notNull(),
  status: text().notNull(),
  province: text(),
  county: text(),
}, (t) => [
  check('contractors_grade_check', sql`${t.grade} IN ('GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'LOCAL_AUTHORIZED')`),
  check('contractors_status_check', sql`${t.status} IN ('VERIFIED', 'UNDER_EVALUATION', 'SUSPENDED')`),
  check('contractors_score_check', sql`${t.performanceScore} BETWEEN 0 AND 100`),
  check('contractors_rating_check', sql`${t.satisfactionRating} BETWEEN 1 AND 5`),
]);

/* =========================================================================
   users — the human registry. `role` CHECK covers all 8 UserRole values.
   ========================================================================= */
export const users = pgTable('users', {
  id: text().primaryKey(),
  name: text().notNull(),
  role: text().notNull(),
  /** Short role name for compact badges. */
  roleFa: text().notNull(),
  roleTitleFa: text().notNull(),
  avatar: text().notNull(),
  /** Text org label (the unit the person belongs to), not an FK. */
  organization: text().notNull(),
  departmentId: text().references(() => departments.id),
  allowedLocationId: text().references(() => locations.id),
  province: text(),
  county: text(),
}, (t) => [
  check('users_role_check', sql`${t.role} IN ('ADMIN', 'PROVINCIAL_GOVERNOR', 'DEPARTMENT_HEAD', 'OFFICE_HEAD', 'REGIONAL_MANAGER', 'PLANNING_SPECIALIST', 'AUDITOR', 'DEHYAR_COUNCIL')`),
  index('idx_users_role').on(t.role),
]);

/* =========================================================================
   roles_permissions — access matrix keyed by role.
   `scope_level`: NATIONAL | PROVINCIAL | COUNTY | RURAL_DISTRICT
   ========================================================================= */
export const rolesPermissions = pgTable('roles_permissions', {
  role: text().primaryKey(),
  roleTitleFa: text().notNull(),
  description: text().notNull(),
  canViewDashboard: boolean().notNull().default(true),
  canEditDepartments: boolean().notNull().default(false),
  canManageBudget: boolean().notNull().default(false),
  canManageCrises: boolean().notNull().default(false),
  canManagePriorities: boolean().notNull().default(false),
  canCreateProject: boolean().notNull().default(false),
  canApproveProjects: boolean().notNull().default(false),
  canManageExecutors: boolean().notNull().default(false),
  canManageContractors: boolean().notNull().default(false),
  canExportReports: boolean().notNull().default(false),
  canAuditLogs: boolean().notNull().default(false),
  scopeLevel: text().notNull(),
}, (t) => [
  check('roles_permissions_role_check', sql`${t.role} IN ('ADMIN', 'PROVINCIAL_GOVERNOR', 'DEPARTMENT_HEAD', 'OFFICE_HEAD', 'REGIONAL_MANAGER', 'PLANNING_SPECIALIST', 'AUDITOR', 'DEHYAR_COUNCIL')`),
  check('roles_permissions_scope_check', sql`${t.scopeLevel} IN ('NATIONAL', 'PROVINCIAL', 'COUNTY', 'RURAL_DISTRICT')`),
]);

/* =========================================================================
   projects — the center of the domain.

   FK policy: NO ACTION (RESTRICT) on every FK — deleting a parent that is
   still referenced fails with the mapped error, which is why no
   `ON DELETE CASCADE` is placed on reference columns: a project must not
   vanish because its priority was deleted. The only cascade in the schema
   belongs to sub-tables that cannot exist without their owner
   (location_indicators, project_contributions).
   `status`:       PROPOSED | APPROVED | IN_PROGRESS | COMPLETED | SUSPENDED
   `anti_overlap`: CLEAR | POTENTIAL_DUPLICATE | INEFFICIENT_PER_CAPITA | UNPRIORITIZED
   `urgency`:      CRITICAL | HIGH | MEDIUM | LOW   (nullable)
   ========================================================================= */
export const projects = pgTable('projects', {
  id: text().primaryKey(),
  code: text().notNull(),
  title: text().notNull(),
  // --- taxpayers / owners (FKs) ------------------------------------------
  priorityId: text().references(() => priorities.id),
  /** The agency ultimately responsible (متولی اصلی). */
  departmentId: text().references(() => departments.id),
  /** The agency that requested the project first (متقاضی اولیه). */
  requestingDepartmentId: text().references(() => departments.id),
  budgetSourceId: text().references(() => budgetSources.id),
  executorId: text().references(() => executors.id),
  contractorId: text().references(() => contractors.id),
  /** The crisis/harm this project answers. */
  crisisHarmId: text().references(() => crisesHarms.id),
  /** Ownership stamp: the OFFICE_HEAD role sees only its own records. */
  createdByUserId: text().references(() => users.id),
  /** Multi-agency (اشتراکی/بین‌داشگاهی) project? */
  isMultiDepartment: boolean().notNull().default(false),

  // --- geography ----------------------------------------------------------
  administrativeLevel: text().notNull(),
  province: text().notNull(),
  county: text().notNull(),
  district: text().notNull(),
  targetArea: text().notNull(),

  // --- money (Toman) -------------------------------------------------------
  estimatedCostToman: bigint({ mode: 'number' }).notNull(),
  currentYearAllocatedToman: bigint({ mode: 'number' }),
  futureYearsAllocatedToman: bigint({ mode: 'number' }),

  // --- funding shares, 0–100 (nullable, optional in the DTO) ---------------
  csrSharePercentage: doublePrecision(),
  governmentSharePercentage: doublePrecision(),
  charitySharePercentage: doublePrecision(),
  dehyariSharePercentage: doublePrecision(),
  bankFacilitySharePercentage: doublePrecision(),

  // --- beneficiaries -------------------------------------------------------
  beneficiariesCount: bigint({ mode: 'number' }).notNull(),
  /** Cost per beneficiary in Toman. */
  costPerBeneficiaryToman: bigint({ mode: 'number' }).notNull(),
  targetBeneficiaryGroups: text().array().notNull().default(sql`'{}'::text[]`),

  // --- anti-overlap monitoring ---------------------------------------------
  antiOverlapStatus: text().notNull(),
  overlapWarningDetails: text(),

  /** The urgency inherited from the corresponding crisis/harm (optional). */
  urgencyLevel: text(),

  // --- lifecycle -----------------------------------------------------------
  status: text().notNull(),
  startYear: integer().notNull(),
  endYear: integer().notNull(),
  durationMonths: integer().notNull(),
  /** 0–100 */
  progressPercentage: doublePrecision().notNull(),
  description: text().notNull(),
}, (t) => [
  check('projects_status_check', sql`${t.status} IN ('PROPOSED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED')`),
  check('projects_level_check', sql`${t.administrativeLevel} IN ('NATIONAL', 'PROVINCIAL', 'COUNTY', 'RURAL_DISTRICT')`),
  check('projects_anti_overlap_check', sql`${t.antiOverlapStatus} IN ('CLEAR', 'POTENTIAL_DUPLICATE', 'INEFFICIENT_PER_CAPITA', 'UNPRIORITIZED')`),
  check('projects_urgency_check', sql`${t.urgencyLevel} IS NULL OR ${t.urgencyLevel} IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')`),
  check('projects_progress_check', sql`${t.progressPercentage} BETWEEN 0 AND 100`),
  check('projects_years_check', sql`${t.startYear} <= ${t.endYear}`),
  check('projects_shares_check', sql`(${t.csrSharePercentage} IS NULL OR ${t.csrSharePercentage} BETWEEN 0 AND 100)
      AND (${t.governmentSharePercentage} IS NULL OR ${t.governmentSharePercentage} BETWEEN 0 AND 100)
      AND (${t.charitySharePercentage} IS NULL OR ${t.charitySharePercentage} BETWEEN 0 AND 100)
      AND (${t.dehyariSharePercentage} IS NULL OR ${t.dehyariSharePercentage} BETWEEN 0 AND 100)
      AND (${t.bankFacilitySharePercentage} IS NULL OR ${t.bankFacilitySharePercentage} BETWEEN 0 AND 100)`),
  check('projects_cost_check', sql`${t.estimatedCostToman} >= 0 AND ${t.costPerBeneficiaryToman} >= 0`),
  index('idx_projects_status').on(t.status),
  index('idx_projects_priority').on(t.priorityId),
  index('idx_projects_department').on(t.departmentId),
  index('idx_projects_province_county').on(t.province, t.county),
  index('idx_projects_executor').on(t.executorId),
  index('idx_projects_contractor').on(t.contractorId),
]);

/**
 * project_contributions — the junction that resolves the many-to-many
 * between projects and departments, with attributes: a contributing
 * department brings a share percentage, an amount and a role description.
 * Only the share data is stored; the department *name* the DTO carries is
 * joined (the row itself already defines it).
 */
export const projectContributions = pgTable('project_contributions', {
  projectId: text().notNull().references(() => projects.id, { onDelete: 'cascade' }),
  departmentId: text().notNull().references(() => departments.id, { onDelete: 'cascade' }),
  /** 0–100 */
  sharePercentage: doublePrecision().notNull(),
  shareAmountToman: bigint({ mode: 'number' }).notNull(),
  roleDescription: text(),
}, (t) => [
  primaryKey({ columns: [t.projectId, t.departmentId] }),
  check('project_contributions_share_check', sql`${t.sharePercentage} BETWEEN 0 AND 100`),
  check('project_contributions_amount_check', sql`${t.shareAmountToman} >= 0`),
]);

/* =========================================================================
   audit_logs — append-only trail. `seq` replaces SQLite's rowid.
   ========================================================================= */
export const auditLogs = pgTable('audit_logs', {
  id: text().primaryKey(),
  seq: bigint({ mode: 'number' }).generatedAlwaysAsIdentity(),
  /** Persian display timestamp from the UI. */
  timestamp: text().notNull(),
  userName: text().notNull(),
  userRole: text().notNull(),
  actionType: text().notNull(),
  targetPriorityTitle: text(),
  oldValue: text(),
  newValue: text(),
  rationale: text(),
  province: text(),
  county: text(),
}, (t) => [
  index('idx_audit_logs_seq').on(t.seq),
  index('idx_audit_logs_action').on(t.actionType),
]);

/* =========================================================================
   analysis_sources — engine inputs under human review.
   `origin`: AI | HUMAN
   `kind`:   NEWS | OFFICIAL_STAT | FIELD_REPORT | SATELLITE | INTERVIEW | SOCIAL_MEDIA
   `status`: PENDING | APPROVED | REJECTED
   ========================================================================= */
export const analysisSources = pgTable('analysis_sources', {
  id: text().primaryKey(),
  seq: bigint({ mode: 'number' }).generatedAlwaysAsIdentity(),
  title: text().notNull(),
  summary: text().notNull(),
  origin: text().notNull(),
  kind: text().notNull(),
  /** Producing model (AI) or person/organisation (HUMAN). */
  provider: text().notNull(),
  sourceUrl: text(),
  /** Persian publication date display string. */
  publishedAt: text().notNull(),
  /** Analytical modules consuming this input. */
  linkedAreas: text().array().notNull().default(sql`'{}'::text[]`),
  /** 0–100 credibility score. */
  reliabilityScore: doublePrecision().notNull(),
  status: text().notNull(),
  reviewedBy: text(),
  reviewNote: text(),
  province: text().notNull(),
  county: text().notNull(),
  createdAt: text().notNull(),
}, (t) => [
  check('analysis_sources_origin_check', sql`${t.origin} IN ('AI', 'HUMAN')`),
  check('analysis_sources_kind_check', sql`${t.kind} IN ('NEWS', 'OFFICIAL_STAT', 'FIELD_REPORT', 'SATELLITE', 'INTERVIEW', 'SOCIAL_MEDIA')`),
  check('analysis_sources_status_check', sql`${t.status} IN ('PENDING', 'APPROVED', 'REJECTED')`),
  check('analysis_sources_reliability_check', sql`${t.reliabilityScore} BETWEEN 0 AND 100`),
  index('idx_analysis_sources_origin').on(t.origin),
  index('idx_analysis_sources_status').on(t.status),
]);

/* =========================================================================
   Row types inferred from the schema — repositories use these for typing.
   ========================================================================= */
export type ProjectRow = typeof projects.$inferSelect;
export type DepartmentRow = typeof departments.$inferSelect;
export type PriorityRow = typeof priorities.$inferSelect;
export type LocationRow = typeof locations.$inferSelect;
export type LocationIndicatorsRow = typeof locationIndicators.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type AnalysisSourceRow = typeof analysisSources.$inferSelect;
