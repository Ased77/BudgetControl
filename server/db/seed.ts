/* =========================================================================
   Normalized seeding — one-time, transactional, gated.

   Recreates the legacy seed (≈22k rows across ~483 generated county
   datasets) on the normalized tables, preserving the exact data sets the
   frontend has always booted with:

     * hand-crafted counties (رفسنجان، امیدیه) keep their curated records;
     * every other county receives a deterministic, indicator-driven
       dataset from `buildCountyDataset(loc)`.

   Differences from the legacy seeding:

     * insert order respects the new FOREIGN KEYs: reference tables are
       filled before the tables that point at them;
     * writes are batched multi-row INSERTs (≤ bound-parameter ceiling),
       so the whole seed finishes in seconds instead of thousands of
       round trips;
     * dangling references are repaired *before* the insert (set to NULL
       with a warning) — the document model tolerated stale ids silently,
       but the normalized model must never fail a boot because a county
       generator emitted a parent that does not exist;
     * everything happens inside ONE transaction together with the seed
       gate (`app_meta.seeded`), so an interrupted boot leaves empty
       tables and simply re-seeds on the next one.
   ========================================================================= */

import type {
  BudgetSource,
  Contractor,
  CrisisHarmItem,
  Department,
  ExecutiveProject,
  ProjectExecutor,
  UserProfile,
} from '../../src/types.js';
import {
  INITIAL_ANALYSIS_SOURCES,
  INITIAL_AUDIT_LOGS,
  INITIAL_BUDGET_SOURCES,
  INITIAL_CONTRACTORS,
  INITIAL_CRISES_AND_HARMS,
  INITIAL_DEPARTMENTS,
  INITIAL_EXECUTORS,
  INITIAL_LOCATIONS,
  INITIAL_ORGANIZATION,
  INITIAL_PRIORITIES,
  INITIAL_PROJECTS,
  INITIAL_ROLES_PERMISSIONS,
  INITIAL_USERS,
} from '../../src/data/initialData.js';
import { buildCountyDataset, type CountyDataset } from '../../src/data/countyTemplates.js';
import { OMIDIYEH_COUNTY } from '../../src/data/omidiyehData.js';
import { db } from './client.js';
import { projectToRow, contributionsToRows } from './repositories/project.repository.js';
import { priorityToRow } from './repositories/priority.repository.js';
import { analysisSourceToRow } from './repositories/analysis-source.repository.js';
import {
  departments as departmentsTable,
  auditLogs as auditLogsTable,
  budgetSources as budgetSourcesTable,
  contractors as contractorsTable,
  crisesHarms as crisesHarmsTable,
  executors as executorsTable,
  locationIndicators,
  locations as locationsTable,
  organization as organizationTable,
  priorities as prioritiesTable,
  projectContributions,
  projects as projectsTable,
  rolesPermissions as rolesTable,
  users as usersTable,
  analysisSources as analysisSourcesTable,
} from './schema.js';
import { SEED_KEY, SEED_VALUE } from './initialize.js';
import { sql } from 'drizzle-orm';

const HANDCRAFTED_COUNTIES = new Set(['شهرستان رفسنجان', OMIDIYEH_COUNTY]);

/** Rows per multi-row INSERT (project rows carry ~40 columns → 500 stays ≪ 65535). */
const CHUNK = 200;

type InsertValues = Record<string, unknown>;

/* DataRow builders (local to the seed; repositories own the same tables). */

type DepartmentInsert = typeof departmentsTable.$inferInsert;
type BudgetInsert = typeof budgetSourcesTable.$inferInsert;
type CrisisInsert = typeof crisesHarmsTable.$inferInsert;
type ExecutorInsert = typeof executorsTable.$inferInsert;
type ContractorInsert = typeof contractorsTable.$inferInsert;
type UserInsert = typeof usersTable.$inferInsert;
type AuditInsert = typeof auditLogsTable.$inferInsert;
type LocationInsert = typeof locationsTable.$inferInsert;
type IndicatorInsert = typeof locationIndicators.$inferInsert;
type ContributionInsert = typeof projectContributions.$inferInsert;

function departmentRow(d: Department): DepartmentInsert {
  return {
    id: d.id, name: d.name, code: d.code, category: d.category, categoryFa: d.categoryFa,
    headPersonName: d.headPersonName, contactNumber: d.contactNumber,
    email: d.email ?? null, logoDataUrl: d.logoDataUrl ?? null,
    allocatedBudgetToman: Math.round(Number(d.allocatedBudgetToman)) || 0,
    absorbedBudgetToman: Math.round(Number(d.absorbedBudgetToman)) || 0,
    activeProjectsCount: Math.round(Number(d.activeProjectsCount)) || 0,
    performanceScore: Number(d.performanceScore ?? 0),
    administrativeLevel: d.administrativeLevel, province: d.province,
    county: d.county ?? null, description: d.description ?? '',
  };
}

