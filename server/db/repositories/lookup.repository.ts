/* =========================================================================
   Lookup repositories — departments, budget sources, crises/harms,
   executors, contractors.

   Five entities whose contracts are identical (list / upsert / delete)
   would invite five near-duplicate files; keeping them side by side in
   one module makes the shared mechanics reviewable while each mapping
   stays explicit. All list flows are single-table reads — no joins — and
   all writes are upserts, so bulk data movement stays idempotent.
   ========================================================================= */

import { asc, eq } from 'drizzle-orm';
import type {
  BudgetSource,
  Contractor,
  ContractorGrade,
  CrisisHarmItem,
  Department,
  ExecutorType,
  ProjectExecutor,
  AdministrativeLevel,
  BudgetSourceType,
  UrgencyLevel,
} from '../../../src/types.js';
import { withDbErrorMapping } from '../errors.js';
import { db, type DrizzleDb, type Tx } from '../client.js';
import { budgetSources, contractors, crisesHarms, departments, executors } from '../schema.js';

type Executor = DrizzleDb | Tx;

/* =========================================================================
   Departments
   ========================================================================= */
export async function listDepartments(): Promise<Department[]> {
  return withDbErrorMapping(async () => {
    const rows = await db.select().from(departments).orderBy(asc(departments.id));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      category: row.category as Department['category'],
      categoryFa: row.categoryFa,
      headPersonName: row.headPersonName,
      contactNumber: row.contactNumber,
      email: row.email ?? undefined,
      logoDataUrl: row.logoDataUrl ?? undefined,
      allocatedBudgetToman: row.allocatedBudgetToman,
      absorbedBudgetToman: row.absorbedBudgetToman,
      activeProjectsCount: row.activeProjectsCount,
      performanceScore: row.performanceScore,
      administrativeLevel: row.administrativeLevel as AdministrativeLevel,
      province: row.province,
      county: row.county ?? undefined,
      description: row.description,
    }));
  });
}

function departmentToRow(d: Department, actorId: string): typeof departments.$inferInsert {
  return {
    id: d.id,
    name: d.name,
    code: d.code,
    category: d.category,
    categoryFa: d.categoryFa,
    headPersonName: d.headPersonName,
    contactNumber: d.contactNumber,
    email: d.email ?? null,
    logoDataUrl: d.logoDataUrl ?? null,
    allocatedBudgetToman: Math.round(Number(d.allocatedBudgetToman)) || 0,
    absorbedBudgetToman: Math.round(Number(d.absorbedBudgetToman)) || 0,
    activeProjectsCount: Math.round(Number(d.activeProjectsCount)) || 0,
    performanceScore: Number(d.performanceScore ?? 0),
    administrativeLevel: d.administrativeLevel,
    province: d.province,
    county: d.county ?? null,
    description: d.description ?? '',
    createdByUserId: actorId,
  };
}

export async function upsertDepartment(d: Department, actorId: string, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    const row = departmentToRow(d, actorId);
    await executor.insert(departments).values(row).onConflictDoUpdate({ target: departments.id, set: row });
  });
}

export async function deleteDepartment(id: string): Promise<boolean> {
  return withDbErrorMapping(async () => {
    const deleted = await db.delete(departments).where(eq(departments.id, id)).returning({ id: departments.id });
    return deleted.length > 0;
  });
}

/* =========================================================================
   Budget sources
   ========================================================================= */
export async function listBudgetSources(): Promise<BudgetSource[]> {
  return withDbErrorMapping(async () => {
    const rows = await db.select().from(budgetSources).orderBy(asc(budgetSources.id));
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      code: row.code,
      sourceType: row.sourceType as BudgetSourceType,
      sourceTypeFa: row.sourceTypeFa,
      totalAmountToman: row.totalAmountToman,
      allocatedAmountToman: row.allocatedAmountToman,
      remainingAmountToman: row.remainingAmountToman,
      fiscalYear: row.fiscalYear,
      sponsorOrganization: row.sponsorOrganization,
      targetScope: row.targetScope,
      restrictionNote: row.restrictionNote ?? undefined,
      status: row.status as BudgetSource['status'],
      province: row.province ?? undefined,
      county: row.county ?? undefined,
    }));
  });
}

