/* =========================================================================
   Audit log repository — the append-only trail.

   `seq` (GENERATED ALWAYS AS IDENTITY) replaces SQLite's rowid: upserts
   never write it, so "newest first" ordering survives updates and the
   identity value allocates only on insert, no concurrent gaps matter.
   ========================================================================= */

import { desc, eq, sql, type SQL } from 'drizzle-orm';
import type { AuditLogItem } from '../../../src/types.js';
import { withDbErrorMapping } from '../errors.js';
import { db, type DrizzleDb, type Tx } from '../client.js';
import { auditLogs } from '../schema.js';

type Executor = DrizzleDb | Tx;

/**
 * Newest-first page (the legacy endpoint's only ordering), with the limit
 * clamped server-side rather than trusting the query string.
 */
export async function listAuditLogs(limit = 200): Promise<AuditLogItem[]> {
  return withDbErrorMapping(async () => {
    const safe = Math.max(1, Math.min(Math.floor(Number(limit) || 200), 1000));
    const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.seq)).limit(safe);
    return rows.map(toDto);
  });
}

/**
 * Filtered audit page combining the two indexes the schema declares:
 * optional exact match on action type, and optional province/county scope
 * matching the UI's location filter (national records have neither).
 */
export async function pageAuditLogs(options: {
  actionType?: string;
  province?: string;
  county?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: AuditLogItem[]; total: number }> {
  return withDbErrorMapping(async () => {
    const clauses: SQL[] = [];
    if (options.actionType) clauses.push(eq(auditLogs.actionType, options.actionType) as SQL);
    if (options.province) clauses.push(eq(auditLogs.province, options.province) as SQL);
    if (options.county) clauses.push(eq(auditLogs.county, options.county) as SQL);

    const predicate = clauses.length > 0 ? (clauses.length === 1 ? clauses[0] : sql.join(clauses, sql.raw(' AND '))) : undefined;
    const safe = Math.max(1, Math.min(Math.floor(Number(options.limit) || 200), 1000));

    // One round trip: the window function computes the qualifying total
    // across *all* matching rows while LIMIT slices the page.
    const rows = await db
      .select({
        row: auditLogs,
        total: sql<number>`count(*) over ()`.mapWith(Number),
      })
      .from(auditLogs)
      .where(predicate)
      .orderBy(desc(auditLogs.seq))
      .limit(safe)
      .offset(Math.max(0, Math.floor(Number(options.offset) || 0)));

    return { items: rows.map((r) => toDto(r.row)), total: rows[0]?.total ?? 0 };
  });
}

function toDto(row: typeof auditLogs.$inferSelect): AuditLogItem {
  return {
    id: row.id,
    timestamp: row.timestamp,
    userName: row.userName,
    userRole: row.userRole as AuditLogItem['userRole'],
    actionType: row.actionType as AuditLogItem['actionType'],
    targetPriorityTitle: row.targetPriorityTitle ?? undefined,
    oldValue: row.oldValue ?? undefined,
    newValue: row.newValue ?? undefined,
    rationale: row.rationale ?? undefined,
    province: row.province ?? undefined,
    county: row.county ?? undefined,
  };
}

/** `actorId` is the verified session identity (JWT `sub`) — server-stamped;
 *  `userName`/`userRole` remain display values carried by the entry. */
export async function addAuditLog(entry: AuditLogItem, actorId: string, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    const row: typeof auditLogs.$inferInsert = {
      id: entry.id,
      timestamp: entry.timestamp,
      actorUserId: actorId,
      userName: entry.userName,
      userRole: entry.userRole,
      actionType: entry.actionType,
      targetPriorityTitle: entry.targetPriorityTitle ?? null,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      rationale: entry.rationale ?? null,
      province: entry.province ?? null,
      county: entry.county ?? null,
    };
    await executor.insert(auditLogs).values(row).onConflictDoUpdate({ target: auditLogs.id, set: row });
  });
}