function budgetSourceRow(s: BudgetSource): BudgetInsert {
  return {
    id: s.id, title: s.title, code: s.code, sourceType: s.sourceType, sourceTypeFa: s.sourceTypeFa,
    totalAmountToman: Math.round(Number(s.totalAmountToman)) || 0,
    allocatedAmountToman: Math.round(Number(s.allocatedAmountToman)) || 0,
    remainingAmountToman: Math.round(Number(s.remainingAmountToman)) || 0,
    fiscalYear: s.fiscalYear, sponsorOrganization: s.sponsorOrganization, targetScope: s.targetScope,
    restrictionNote: s.restrictionNote ?? null, status: s.status,
    province: s.province ?? null, county: s.county ?? null,
  };
}

function crisisRow(c: CrisisHarmItem): CrisisInsert {
  return {
    id: c.id, title: c.title, code: c.code, category: c.category, level: c.level,
    province: c.province, county: c.county, districtOrVillage: c.districtOrVillage,
    severityScore: Number(c.severityScore ?? 0), urgency: c.urgency,
    affectedPopulation: Math.round(Number(c.affectedPopulation)) || 0,
    primaryCause: c.primaryCause, recommendedIntervention: c.recommendedIntervention,
    status: c.status, activeProjectsCount: Math.round(Number(c.activeProjectsCount)) || 0,
    deficitIndexFa: c.deficitIndexFa,
  };
}

function executorRow(e: ProjectExecutor): ExecutorInsert {
  return {
    id: e.id, name: e.name, code: e.code, type: e.type, typeFa: e.typeFa,
    managingDirector: e.managingDirector, contactPhone: e.contactPhone,
    activeProjectsCount: Math.round(Number(e.activeProjectsCount)) || 0,
    completedProjectsCount: Math.round(Number(e.completedProjectsCount)) || 0,
    successRate: Number(e.successRate ?? 0), capacityStatus: e.capacityStatus,
    coverageRegion: e.coverageRegion, province: e.province ?? null, county: e.county ?? null,
  };
}

function contractorRow(c: Contractor): ContractorInsert {
  return {
    id: c.id, companyName: c.companyName, ceoName: c.ceoName, nationalId: c.nationalId,
    grade: c.grade, gradeFa: c.gradeFa, specialtyField: c.specialtyField,
    activeContractsCount: Math.round(Number(c.activeContractsCount)) || 0,
    totalContractValueToman: Math.round(Number(c.totalContractValueToman)) || 0,
    performanceScore: Number(c.performanceScore ?? 0),
    satisfactionRating: Number(c.satisfactionRating ?? 3),
    freeCapacitySlots: Math.round(Number(c.freeCapacitySlots)) || 0,
    phone: c.phone, status: c.status, province: c.province ?? null, county: c.county ?? null,
  };
}

function userRow(u: UserProfile, departmentIds: Set<string>): UserInsert {
  // Repair dangling department references before the statement even runs.
  const safeDepartmentId = u.departmentId && departmentIds.has(u.departmentId) ? u.departmentId : null;
  return {
    id: u.id, name: u.name, role: u.role, roleFa: u.roleFa, roleTitleFa: u.roleTitleFa,
    avatar: u.avatar, organization: u.organization,
    departmentId: safeDepartmentId,
    allowedLocationId: u.allowedLocationId ?? null,
    province: u.province ?? null, county: u.county ?? null,
  };
}

function auditRow(a: typeof INITIAL_AUDIT_LOGS[number]): AuditInsert {
  return {
    id: a.id, timestamp: a.timestamp, userName: a.userName, userRole: a.userRole,
    actionType: a.actionType, targetPriorityTitle: a.targetPriorityTitle ?? null,
    oldValue: a.oldValue ?? null, newValue: a.newValue ?? null, rationale: a.rationale ?? null,
    province: a.province ?? null, county: a.county ?? null,
  };
}

