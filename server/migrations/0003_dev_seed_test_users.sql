/* =============================================================================
   0003 — Dev Seed Login (DISPOSABLE dev feature).

   Adds the two columns the dev-only /dev endpoints and the seed script need:

     auth_users.is_test_user boolean NOT NULL DEFAULT false
         Flag marking disposable test accounts. The real auth layer never
         reads it; GET /dev/seed-users (mounted only when APP_ENV is NOT
         "production") lists exactly these rows.

     auth_users.dev_password text (nullable)
         Plaintext dev credential for a seed account, returned by
         GET /dev/seed-users/:id/credentials. Never set for real accounts;
         the real login path verifies password_hash, as always.

   HOW TO REMOVE THE FEATURE
   1. DELETE server/dev/seed-routes.ts — routes disappear (they are mounted
      conditionally in server/app.ts under `if (isDevEnvironment())`).
   2. DELETE scripts/dev-seed-users.ts and its seed data.
   3. REMOVE the <DevSeedLoginPanel /> render in src/components/LoginView.tsx
      and DELETE src/components/DevSeedLoginPanel.tsx.
   4. REMOVE the two columns from server/db/schema.ts, DELETE this migration
      file and its entry in server/migrations/meta/_journal.json, then run
      `bun run db:init` and:
         ALTER TABLE auth_users DROP COLUMN is_test_user;
         ALTER TABLE auth_users DROP COLUMN dev_password;

   This migration is idempotent-safe: ADD COLUMN … DEFAULT false does not
   rewrite existing rows beyond the boolean default.
   ============================================================================= */

ALTER TABLE "auth_users" ADD COLUMN "is_test_user" boolean NOT NULL DEFAULT false;
ALTER TABLE "auth_users" ADD COLUMN "dev_password" text;
