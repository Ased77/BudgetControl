/* =========================================================================
   The SYSTEM actor — the "non-person" identity.

   Owns: backfilled pre-auth legacy rows and internal seeded data. It is a
   permanent auth_users row with UNLOGGABLE credentials (`scrypt$disabled`
   — verifyPassword always returns false) and isActive=false, so no one
   can ever authenticate as it. Its purpose is integrity, not access:
   historical data must never violate the NOT NULL / FK contract.

   Must stay in lockstep with server/migrations/0002 (the INSERT there).
   ========================================================================= */

export const SYSTEM_ACTOR_ID = '00000000-0000-4000-8000-000000000001';