function budgetSourceToRow(s: BudgetSource, actorId: string): typeof budgetSources.$inferInsert {
  return {
    id: s.id,
    title: s.title,
    code: s.code,
    sourceType: s.sourceType,
    sourceTypeFa: s.sourceTypeFa,
    totalAmountToman: Math.round(Number(s.totalAmountToman)) || 0,
    allocatedAmountToman: Math.round(Number(s.allocatedAmountToman)) || 0,
    remainingAmountToman: Math.round(Number(s.remainingAmountToman)) || 0,
    fiscalYear: s.fiscalYear,
    sponsorOrganization: s.sponsorOrganization,
    targetScope: s.targetScope,
    restrictionNote: s.restrictionNote ?? null,
    status: s.status,
    province: s.province ?? null,
    county: s.county ?? null,
    createdByUserId: actorId,
  };
}

export async function upsertBudgetSource(s: BudgetSource, actorId: string, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    const row = budgetSourceToRow(s, actorId);
    await executor.insert(budgetSources).values(row).onConflictDoUpdate({ target: budgetSources.id, set: row });
  });
}

export async function deleteBudgetSource(id: string): Promise<boolean> {
  return withDbErrorMapping(async () => {
    const deleted = await db.delete(budgetSources).where(eq(budgetSources.id, id)).returning({ id: budgetSources.id });
    return deleted.length > 0;
  });
}

/* =========================================================================
   Crises & harms
   ========================================================================= */
export async function listCrisesHarms(): Promise<CrisisHarmItem[]> {
  return withDbErrorMapping(async () => {
    const rows = await db.select().from(crisesHarms).orderBy(asc(crisesHarms.id));
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      code: row.code,
      category: row.category,
      level: row.level as AdministrativeLevel,
      province: row.province,
      county: row.county,
      districtOrVillage: row.districtOrVillage,
      severityScore: row.severityScore,
      urgency: row.urgency as UrgencyLevel,
      affectedPopulation: row.affectedPopulation,
      primaryCause: row.primaryCause,
      recommendedIntervention: row.recommendedIntervention,
      status: row.status as CrisisHarmItem['status'],
      activeProjectsCount: row.activeProjectsCount,
      deficitIndexFa: row.deficitIndexFa,
    }));
  });
}

function crisisHarmToRow(c: CrisisHarmItem, actorId: string): typeof crisesHarms.$inferInsert {
  return {
    id: c.id,
    title: c.title,
    code: c.code,
    category: c.category,
    level: c.level,
    province: c.province,
    county: c.county,
    districtOrVillage: c.districtOrVillage,
    severityScore: Number(c.severityScore ?? 0),
    urgency: c.urgency,
    affectedPopulation: Math.round(Number(c.affectedPopulation)) || 0,
    primaryCause: c.primaryCause,
    recommendedIntervention: c.recommendedIntervention,
    status: c.status,
    activeProjectsCount: Math.round(Number(c.activeProjectsCount)) || 0,
    deficitIndexFa: c.deficitIndexFa,
    createdByUserId: actorId,
  };
}

export async function upsertCrisisHarm(c: CrisisHarmItem, actorId: string, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    const row = crisisHarmToRow(c, actorId);
    await executor.insert(crisesHarms).values(row).onConflictDoUpdate({ target: crisesHarms.id, set: row });
  });
}

export async function deleteCrisisHarm(id: string): Promise<boolean> {
  return withDbErrorMapping(async () => {
    const deleted = await db.delete(crisesHarms).where(eq(crisesHarms.id, id)).returning({ id: crisesHarms.id });
    return deleted.length > 0;
  });
}

/* =========================================================================
   Executors
   ========================================================================= */
