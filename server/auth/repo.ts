/* =========================================================================
   Auth repository — every database access behind the identity layer.

   Two jobs:

   1. Identity lookup (login, requireAuth): an app-managed user_id that
      is NOT in this table (or an inactive one) can never authenticate —
      the JWT signature only proves the server once issued a token; this
      table decides whether it may still be trusted.
   2. Refresh-token lifecycle: insert, current state lookup, consumption
      (rotation), and family revocation (reuse detection). All reads of a
      candidate token go through `getRefreshTokenState(tokenHash)`, keyed
      by the hash — never by a client-supplied id.
   ========================================================================= */

import { and, eq, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { withDbErrorMapping } from '../db/errors.js';
import { db, type DrizzleDb, type Tx } from '../db/client.js';
import {
  authOtpChallenges,
  authUsers,
  refreshTokens,
  type AuthUserRow,
  type OtpChallengeRow,
  type RefreshTokenRow,
} from '../db/schema.js';
import { SYSTEM_ACTOR_ID } from '../db/system-actor.js';
import { normalizeMobile } from './mobile.js';
import type { UserRole } from '../../src/types.js';

type Executor = DrizzleDb | Tx;

export interface NewAuthUser {
  id: string;
  /** Already-normalized mobile (server/auth/mobile.ts) — entry points validate. */
  mobile: string;
  passwordHash: string;
  displayName: string;
  role: string;
  departmentId?: string | null;
  allowedLocationId?: string | null;
  province?: string | null;
  county?: string | null;
}

/** The user_id any business row's FK points at: the row that owns identity. */
export function authUserToSession(row: AuthUserRow) {
  return {
    userId: row.id,
    role: row.role as UserRole,
    departmentId: row.departmentId ?? undefined,
    allowedLocationId: row.allowedLocationId ?? undefined,
  };
}

export async function getAuthUserByMobile(mobile: string, executor: Executor = db): Promise<AuthUserRow | undefined> {
  return withDbErrorMapping(async () => {
    // Entry points normalize first, so an exact match on the canonical form
    // is the same case-insensitive-by-construction lookup the old lookup did.
    const rows = await executor.select().from(authUsers).where(eq(authUsers.mobile, mobile)).limit(1);
    return rows[0];
  });
}

export async function getAuthUserById(id: string, executor: Executor = db): Promise<AuthUserRow | undefined> {
  return withDbErrorMapping(async () => {
    const rows = await executor.select().from(authUsers).where(eq(authUsers.id, id)).limit(1);
    return rows[0];
  });
}

export async function insertAuthUser(input: NewAuthUser, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    await executor.insert(authUsers).values({
      id: input.id,
      mobile: input.mobile,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      role: input.role,
      departmentId: input.departmentId ?? null,
      allowedLocationId: input.allowedLocationId ?? null,
      province: input.province ?? null,
      county: input.county ?? null,
    });
  });
}

/** Credentials + scope change, and the single-instant revocation gate. */
export async function updateAuthUser(
  id: string,
  patch: { passwordHash?: string; displayName?: string; role?: string; bumpTokensValidFrom?: boolean },
  executor: Executor = db,
): Promise<void> {
  return withDbErrorMapping(async () => {
    await executor
      .update(authUsers)
      .set({
        ...(patch.passwordHash !== undefined && { passwordHash: patch.passwordHash }),
        ...(patch.displayName !== undefined && { displayName: patch.displayName }),
        ...(patch.role !== undefined && { role: patch.role }),
        ...(patch.bumpTokensValidFrom !== undefined && { tokensValidFrom: new Date() }),
      })
      .where(eq(authUsers.id, id));
  });
}

export async function setActive(id: string, isActive: boolean, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    await executor.update(authUsers).set({ isActive }).where(eq(authUsers.id, id));
  });
}

