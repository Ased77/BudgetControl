/* =========================================================================
   Typed database errors.

   Raw `pg`/Drizzle errors are class-by-protocol; routes need decisions
   ("409", "retry?"). This module unwraps the error cause chain (Drizzle
   wraps the driver error in DrizzleQueryError since 0.31), reads the SQL
   error code of PostgreSQL ERRORS AND translates the cases the API has to
   handle:

     23505  unique_violation        → ConflictError                    (409)
     23503  foreign_key_violation   → ReferentialViolationError        (409)
     40001  serialization_failure   → retryable                        (503)
     40P01  deadlock_detected       → retryable                        (503)
     57014  query_canceled          → StatementTimeoutError            (503)
            (what `statement_timeout` raises)

   Every repository wraps its persistence calls with `withDbErrorMapping`
   so the transport layer deals with these classes, never with `pg`.
   ========================================================================= */

/** PostgreSQL SQLSTATE codes the application distinguishes. */
export const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  SERIALIZATION_FAILURE: '40001',
  DEADLOCK_DETECTED: '40P01',
  QUERY_CANCELED: '57014',
} as const;

export interface MappedError {
  readonly status: number;
  readonly retryable: boolean;
  readonly pgCode?: string;
  readonly constraint?: string;
  readonly table?: string;
  readonly detail?: string;
}

/** The driver-shaped subset repositories/tests introspect after mapping. */
export type RawPgErrorFields = Omit<MappedError, 'status' | 'retryable'>;

export class DbError extends Error implements MappedError {
  /** HTTP suitcase, mutably assigned by the concrete subclasses. */
  status: number;
  retryable: boolean;
  readonly pgCode?: string;
  readonly constraint?: string;
  readonly table?: string;
  readonly detail?: string;

  constructor(message: string, mapped: Omit<MappedError, 'status' | 'retryable'> = {}) {
    super(message);
    this.name = 'DbError';
    this.status = 500;
    this.retryable = false;
    this.pgCode = mapped.pgCode;
    this.constraint = mapped.constraint;
    this.table = mapped.table;
    this.detail = mapped.detail;
  }
}

/** The request addressed something that is not there → 404. */
export class NotFoundError extends DbError {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

/** Tried to write data that violates a UNIQUE constraint → 409. */
export class ConflictError extends DbError {
  constructor(cause: RawPgErrorFields) {
    super(
      `A record with the same unique value already exists${cause.constraint ? ` (constraint: ${cause.constraint})` : ''}`,
      cause,
    );
    this.name = 'ConflictError';
    this.status = 409;
  }
}

/**
 * The DELETE/INSERT/UPDATE would break a relationship that now really
 * exists (normalized model). Better-audited 409 than a silent stale id.
 */
export class ReferentialViolationError extends DbError {
  constructor(cause: RawPgErrorFields) {
    super(
      `This record is still referenced by other records and cannot be written or deleted` +
        `${cause.detail ? ` (${cause.detail})` : ''}`,
      cause,
    );
    this.name = 'ReferentialViolationError';
    this.status = 409;
  }
}

/** serialization failure after exhausting retries / deadlock loser → 503. */
export class TransactionConflictError extends DbError {
  constructor(cause: RawPgErrorFields) {
    super('Concurrent modification detected — please retry the request', cause);
    this.name = 'TransactionConflictError';
    this.status = 503;
    this.retryable = true;
  }
}

/** `PG_STATEMENT_TIMEOUT_MS` bound hit → 503, not a hang. */
export class StatementTimeoutError extends DbError {
  constructor(cause: RawPgErrorFields) {
    super('The database statement exceeded its time limit', cause);
    this.name = 'StatementTimeoutError';
    this.status = 503;
  }
}

/**
 * Walk the error `cause` chain (bounded depth) looking for something with a
 * PostgreSQL-style SQLSTATE `code` property, attached by node-postgres.
 */
function unwrapPgError(error: unknown, depth = 0): (RawPgErrorFields & { code: string }) | undefined {
  if (error === null || error === undefined || depth > 5 || typeof error !== 'object') return undefined;
  const candidate = error as { code?: unknown; cause?: unknown; constraint?: unknown; table?: unknown; detail?: unknown };

  if (typeof candidate.code === 'string' && /^([0-9]{5}|[0-9A-Z]{5})$/.test(candidate.code)) {
    return {
      code: candidate.code,
      constraint: typeof candidate.constraint === 'string' ? candidate.constraint : undefined,
      table: typeof candidate.table === 'string' ? candidate.table : undefined,
      detail: typeof candidate.detail === 'string' ? candidate.detail : undefined,
    };
  }
  return unwrapPgError(candidate.cause, depth + 1);
}

/**
 * Translate a raw persistence error into one of the typed classes above.
 * Unknown/unmapped errors pass through unchanged (a programming or
 * connectivity bug is *not* disguised into a query-shaped failure).
 */
export function mapDbError(error: unknown): unknown {
  const pg = unwrapPgError(error);
  if (!pg) return error;

  switch (pg.code) {
    case PG_ERROR_CODES.UNIQUE_VIOLATION:
      return new ConflictError(pg);
    case PG_ERROR_CODES.FOREIGN_KEY_VIOLATION:
      return new ReferentialViolationError(pg);
    case PG_ERROR_CODES.SERIALIZATION_FAILURE:
    case PG_ERROR_CODES.DEADLOCK_DETECTED:
      return new TransactionConflictError(pg);
    case PG_ERROR_CODES.QUERY_CANCELED:
      return new StatementTimeoutError(pg);
    default:
      return error;
  }
}

/** `fn` returning a promise, all rejections mapped through `mapDbError`. */
export async function withDbErrorMapping<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw mapDbError(error);
  }
}

/** Is this error transient enough to be worth re-running the transaction? */
export function isRetryableTransactionError(error: unknown): boolean {
  return error instanceof TransactionConflictError;
}

