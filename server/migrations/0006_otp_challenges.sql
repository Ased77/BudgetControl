/* =============================================================================
   0006 — One-time-code login challenges.

   One row per mobile number in the middle of an OTP login. The code itself is
   never stored, only an HMAC-SHA256 of `<mobile>:<code>` keyed with
   AUTH_JWT_SECRET (server/auth/otp.ts). A resend replaces the row and resets
   `attempts`; a successful verification deletes it, so a code is single-use.

   No foreign key to auth_users: the request endpoint checks account existence
   before issuing a challenge, so rows only exist for real users. The verify
   route repeats the lookup as a race guard.
   ============================================================================= */

CREATE TABLE IF NOT EXISTS "auth_otp_challenges" (
  "mobile" text PRIMARY KEY NOT NULL,
  "code_hash" text NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "sent_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_auth_otp_challenges_expires"
  ON "auth_otp_challenges" ("expires_at");
