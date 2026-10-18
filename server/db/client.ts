/* =========================================================================
   The single Drizzle client, bound to the previously established
   environment-driven connection pool (server/config.ts — unchanged).

   One module owns the pool and every derived client so a connection can
   appear in exactly one way across server, CLI scripts and Docker.
   ========================================================================= */

import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { loadDatabaseConfig, type DatabaseSettings } from '../config.js';
import * as schema from './schema.js';

const settings: DatabaseSettings = loadDatabaseConfig();

export const pool = new Pool(settings.pool);

/**
 * An error on an *idle* client is emitted by the pool rather than by a
 * query. Without this listener Node treats it as an unhandled 'error'
 * event and kills the process — exactly the failure mode you do not want
 * when the database restarts underneath a running container.
 */
pool.on('error', (error) => {
  console.error('[db] Idle client error:', error.message);
});

/**
 * `casing: 'snake_case'` applies the same per-property name mapping as
 * drizzle-kit does at migration time (drizzle.config.ts), so the schema
 * stays nameless-column ("camelCase properties → snake_case columns") and
 * never hard-codes column strings twice.
 */
export const db: NodePgDatabase<typeof schema> = drizzle(pool, {
  schema,
  casing: 'snake_case',
});

export { schema };
export type DrizzleDb = NodePgDatabase<typeof schema>;

/** A transaction handle — subset of the database API with rollback semantics. */
export type Tx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

/** Either the root client or the current transaction: repos accept both. */
export type Executor = DrizzleDb | Tx;

/** Where the app is connected, with the password removed. Safe to log. */
export function getDatabaseTarget(): string {
  return settings.target;
}

export function getPoolStats(): { total: number; idle: number; waiting: number } {
  return { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount };
}

export type DatabaseHealth = {
  ok: boolean;
  latencyMs: number;
  /** Number of applied drizzle migrations — "how evolved is this schema". */
  schemaVersion: string | null;
  error?: string;
};

/** Never throws: the health endpoint reports a degraded state instead. */
export async function checkDatabase(): Promise<DatabaseHealth> {
  const started = Date.now();
  try {
    // The drizzle journal table exists only after the first migration —
    // parse-time resolution would fail straight into the catch below, so a
    // rejected probe simply reports 0 applied migrations.
    const probe = await db
      .execute<{ applied: number }>(sql`SELECT count(*)::int AS applied FROM drizzle.__drizzle_migrations`)
      .catch(() => undefined);
    const rows = probe as { rows: { applied: number }[] } | undefined;
    const applied = Number(rows?.rows?.[0]?.applied ?? 0);
    return { ok: true, latencyMs: Date.now() - started, schemaVersion: String(applied) };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      schemaVersion: null,
      error: (error as Error).message,
    };
  }
}

/** Wait until the server responds, or give up after `timeoutMs`. */
export async function waitForDatabase(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let delay = 250;
  for (;;) {
    try {
      await db.execute(sql`SELECT 1`);
      return;
    } catch (error) {
      if (Date.now() >= deadline) {
        throw new Error(
          `[db] PostgreSQL not reachable at ${settings.target} after ${timeoutMs}ms: ${(error as Error).message}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 3_000);
    }
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
