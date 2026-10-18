/* =========================================================================
   Shared repository helpers.

   Repositories are the *only* modules that build SQL. Everything dictated
   by safety and reuse — whitelist-based sorting, NaN-immune pagination,
   the not-found assertion — lives here so the individual repositories
   stay short and their shapes comparable.
   ========================================================================= */

import { asc, desc } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { NotFoundError } from '../errors.js';
import type { Tx } from '../client.js';
import type { DrizzleDb } from '../client.js';

export type { DrizzleDb, Tx };

/** Constraints accepted by list-style repository methods. */
export interface ListOptions {
  /** Field name to sort by — validated against the repository's whitelist. */
  orderBy?: string;
  descending?: boolean;
  /** `undefined` keeps the full result set (what the legacy API serves). */
  limit?: number;
  offset?: number;
}

export interface Page<K> {
  items: K[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Build an ORDER BY expression from a per-repository whitelist: the client
 * can never name a column that does not exist, and can never inject SQL —
 * the mapping (camelCase DTO field → real column) is server-owned.
 */
export function orderExpression(
  allowed: Record<string, PgColumn>,
  options: Pick<ListOptions, 'orderBy' | 'descending'> | undefined,
  fallback: PgColumn,
): ReturnType<typeof asc> {
  const requested = options?.orderBy?.trim();
  const column = requested && Object.hasOwn(allowed, requested) ? allowed[requested] : fallback;
  return options?.descending ? desc(column) : asc(column);
}

/**
 * Assert presence for a `get`-style result. Returns the narrowed value or
 * throws the mapped NotFoundError (routes translate to HTTP 404).
 */
export function assertFound<T>(entity: string, id: string, value: T | null | undefined): T {
  if (value === null || value === undefined) throw new NotFoundError(entity, id);
  return value;
}

/** Positive-integer clamp used by everything that takes a limit. */
export function safeLimit(value: number | undefined, fallback: number, ceiling: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(Math.floor(value), ceiling));
}
