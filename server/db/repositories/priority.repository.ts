/* =========================================================================
   Priority repository — the CSR budget axes.

   Demonstrates the pattern for an entity with a *bulk replace* contract
   (the CSV/Excel import flow): delete + insert inside one transaction so
   an import is all-or-nothing.
   ========================================================================= */

import { asc, eq, sql } from 'drizzle-orm';
import type { CsrPriority } from '../../../src/types.js';
import { withDbErrorMapping } from '../errors.js';
import { db, type DrizzleDb, type Tx } from '../client.js';
import { priorities } from '../schema.js';

type PriorityExecutor = DrizzleDb | Tx;

type PriorityInsert = typeof priorities.$inferInsert;

/** DTO → row (storage-bound). Undefined optionals become column defaults/nulls.
 *  `actorId` is the verified author identity — never a client-supplied field. */
export function priorityToRow(p: CsrPriority, actorId: string): PriorityInsert {
  return {
    id: p.id,
    createdByUserId: actorId,
    code: Math.round(Number(p.code)),
    title: p.title,
    description: p.description ?? '',
    category: p.category ?? '',
    defaultPercentage: Number(p.defaultPercentage ?? 0),
    currentPercentage: Number(p.currentPercentage ?? 0),
    recommendedPercentage: p.recommendedPercentage ?? null,
    isLocked: p.isLocked ?? false,
    isActive: p.isActive ?? true,
    relatedIndicators: p.relatedIndicators ?? [],
    iconName: p.iconName ?? '',
    weightFactor: p.weightFactor ?? null,
    minPercent: p.minPercent ?? null,
    maxPercent: p.maxPercent ?? null,
    subItems: p.subItems ?? [],
  };
}

/** Row → DTO (read-bound). Column defaults restore the missing optionals. */
function toDto(row: typeof priorities.$inferSelect): CsrPriority {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    category: row.category,
    defaultPercentage: row.defaultPercentage,
    currentPercentage: row.currentPercentage,
    recommendedPercentage: row.recommendedPercentage ?? undefined,
    isLocked: row.isLocked,
    isActive: row.isActive,
    relatedIndicators: row.relatedIndicators,
    iconName: row.iconName,
    weightFactor: row.weightFactor ?? undefined,
    minPercent: row.minPercent ?? undefined,
    maxPercent: row.maxPercent ?? undefined,
    subItems: row.subItems,
  };
}

const MAX_INSERT_PARAMS = 60_000; // bind-parameter ceiling per statement
const PRIORITY_COLUMNS = 16;
const CHUNK_SIZE = Math.max(1, Math.floor(MAX_INSERT_PARAMS / PRIORITY_COLUMNS));

export async function listPriorities(): Promise<CsrPriority[]> {
  return withDbErrorMapping(async () => {
    const rows = await db.select().from(priorities).orderBy(asc(priorities.code));
    return rows.map(toDto);
  });
}

export async function getPriority(id: string): Promise<CsrPriority | undefined> {
  return withDbErrorMapping(async () => {
    const [row] = await db.select().from(priorities).where(eq(priorities.id, id)).limit(1);
    return row ? toDto(row) : undefined;
  });
}

export async function upsertPriority(p: CsrPriority, actorId: string, executor: PriorityExecutor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    const row = priorityToRow(p, actorId);
    await executor.insert(priorities).values(row).onConflictDoUpdate({ target: priorities.id, set: { ...row, id: undefined } });
  });
}

/** Returns true when a row with this id existed and is now gone. */
export async function deletePriority(id: string): Promise<boolean> {
  return withDbErrorMapping(async () => {
    const deleted = await db.delete(priorities).where(eq(priorities.id, id)).returning({ id: priorities.id });
    return deleted.length > 0;
  });
}

/**
 * Replace the whole priority set in one transaction: the CSV import flow
 * expects "everything included in the file, nothing carried over".
 */
export async function replaceAllPriorities(items: CsrPriority[], actorId: string): Promise<void> {
  return withDbErrorMapping(async () => {
    await db.transaction(async (tx) => {
      await tx.delete(priorities);
      for (let offset = 0; offset < items.length; offset += CHUNK_SIZE) {
        const chunk = items.slice(offset, offset + CHUNK_SIZE).map((p) => priorityToRow(p, actorId));
        await tx.insert(priorities).values(chunk);
      }
    });
  });
}

/**
 * SQL-side pagination on an otherwise server-filtered entity (usage demo
 * for the layer; the routes still serve full lists for compatibility).
 * Returns the page plus the total count in a single round trip using a
 * window function — no second COUNT(*) query.
 */
export async function pagePriorities(page: number, pageSize: number): Promise<{ items: CsrPriority[]; total: number }> {
  return withDbErrorMapping(async () => {
    const safe = Math.max(1, pageSize);
    const rows = await db
      .select({
        item: priorities,
        total: sql<number>`count(*) over ()`.mapWith(Number),
      })
      .from(priorities)
      .orderBy(asc(priorities.code))
      .limit(safe)
      .offset(Math.max(0, page) * safe);
    return {
      items: rows.map((r) => toDto(r.item)),
      total: rows[0]?.total ?? 0,
    };
  });
}

export async function countPriorities(): Promise<number> {
  const [row] = await db.select({ value: sql<number>`count(*)`.mapWith(Number) }).from(priorities);
  return row?.value ?? 0;
}
