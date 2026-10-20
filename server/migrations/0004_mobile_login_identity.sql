/* =============================================================================
   0004 — Login identity: MOBILE NUMBER instead of email.

   Pre-launch data decision. The auth identity moves from `auth_users.email`
   to `auth_users.mobile` (normalized form: 11 ASCII digits starting with 09,
   canonicalized by server/auth/mobile.ts). No login can exist against an
   email-shaped identity anymore; accounts that only carried an email-shaped
   value are intentionally displaced so the migration never fails and no
   invalid identity can ever log in again.

   WHAT HAPPENS TO EXISTING ROWS
   - Rows whose value is already a normalized mobile keep it verbatim.
   - Every other row (emails from the old phase: bootstrap admin@…, seed
     dev-…@csr.test, test-issued accounts) becomes a RESERVED placeholder
     09990010001, 09990010002, … — the 09990 prefix is outside the operator
     ranges real SIMs issue, and the seed script (scripts/dev-seed-users.ts,
     mobiles 09991000001‥08) overwrites its own accounts on the next run.

   The uniqueness guarantee moves from the functional lower(email) index to
   a plain unique index: normalization at the entry points makes rest values
   canonical, so plain equality is exact.

   Execution notes: guarded DO blocks make the file idempotent-safe to
   re-apply (a failed or partially-manual run cannot wedge the journal), and
   the placeholder UPDATE goes through a FROM-subquery because PostgreSQL
   does not allow window functions directly in the UPDATE SET list.
   ============================================================================= */

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'auth_users' AND column_name = 'email') THEN
    EXECUTE 'ALTER TABLE "auth_users" RENAME COLUMN "email" TO "mobile"';
    -- Displace every value that is not already a canonical mobile number,
    -- row-deterministic so reruns and replicas converge.
    UPDATE "auth_users" AS u
    SET    "mobile" = d.placeholder
    FROM (
      SELECT ctid,
             '0999001' || lpad((row_number() OVER (ORDER BY ctid))::text, 5, '0') AS placeholder
      FROM   "auth_users"
      WHERE  "mobile" !~ '^09\d{9}$'
    ) AS d
    WHERE u.ctid = d.ctid;
  END IF;
END
$outer$;

DO $outer$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'auth_users_mobile_unique') THEN
    EXECUTE 'DROP INDEX IF EXISTS "auth_users_email_lower_unique"';
    EXECUTE 'CREATE UNIQUE INDEX "auth_users_mobile_unique" ON "auth_users" USING btree ("mobile")';
  END IF;
END
$outer$;