export async function seedDatabase(): Promise<void> {
  /* ---- Reference datasets (same sets as the legacy seed) ------------------ */

  const generated = INITIAL_LOCATIONS.filter(
    (loc) => loc.level === 'COUNTY' && !HANDCRAFTED_COUNTIES.has(loc.county),
  ).map((loc) => buildCountyDataset(loc));

  const datasetDepartments: Department[] = [...INITIAL_DEPARTMENTS];
  const datasetBudgetSources: BudgetSource[] = [...INITIAL_BUDGET_SOURCES];
  const datasetCrises: CrisisHarmItem[] = [...INITIAL_CRISES_AND_HARMS];
  const datasetExecutors: ProjectExecutor[] = [...INITIAL_EXECUTORS];
  const datasetContractors: Contractor[] = [...INITIAL_CONTRACTORS];
  const datasetUsers: UserProfile[] = [...INITIAL_USERS];
  const datasetAuditLogs: typeof INITIAL_AUDIT_LOGS = [...INITIAL_AUDIT_LOGS];
  const datasetProjects: ExecutiveProject[] = [...INITIAL_PROJECTS];

  for (const dataset of generated) {
    datasetDepartments.push(...dataset.departments);
    datasetBudgetSources.push(...dataset.budgetSources);
    datasetCrises.push(...dataset.crisesHarms);
    datasetExecutors.push(...dataset.executors);
    datasetContractors.push(...dataset.contractors);
    datasetUsers.push(...dataset.users);
    datasetAuditLogs.push(...dataset.auditLogs);
    datasetProjects.push(...dataset.projects);
  }

  const departmentIds = new Set(datasetDepartments.map((d) => d.id));
  const priorityIds = new Set(INITIAL_PRIORITIES.map((p) => p.id));
  const budgetSourceIds = new Set(datasetBudgetSources.map((s) => s.id));
  const executorIds = new Set(datasetExecutors.map((e) => e.id));
  const contractorIds = new Set(datasetContractors.map((c) => c.id));
  const crisisIds = new Set(datasetCrises.map((c) => c.id));
  const userCreatorIds = new Set(datasetUsers.map((u) => u.id));

  // FK-safety pass in memory: a document-model row may carry a stale
  // reference; normalized inserts must not abort the whole boot over it.
  const repairedProjects = datasetProjects.map((project): ExecutiveProject => {
    const patch: Partial<ExecutiveProject> = {};
    let touched = false;
    if (project.priorityId && !priorityIds.has(project.priorityId)) { patch.priorityId = ''; touched = true; }
    if (project.departmentId && !departmentIds.has(project.departmentId)) { patch.departmentId = ''; touched = true; }
    if (project.requestingDepartmentId && !departmentIds.has(project.requestingDepartmentId)) { patch.requestingDepartmentId = undefined; touched = true; }
    if (project.budgetSourceId && !budgetSourceIds.has(project.budgetSourceId)) { patch.budgetSourceId = ''; touched = true; }
    if (project.executorId && !executorIds.has(project.executorId)) { patch.executorId = ''; touched = true; }
    if (project.contractorId && !contractorIds.has(project.contractorId)) { patch.contractorId = undefined; touched = true; }
    if (project.crisisHarmId && !crisisIds.has(project.crisisHarmId)) { patch.crisisHarmId = undefined; touched = true; }
    if (project.createdByUserId && !userCreatorIds.has(project.createdByUserId)) { patch.createdByUserId = undefined; touched = true; }
    const contributions = (project.contributingDepartments ?? []).filter((c) => departmentIds.has(c.departmentId));
    if (contributions.length !== (project.contributingDepartments ?? []).length) { patch.contributingDepartments = contributions; touched = true; }
    if (touched) {
      console.warn(`[seed] Repaired dangling references on project ${project.id} (${project.code})`);
      return { ...project, ...patch };
    }
    return project;
  });

  /* ---- The single all-or-nothing seed transaction ------------------------- */

  await db.transaction(async (tx) => {
    const insert = (table: Parameters<typeof tx.insert>[0], values: InsertValues[]) =>
      Promise.resolve().then(async () => {
        for (let offset = 0; offset < values.length; offset += CHUNK) {
          const batch = values.slice(offset, offset + CHUNK);
          if (batch.length === 0) continue;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (tx.insert(table as any).values(batch as any).onConflictDoNothing());
        }
      });

    const locationRows: LocationInsert[] = [];
    const indicatorRows: IndicatorInsert[] = [];
    for (const loc of INITIAL_LOCATIONS) {
      locationRows.push({
        id: loc.id, level: loc.level, province: loc.province, county: loc.county,
        city: loc.city, district: loc.district,
        population: Math.round(Number(loc.population)) || 0,
        coordinatesLat: loc.coordinates?.lat ?? null,
        coordinatesLng: loc.coordinates?.lng ?? null,
      });
      if (loc.indicators) {
        indicatorRows.push({
          locationId: loc.id,
          povertyRate: loc.indicators.povertyRate,
          marginalizationRate: loc.indicators.marginalizationRate,
          unemploymentRate: loc.indicators.unemploymentRate,
          socialHarmsIndex: loc.indicators.socialHarmsIndex,
          vulnerableGroupsPopulation: Math.round(Number(loc.indicators.vulnerableGroupsPopulation)) || 0,
          infrastructureDeficit: loc.indicators.infrastructureDeficit,
          crisisVulnerabilityScore: loc.indicators.crisisVulnerabilityScore,
          healthAccessDeficit: loc.indicators.healthAccessDeficit,
          educationDropOutRate: loc.indicators.educationDropOutRate,
          culturalDeficitScore: loc.indicators.culturalDeficitScore,
          environmentalRiskScore: loc.indicators.environmentalRiskScore,
        });
      }
    }

    await insert(locationsTable, locationRows);
    await insert(locationIndicators, indicatorRows);

    await insert(departmentsTable, datasetDepartments.map(departmentRow));
    await insert(budgetSourcesTable, datasetBudgetSources.map(budgetSourceRow));
    await insert(crisesHarmsTable, datasetCrises.map(crisisRow));
    await insert(prioritiesTable, INITIAL_PRIORITIES.map(priorityToRow));
    await insert(executorsTable, datasetExecutors.map(executorRow));
    await insert(contractorsTable, datasetContractors.map(contractorRow));
    await insert(usersTable, datasetUsers.map((u) => userRow(u, departmentIds)));
    await insert(organizationTable, [{
      id: INITIAL_ORGANIZATION.id,
      name: INITIAL_ORGANIZATION.name,
      orgType: INITIAL_ORGANIZATION.orgType,
      activitySector: INITIAL_ORGANIZATION.activitySector,
      nationalCode: INITIAL_ORGANIZATION.nationalCode ?? null,
      province: INITIAL_ORGANIZATION.province,
      city: INITIAL_ORGANIZATION.city,
      county: INITIAL_ORGANIZATION.county,
      district: INITIAL_ORGANIZATION.district,
      totalBudget: Math.round(Number(INITIAL_ORGANIZATION.totalBudget)) || 0,
      currencyUnit: INITIAL_ORGANIZATION.currencyUnit,
      budgetPeriod: INITIAL_ORGANIZATION.budgetPeriod,
      fiscalYear: INITIAL_ORGANIZATION.fiscalYear,
      description: INITIAL_ORGANIZATION.description ?? null,
      updatedAt: INITIAL_ORGANIZATION.updatedAt,
    }]);

    await insert(rolesTable, INITIAL_ROLES_PERMISSIONS.map((r) => ({
      role: r.role,
      roleTitleFa: r.roleTitleFa,
      description: r.description,
      canViewDashboard: r.canViewDashboard ?? true,
      canEditDepartments: r.canEditDepartments ?? false,
      canManageBudget: r.canManageBudget ?? false,
      canManageCrises: r.canManageCrises ?? false,
      canManagePriorities: r.canManagePriorities ?? false,
      canCreateProject: r.canCreateProject ?? false,
      canApproveProjects: r.canApproveProjects ?? false,
      canManageExecutors: r.canManageExecutors ?? false,
      canManageContractors: r.canManageContractors ?? false,
      canExportReports: r.canExportReports ?? false,
      canAuditLogs: r.canAuditLogs ?? false,
      scopeLevel: r.scopeLevel,
    })));

    await insert(projectsTable, repairedProjects.map(projectToRow));

    const contributionRows: ContributionInsert[] = [];
    for (const p of repairedProjects) {
      const items = p.contributingDepartments ?? [];
      const direct = items.filter((c) => departmentIds.has(c.departmentId));
      if (direct.length > 0) {
        contributionRows.push(...contributionsToRows(p.id, direct));
      }
    }
    await insert(projectContributions, contributionRows);

    await insert(auditLogsTable, datasetAuditLogs.map(auditRow));
    await insert(analysisSourcesTable, INITIAL_ANALYSIS_SOURCES.map(analysisSourceToRow));

    /* The gate rides in the same transaction — atomic with the data. */
    await tx.execute(
      sql`INSERT INTO app_meta (key, value) VALUES (${SEED_KEY}, ${SEED_VALUE}) ON CONFLICT (key) DO UPDATE SET value = ${SEED_VALUE}`,
    );
  });
}
