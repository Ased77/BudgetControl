/* =========================================================================
   Analysis sources repository — engine inputs with human review state.
   ========================================================================= */

import { asc, eq } from 'drizzle-orm';
import type { AnalysisSource } from '../../../src/types.js';
import { withDbErrorMapping } from '../errors.js';
import { db, type DrizzleDb, type Tx } from '../client.js';
import { analysisSources } from '../schema.js';

type Executor = DrizzleDb | Tx;

/**
 * Order by the identity column, i.e. insertion order — but unlike the
 * legacy document model, a *filter on status* is a plain SQL `where` on
 * an indexed column, so reviewing the pending queue stays one indexed read.
 */
export async function listAnalysisSources(options: { status?: string } = {}): Promise<AnalysisSource[]> {
  return withDbErrorMapping(async () => {
    const predicate = options.status ? eq(analysisSources.status, options.status) : undefined;
    const rows = await db
      .select()
      .from(analysisSources)
      .where(predicate)
      .orderBy(asc(analysisSources.seq));
    return rows.map(toDto);
  });
}

function toDto(row: typeof analysisSources.$inferSelect): AnalysisSource {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    origin: row.origin as AnalysisSource['origin'],
    kind: row.kind as AnalysisSource['kind'],
    provider: row.provider,
    sourceUrl: row.sourceUrl ?? undefined,
    publishedAt: row.publishedAt,
    linkedAreas: row.linkedAreas,
    reliabilityScore: row.reliabilityScore,
    status: row.status as AnalysisSource['status'],
    reviewedBy: row.reviewedBy ?? undefined,
    reviewNote: row.reviewNote ?? undefined,
    province: row.province,
    county: row.county,
    createdAt: row.createdAt,
  };
}

export function analysisSourceToRow(s: AnalysisSource, actorId: string): typeof analysisSources.$inferInsert {
  return {
    id: s.id,
    title: s.title,
    summary: s.summary,
    origin: s.origin,
    kind: s.kind,
    provider: s.provider,
    sourceUrl: s.sourceUrl ?? null,
    publishedAt: s.publishedAt,
    linkedAreas: s.linkedAreas ?? [],
    reliabilityScore: Number(s.reliabilityScore ?? 0),
    status: s.status,
    reviewedBy: s.reviewedBy ?? null,
    reviewNote: s.reviewNote ?? null,
    province: s.province,
    county: s.county,
    createdAt: s.createdAt,
    actorUserId: actorId,
  };
}

/** Insert-or-replace; the identity `seq` is never written (always generated). */
export async function upsertAnalysisSource(s: AnalysisSource, actorId: string, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    const row = analysisSourceToRow(s, actorId);
    await executor
      .insert(analysisSources)
      .values(row)
      .onConflictDoUpdate({ target: analysisSources.id, set: row });
  });
}

export async function deleteAnalysisSource(id: string): Promise<boolean> {
  return withDbErrorMapping(async () => {
    const deleted = await db
      .delete(analysisSources)
      .where(eq(analysisSources.id, id))
      .returning({ id: analysisSources.id });
    return deleted.length > 0;
  });
}
