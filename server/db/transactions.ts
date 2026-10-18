/* =========================================================================
   Transaction helpers.

   * `withTransaction` — one pooled client, explicit BEGIN/COMMIT, rollback
     on any throw, mapping of database errors into the typed classes.
   * `withTransactionRetrying` — same, plus an automatic retry loop for the
     two PostgreSQL conditions that are *transaction-level race* failures:
     SERIALIZATION_FAILURE (40001) and DEADLOCK_DETECTED (40P01). The
     retry reruns the whole callback from the start, so it must only be
     given work whose steps are all inside the transaction body.
   * `withSavepoint` — nested transaction. Drizzle issues a SAVEPOINT per
     nesting level on the same connection, so a caller can treat part of
     an outer unit of work as independently abortable without rolling
     back everything.
   ========================================================================= */

import { isRetryableTransactionError, mapDbError } from './errors.js';
import { db, type Tx } from './client.js';

/** Run `fn` in a serialized transaction, rolling back on any throw. */
export async function withTransaction<T>(executor: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    // Drizzle opens BEGIN, commits on resolution, rolls back on rejection,
    // and guarantees `client.release()` on the underlying pool client.
    return await db.transaction(executor);
  } catch (error) {
    throw mapDbError(error);
  }
}

export interface RetryOptions {
  /** Attempts before giving up with a 503 (approximate). */
  attempts?: number;
  /** Base backoff duration; doubles each retry (+jitter). */
  baseDelayMs?: number;
}

/**
 * Rerun a transaction on serialization failures and deadlocks (the two SQL
 * states PostgreSQL marks as retryable "please try again" races).
 * Backoff is exponential with jitter so starving contenders spread out.
 */
export async function withTransactionRetrying<T>(
  executor: (tx: Tx) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 5);
  const baseDelayMs = options.baseDelayMs ?? 50;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await withTransaction(executor);
    } catch (error) {
      const retryable = isRetryableTransactionError(error);
      if (!retryable || attempt === attempts) throw error;
      const jitter = 1 + Math.random();
      await new Promise((resolve) => setTimeout(resolve, Math.round(baseDelayMs * 2 ** (attempt - 1) * jitter)));
      console.warn(`[db] Retrying retryable transaction (attempt ${attempt + 1}/${attempts}): ${(error as Error).message}`);
    }
  }
  throw new Error('unreachable');
}

/**
 * `withTransaction` but for work that already sits inside an outer
 * transaction and should only abort *itself* when it fails. Drizzle maps
 * this to a PostgreSQL SAVEPOINT — nesting depth is bounded only by the
 * connection's capacity, mirroring standard relational practice.
 */
export async function withSavepoint<T>(transaction: Tx, executor: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await transaction.transaction(executor);
  } catch (error) {
    throw mapDbError(error);
  }
}