/** True when no real (non-system) account exists — the bootstrap gate. */
export async function hasRealUsers(executor: Executor = db): Promise<boolean> {
  return withDbErrorMapping(async () => {
    const rows = await executor
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(ne(authUsers.id, SYSTEM_ACTOR_ID))
      .limit(1);
    return rows.length > 0;
  });
}

// ---------------------------------------------------------------------------
// One-time-code challenges
// ---------------------------------------------------------------------------

export interface NewOtpChallenge {
  /** Already-normalized mobile — entry points validate before calling. */
  mobile: string;
  codeHash: string;
  expiresAt: Date;
  sentAt: Date;
}

/** The live challenge for a number, if one was ever issued (expiry not checked here). */
export async function getOtpChallenge(
  mobile: string,
  executor: Executor = db,
): Promise<OtpChallengeRow | undefined> {
  return withDbErrorMapping(async () => {
    const rows = await executor
      .select()
      .from(authOtpChallenges)
      .where(eq(authOtpChallenges.mobile, mobile))
      .limit(1);
    return rows[0];
  });
}

/**
 * Issue (or replace) the challenge for a number. Replacement is intentional:
 * a resend invalidates the previous code and restarts the attempt counter, so
 * at most one code is ever valid for a mobile.
 */
export async function saveOtpChallenge(input: NewOtpChallenge, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    await executor
      .insert(authOtpChallenges)
      .values({
        mobile: input.mobile,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        sentAt: input.sentAt,
        attempts: 0,
      })
      .onConflictDoUpdate({
        target: authOtpChallenges.mobile,
        set: {
          codeHash: input.codeHash,
          expiresAt: input.expiresAt,
          sentAt: input.sentAt,
          attempts: 0,
        },
      });
  });
}

/** Count a wrong guess; returns the new count so the caller can enforce the cap. */
export async function incrementOtpAttempts(mobile: string, executor: Executor = db): Promise<number> {
  return withDbErrorMapping(async () => {
    const rows = await executor
      .update(authOtpChallenges)
      .set({ attempts: sql`${authOtpChallenges.attempts} + 1` })
      .where(eq(authOtpChallenges.mobile, mobile))
      .returning({ attempts: authOtpChallenges.attempts });
    return rows[0]?.attempts ?? 0;
  });
}

/** Consume the challenge — a code is single-use even when the account check fails. */
export async function deleteOtpChallenge(mobile: string, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    await executor.delete(authOtpChallenges).where(eq(authOtpChallenges.mobile, mobile));
  });
}

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------

export interface NewRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export async function insertRefreshToken(input: NewRefreshToken, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    await executor.insert(refreshTokens).values({
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      familyId: input.familyId,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    });
  });
}

export async function getRefreshTokenState(
  tokenHash: string,
  executor: Executor = db,
): Promise<RefreshTokenRow | undefined> {
  return withDbErrorMapping(async () => {
    const rows = await executor.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1);
    return rows[0];
  });
}

/** Rotate: mark the presented token consumed and link its replacement. */
export async function consumeRefreshToken(
  tokenHash: string,
  executor: Executor = db,
): Promise<void> {
  return withDbErrorMapping(async () => {
    await executor
      .update(refreshTokens)
      .set({ consumedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  });
}

/**
 * Reuse detection: the presented token was already traded in (or revoked).
 * Every session in the rotation family dies — the chess move that makes a
 * stolen refresh token worthless the moment its owner refreshed first.
 */
export async function revokeRefreshFamily(familyId: string, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    await executor
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
  });
}

/** Password change / admin lockout: kill every live token for one user. */
export async function revokeAllRefreshTokensForUser(userId: string, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    await executor
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  });
}

/** Housekeeping cleanup — expired or fully-revoked rows only. */
export async function pruneTokens(executor: Executor = db): Promise<number> {
  return withDbErrorMapping(async () => {
    const removed = await executor
      .delete(refreshTokens)
      .where(or(lt(refreshTokens.expiresAt, new Date()), sql`${refreshTokens.revokedAt} is not null`))
      .returning({ id: refreshTokens.id });
    return removed.length;
  });
}
