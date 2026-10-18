/**
 * Minimal ambient types for the subset of `bun:sqlite` used by
 * scripts/db-import-sqlite.ts.
 *
 * Kept local on purpose: `@types/bun` would introduce a second global type
 * surface alongside `@types/node` (both declare `Bun`, timers, streams…), and
 * this project only needs the four members below. If the scripts ever grow to
 * use more of the Bun API, replacing this file with `bun add -d @types/bun` is
 * the better move.
 *
 * Reference: https://bun.sh/docs/api/sqlite
 */
declare module 'bun:sqlite' {
  export interface Statement<T = unknown> {
    all(...params: unknown[]): T[];
    get(...params: unknown[]): T | null;
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  }

  export interface DatabaseOptions {
    /** Open the file read-only. Defaults to false. */
    readonly?: boolean;
    /** Create the file when it does not exist. Defaults to true. */
    create?: boolean;
    readwrite?: boolean;
    strict?: boolean;
  }

  export class Database {
    constructor(filename: string, options?: DatabaseOptions);
    query<T = unknown>(sql: string): Statement<T>;
    prepare<T = unknown>(sql: string): Statement<T>;
    run(sql: string, ...params: unknown[]): void;
    close(throwOnError?: boolean): void;
  }
}
