/* =========================================================================
   Project repository — the domain's center of gravity.

   What used to be a self-contained `jsonb` blob now spreads across ten
   tables, so the read path reassembles the ExecutiveProject DTO exactly
   as the API always served it:

     priorityTitle           ← priorities.title
     departmentName          ← departments.name        (the responsible agency)
     requestingDepartment…   ← departments (2nd alias) (the initial requester)
     budgetSourceName        ← budget_sources.title
     executorName            ← executors.name
     contractorName          ← contractors.companyName
     crisisHarmTitle         ← crises_harms.title
     createdByName           ← users (2nd alias)
     contributingDepartments ← the junction (+1 query per *page*, not per row)

   This is the anti-N+1 contract of the layer in miniature: names that the
   document model copied into JSON are *never* stored twice; a single SQL
   statement with LEFT JOINs resolves every display name in one round
   trip. Write paths accept the same DTO but derive nothing from the
   copied names — the FK ids are the truth.
   ========================================================================= */

import { and, asc, desc, eq, inArray, ilike, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type {
  AdministrativeLevel,
  ContributingDepartment,
  ExecutiveProject,
  ProjectStatus,
  UrgencyLevel,
} from '../../../src/types.js';
import { withDbErrorMapping } from '../errors.js';
import { db, type DrizzleDb, type Tx } from '../client.js';
import {
  budgetSources,
  contractors,
  crisesHarms,
  departments,
  executors,
  priorities,
  projectContributions,
  projects,
  users,
} from '../schema.js';

type Executor = DrizzleDb | Tx;

/* Second aliases so the same table can join twice in one statement. */
const requestingDepartments = alias(departments, 'requesting_departments');
const creatorUsers = alias(users, 'creator_users');

/**
 * One flat selection: project columns + every display name in one pass.
 * LEFT JOINs (not INNER) tolerate dangling references — a project whose
 * priority was force-deleted still renders with an empty name instead of
 * vanishing from a list.
 */
const PAGE_SELECTION = {
  project: projects,
  priorityTitle: priorities.title,
  budgetSourceName: budgetSources.title,
  executorName: executors.name,
  contractorName: contractors.companyName,
  crisisHarmTitle: crisesHarms.title,
  departmentName: departments.name,
  requestingDepartmentName: requestingDepartments.name,
  createdByName: creatorUsers.name,
};

type JoinedProjectRow = {
  project: typeof projects.$inferSelect;
  priorityTitle: string | null;
  budgetSourceName: string | null;
  executorName: string | null;
  contractorName: string | null;
  crisisHarmTitle: string | null;
  departmentName: string | null;
  requestingDepartmentName: string | null;
  createdByName: string | null;
};

/** Rebuild the complete DTO from flattened columns + joined names. */
function composeProject(joined: JoinedProjectRow, contributions: ContributingDepartment[] = []): ExecutiveProject {
  const p = joined.project;
  return {
    id: p.id,
    code: p.code,
    title: p.title,
    priorityId: p.priorityId ?? '',
    priorityTitle: joined.priorityTitle ?? '',
    departmentId: p.departmentId ?? '',
    departmentName: joined.departmentName ?? '',
    requestingDepartmentId: p.requestingDepartmentId ?? undefined,
    requestingDepartmentName: joined.requestingDepartmentName ?? undefined,
    isMultiDepartment: p.isMultiDepartment ?? false,
    contributingDepartments: contributions.length > 0 ? contributions : undefined,
    budgetSourceId: p.budgetSourceId ?? '',
    budgetSourceName: joined.budgetSourceName ?? '',
    executorId: p.executorId ?? '',
    executorName: joined.executorName ?? '',
    contractorId: p.contractorId ?? undefined,
    contractorName: joined.contractorName ?? undefined,
    createdByUserId: p.createdByUserId ?? undefined,
    createdByName: joined.createdByName ?? undefined,
    crisisHarmId: p.crisisHarmId ?? undefined,
    crisisHarmTitle: joined.crisisHarmTitle ?? undefined,
    urgencyLevel: (p.urgencyLevel ?? undefined) as UrgencyLevel | undefined,
    administrativeLevel: p.administrativeLevel as AdministrativeLevel,
    province: p.province,
    county: p.county,
    district: p.district,
    targetArea: p.targetArea,
    estimatedCostToman: p.estimatedCostToman,
    currentYearAllocatedToman: p.currentYearAllocatedToman ?? undefined,
    futureYearsAllocatedToman: p.futureYearsAllocatedToman ?? undefined,
    csrSharePercentage: p.csrSharePercentage ?? undefined,
    governmentSharePercentage: p.governmentSharePercentage ?? undefined,
    charitySharePercentage: p.charitySharePercentage ?? undefined,
    dehyariSharePercentage: p.dehyariSharePercentage ?? undefined,
    bankFacilitySharePercentage: p.bankFacilitySharePercentage ?? undefined,
    beneficiariesCount: p.beneficiariesCount,
    costPerBeneficiaryToman: p.costPerBeneficiaryToman,
    targetBeneficiaryGroups: p.targetBeneficiaryGroups,
    antiOverlapStatus: p.antiOverlapStatus as ExecutiveProject['antiOverlapStatus'],
    overlapWarningDetails: p.overlapWarningDetails ?? undefined,
    status: p.status as ProjectStatus,
    startYear: p.startYear,
    endYear: p.endYear,
    durationMonths: p.durationMonths,
    progressPercentage: p.progressPercentage,
    description: p.description,
  };
}

function joined(executor: Executor) {
  return executor
    .select(PAGE_SELECTION)
    .from(projects)
    .leftJoin(priorities, eq(projects.priorityId, priorities.id))
    .leftJoin(departments, eq(projects.departmentId, departments.id))
    .leftJoin(requestingDepartments, eq(projects.requestingDepartmentId, requestingDepartments.id))
    .leftJoin(budgetSources, eq(projects.budgetSourceId, budgetSources.id))
    .leftJoin(executors, eq(projects.executorId, executors.id))
    .leftJoin(contractors, eq(projects.contractorId, contractors.id))
    .leftJoin(crisesHarms, eq(projects.crisisHarmId, crisesHarms.id))
    // legacy `users` roster is text-keyed while `projects.created_by_user_id`
    // is a uuid (auth actor) — cross-type join needs one explicit cast.
    .leftJoin(creatorUsers, sql`${projects.createdByUserId}::text = ${creatorUsers.id}`);
}

/**
 * Contributions for a *set* of project ids in ONE IN(...) query — the
 * canonical fix for the classic N+1 (one junction query per project)
 * once the join count outgrows a single statement.
 */
async function contributionsFor(ids: string[], executor: Executor = db): Promise<Map<string, ContributingDepartment[]>> {
  const result = new Map<string, ContributingDepartment[]>();
  if (ids.length === 0) return result;

  const rows = await executor
    .select({
      projectId: projectContributions.projectId,
      departmentId: projectContributions.departmentId,
      departmentName: departments.name,
      sharePercentage: projectContributions.sharePercentage,
      shareAmountToman: projectContributions.shareAmountToman,
      roleDescription: projectContributions.roleDescription,
    })
    .from(projectContributions)
    .innerJoin(departments, eq(projectContributions.departmentId, departments.id))
    .where(inArray(projectContributions.projectId, ids));

  for (const row of rows) {
    const list = result.get(row.projectId) ?? [];
    list.push({
      departmentId: row.departmentId,
      departmentName: row.departmentName,
      sharePercentage: row.sharePercentage,
      shareAmountToman: row.shareAmountToman,
      roleDescription: row.roleDescription ?? undefined,
    });
    result.set(row.projectId, list);
  }
  return result;
}

/** Legacy behaviour preserved: everything, ordered by id. */
export async function listProjects(): Promise<ExecutiveProject[]> {
  return withDbErrorMapping(async () => {
    const rows = await joined(db).orderBy(asc(projects.id));
    const contributions = await contributionsFor(rows.map((r) => r.project.id));
    return rows.map((row) => composeProject(
      row as unknown as JoinedProjectRow,
      contributions.get(row.project.id) ?? [],
    ));
  });
}

export async function getProject(id: string): Promise<ExecutiveProject | undefined> {
  return withDbErrorMapping(async () => {
    const [row] = await joined(db).where(eq(projects.id, id)).limit(1);
    if (!row) return undefined;
    const contributions = await contributionsFor([id]);
    return composeProject(row as unknown as JoinedProjectRow, contributions.get(id) ?? []);
  });
}

export interface ProjectFilter {
  status?: ProjectStatus;
  province?: string;
  county?: string;
  priorityId?: string;
  departmentId?: string;
  executorId?: string;
  antiOverlapStatus?: string;
  /** Substring match — ILIKE is parameterized by drizzle, never interpolated. */
  search?: string;
}

/** Sortable fields for the paged listing; keys are whitelisted DTO names. */
const SORTABLE = {
  title: projects.title,
  status: projects.status,
  county: projects.county,
  province: projects.province,
  estimatedCostToman: projects.estimatedCostToman,
  progressPercentage: projects.progressPercentage,
  startYear: projects.startYear,
  endYear: projects.endYear,
  beneficiariesCount: projects.beneficiariesCount,
  priorityTitle: priorities.title,
  departmentName: departments.name,
} as const;

export interface ProjectPage {
  items: ExecutiveProject[];
  total: number;
}

/**
 * SQL-side filtered, paginated, sorted listing — the performance gap the
 * document model pushed into JavaScript is closed here:
 *   * every filter is an indexed equality or a parameterized ILIKE;
 *   * `count(*) over ()` returns the qualifying total in the same query
 *     (with one extra COUNT only when the page is past its end);
 *   * contributions follow with a single extra statement for the page.
 */
export async function listProjectsPage(options: ProjectFilter & {
  orderBy?: keyof typeof SORTABLE;
  descending?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ProjectPage> {
  return withDbErrorMapping(async () => {
    const clauses: SQL[] = [];
    if (options.status) clauses.push(eq(projects.status, options.status) as unknown as SQL);
    if (options.province) clauses.push(eq(projects.province, options.province) as unknown as SQL);
    if (options.county) clauses.push(eq(projects.county, options.county) as unknown as SQL);
    if (options.priorityId) clauses.push(eq(projects.priorityId, options.priorityId) as unknown as SQL);
    if (options.departmentId) clauses.push(eq(projects.departmentId, options.departmentId) as unknown as SQL);
    if (options.executorId) clauses.push(eq(projects.executorId, options.executorId) as unknown as SQL);
    if (options.antiOverlapStatus) clauses.push(eq(projects.antiOverlapStatus, options.antiOverlapStatus) as unknown as SQL);
    if (options.search) clauses.push(ilike(projects.title, `%${options.search}%`) as unknown as SQL);
    const predicate = clauses.length === 0 ? undefined : and(...clauses);

    const sortColumn = options.orderBy ? SORTABLE[options.orderBy] : undefined;
    const orderBy = sortColumn
      ? (options.descending ? desc(sortColumn) : asc(sortColumn))
      : asc(projects.id);
    const limit = Math.max(1, Math.min(Math.floor(Number(options.limit ?? 50)), 500));
    const offset = Math.max(0, Math.floor(Number(options.offset ?? 0)));

    const rows = await joined(db)
      .where(predicate)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // In-page rows come from LIMIT slicing; the exact qualifying total is
    // computed by COUNT(*) on the same predicate (cheap, shared index).
    const total = await countMatching(predicate);

    const ids = rows.map((r) => r.project.id);
    const contributions = await contributionsFor(ids);

    return {
      items: rows.map((row) => composeProject(
        row as unknown as JoinedProjectRow,
        contributions.get(row.project.id) ?? [],
      )),
      total,
    };
  });
}

async function countMatching(predicate: SQL | undefined): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)`.mapWith(Number) })
    .from(projects)
    .where(predicate);
  return row?.value ?? 0;
}

/**
 * One aggregate example — status counts per county computed in SQL, for
 * the "how many projects are running here?" dashboards: a single GROUP BY
 * instead of JavaScript-side reduction over the full list.
 */
export async function countProjectsByStatus(county?: string): Promise<Record<string, number>> {
  return withDbErrorMapping(async () => {
    const rows = await db
      .select({ status: projects.status, value: sql<number>`count(*)`.mapWith(Number) })
      .from(projects)
      .where(county ? eq(projects.county, county) : undefined)
      .groupBy(projects.status);
    return Object.fromEntries(rows.map((r) => [r.status, r.value]));
  });
}

/**
 * Storage-bound projection of the shared DTO. Display names intentionally
 * not stored: the data is not copied; the API recomposites them via joins.
 * `actorId` is the verified creator (auth layer); the DTO's display-only
 * `createdByUserId` is legacy identity data and is never written here.
 */
export function projectToRow(p: ExecutiveProject, actorId: string): typeof projects.$inferInsert {
  return {
    id: p.id,
    code: p.code,
    title: p.title,
    priorityId: p.priorityId || null,
    departmentId: p.departmentId || null,
    requestingDepartmentId: p.requestingDepartmentId ?? null,
    isMultiDepartment: p.isMultiDepartment ?? false,
    budgetSourceId: p.budgetSourceId || null,
    executorId: p.executorId || null,
    contractorId: p.contractorId ?? null,
    crisisHarmId: p.crisisHarmId ?? null,
    createdByUserId: actorId,
    administrativeLevel: p.administrativeLevel,
    province: p.province,
    county: p.county,
    district: p.district,
    targetArea: p.targetArea,
    estimatedCostToman: Math.round(Number(p.estimatedCostToman)) || 0,
    currentYearAllocatedToman: p.currentYearAllocatedToman != null ? Math.round(Number(p.currentYearAllocatedToman)) || 0 : null,
    futureYearsAllocatedToman: p.futureYearsAllocatedToman != null ? Math.round(Number(p.futureYearsAllocatedToman)) || 0 : null,
    csrSharePercentage: p.csrSharePercentage ?? null,
    governmentSharePercentage: p.governmentSharePercentage ?? null,
    charitySharePercentage: p.charitySharePercentage ?? null,
    dehyariSharePercentage: p.dehyariSharePercentage ?? null,
    bankFacilitySharePercentage: p.bankFacilitySharePercentage ?? null,
    beneficiariesCount: Math.round(Number(p.beneficiariesCount)) || 0,
    costPerBeneficiaryToman: Math.round(Number(p.costPerBeneficiaryToman)) || 0,
    targetBeneficiaryGroups: p.targetBeneficiaryGroups ?? [],
    antiOverlapStatus: p.antiOverlapStatus,
    overlapWarningDetails: p.overlapWarningDetails ?? null,
    urgencyLevel: p.urgencyLevel ?? null,
    status: p.status,
    startYear: Math.round(Number(p.startYear)) || 0,
    endYear: Math.round(Number(p.endYear)) || 0,
    durationMonths: Math.round(Number(p.durationMonths)) || 0,
    progressPercentage: Number(p.progressPercentage ?? 0),
    description: p.description ?? '',
  };
}

export function contributionsToRows(
  projectId: string,
  items: ContributingDepartment[],
): (typeof projectContributions.$inferInsert)[] {
  return items.map((c) => ({
    projectId,
    departmentId: c.departmentId,
    sharePercentage: Number(c.sharePercentage ?? 0),
    shareAmountToman: Math.round(Number(c.shareAmountToman)) || 0,
    roleDescription: c.roleDescription ?? null,
  }));
}

/**
 * Upsert a project together with its contribution rows: three statements
 * on one connection. Invokable standalone (the POST/PUT routes) or as
 * part of a larger transaction (seed, import) via the `executor` argument
 * — being inside a transaction, it becomes a savepoint automatically.
 */
export async function upsertProject(p: ExecutiveProject, actorId: string, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    await executor.transaction(async (tx) => {
      const row = projectToRow(p, actorId);
      await tx.insert(projects).values(row).onConflictDoUpdate({ target: projects.id, set: row });

      await tx.delete(projectContributions).where(eq(projectContributions.projectId, p.id));
      const contributions = p.contributingDepartments ?? [];
      if (contributions.length > 0) {
        await tx.insert(projectContributions).values(contributionsToRows(p.id, contributions));
      }
    });
  });
}

/**
 * Status patch as a *real* partial update — the legacy implementation
 * loaded, mutated and re-saved a whole document; typed columns let the
 * UPDATE be one column wide.
 */
export async function updateProjectStatus(
  id: string,
  status: ExecutiveProject['status'],
): Promise<ExecutiveProject | undefined> {
  return withDbErrorMapping(async () => {
    const updated = await db
      .update(projects)
      .set({ status })
      .where(eq(projects.id, id))
      .returning({ id: projects.id });
    if (updated.length === 0) return undefined;
    return getProject(id);
  });
}

/**
 * Delete cascades the junction rows (schema policy). Referenced parents
 * do NOT cascade — deleting a department that still owns projects fails
 * with the mapped ReferentialViolationError (409).
 */
export async function deleteProject(id: string): Promise<boolean> {
  return withDbErrorMapping(async () => {
    const deleted = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning({ id: projects.id });
    return deleted.length > 0;
  });
}