export async function listExecutors(): Promise<ProjectExecutor[]> {
  return withDbErrorMapping(async () => {
    const rows = await db.select().from(executors).orderBy(asc(executors.id));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      type: row.type as ExecutorType,
      typeFa: row.typeFa,
      managingDirector: row.managingDirector,
      contactPhone: row.contactPhone,
      activeProjectsCount: row.activeProjectsCount,
      completedProjectsCount: row.completedProjectsCount,
      successRate: row.successRate,
      capacityStatus: row.capacityStatus as ProjectExecutor['capacityStatus'],
      coverageRegion: row.coverageRegion,
      province: row.province ?? undefined,
      county: row.county ?? undefined,
    }));
  });
}

function executorToRow(e: ProjectExecutor, actorId: string): typeof executors.$inferInsert {
  return {
    id: e.id,
    name: e.name,
    code: e.code,
    type: e.type,
    typeFa: e.typeFa,
    managingDirector: e.managingDirector,
    contactPhone: e.contactPhone,
    activeProjectsCount: Math.round(Number(e.activeProjectsCount)) || 0,
    completedProjectsCount: Math.round(Number(e.completedProjectsCount)) || 0,
    successRate: Number(e.successRate ?? 0),
    capacityStatus: e.capacityStatus,
    coverageRegion: e.coverageRegion,
    province: e.province ?? null,
    county: e.county ?? null,
    createdByUserId: actorId,
  };
}

export async function upsertExecutor(e: ProjectExecutor, actorId: string, executorDb: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    const row = executorToRow(e, actorId);
    await executorDb.insert(executors).values(row).onConflictDoUpdate({ target: executors.id, set: row });
  });
}

export async function deleteExecutor(id: string): Promise<boolean> {
  return withDbErrorMapping(async () => {
    const deleted = await db.delete(executors).where(eq(executors.id, id)).returning({ id: executors.id });
    return deleted.length > 0;
  });
}

/* =========================================================================
   Contractors
   ========================================================================= */
export async function listContractors(): Promise<Contractor[]> {
  return withDbErrorMapping(async () => {
    const rows = await db.select().from(contractors).orderBy(asc(contractors.id));
    return rows.map((row) => ({
      id: row.id,
      companyName: row.companyName,
      ceoName: row.ceoName,
      nationalId: row.nationalId,
      grade: row.grade as ContractorGrade,
      gradeFa: row.gradeFa,
      specialtyField: row.specialtyField,
      activeContractsCount: row.activeContractsCount,
      totalContractValueToman: row.totalContractValueToman,
      performanceScore: row.performanceScore,
      satisfactionRating: row.satisfactionRating,
      freeCapacitySlots: row.freeCapacitySlots,
      phone: row.phone,
      status: row.status as Contractor['status'],
      province: row.province ?? undefined,
      county: row.county ?? undefined,
    }));
  });
}

function contractorToRow(c: Contractor, actorId: string): typeof contractors.$inferInsert {
  return {
    id: c.id,
    companyName: c.companyName,
    ceoName: c.ceoName,
    nationalId: c.nationalId,
    grade: c.grade,
    gradeFa: c.gradeFa,
    specialtyField: c.specialtyField,
    activeContractsCount: Math.round(Number(c.activeContractsCount)) || 0,
    totalContractValueToman: Math.round(Number(c.totalContractValueToman)) || 0,
    performanceScore: Number(c.performanceScore ?? 0),
    satisfactionRating: Number(c.satisfactionRating ?? 1),
    freeCapacitySlots: Math.round(Number(c.freeCapacitySlots)) || 0,
    phone: c.phone,
    status: c.status,
    province: c.province ?? null,
    county: c.county ?? null,
    createdByUserId: actorId,
  };
}

export async function upsertContractor(c: Contractor, actorId: string, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    const row = contractorToRow(c, actorId);
    await executor.insert(contractors).values(row).onConflictDoUpdate({ target: contractors.id, set: row });
  });
}

export async function deleteContractor(id: string): Promise<boolean> {
  return withDbErrorMapping(async () => {
    const deleted = await db.delete(contractors).where(eq(contractors.id, id)).returning({ id: contractors.id });
    return deleted.length > 0;
  });
}
