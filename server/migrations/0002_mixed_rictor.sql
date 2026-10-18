/* =============================================================================
   0002 — Authentication identity layer.

   Introduces `auth_users` (the single source of truth for verified identity)
   and `refresh_tokens` (rotating, hashed, revocable refresh tokens), then
   converts every mutable business table's actor column into a NOT NULL
   foreign key against `auth_users.id`.

   Legacy data strategy: the legacy `users` registry ids («USER-01»…) are
   display data, not identities. A permanent SYSTEM actor (id
   00000000-0000-4000-8000-000000000001) is inserted here with DISABLED,
   unloggable credentials; all pre-existing rows are attributed to it, making
   the old data visible and auditable without ever being attributable to a
   real person or login. Seeds select this same constant explicitly.

   Each actor column is converted in three safe steps so this migration never
   fails on a populated database: ADD COLUMN (nullable) → backfill → SET
   NOT NULL → FOREIGN KEY.
   ============================================================================= */

CREATE TABLE "auth_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"department_id" text,
	"allowed_location_id" text,
	"province" text,
	"county" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"tokens_valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_users_role_check" CHECK ("auth_users"."role" IN ('ADMIN', 'PROVINCIAL_GOVERNOR', 'DEPARTMENT_HEAD', 'OFFICE_HEAD', 'REGIONAL_MANAGER', 'PLANNING_SPECIALIST', 'AUDITOR', 'DEHYAR_COUNCIL'))
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" uuid NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_allowed_location_id_locations_id_fk" FOREIGN KEY ("allowed_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_users_email_lower_unique" ON "auth_users" USING btree (lower("email"));
--> statement-breakpoint
CREATE INDEX "idx_auth_users_role" ON "auth_users" USING btree ("role");
--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_hash_unique" ON "refresh_tokens" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_family" ON "refresh_tokens" USING btree ("family_id");
--> statement-breakpoint
-- The permanent SYSTEM actor: owns backfilled legacy rows and non-interactive
-- system writes (seeding). Credentials are the literal string "scrypt$disabled"
-- — never a valid stored credential — and the account is inactive, so it cannot
-- authenticate. It exists purely so FK/NOT NULL holds for pre-auth history.
INSERT INTO "auth_users" ("id", "email", "password_hash", "display_name", "role", "is_active")
VALUES ('00000000-0000-4000-8000-000000000001', 'system@bootstrap.invalid', 'scrypt$disabled', 'سیستم (جانشین داده‌های قدیمی)', 'ADMIN', false);
--> statement-breakpoint
-- projects: foreign key retarget from the legacy text registry to auth_users.
ALTER TABLE "projects" DROP CONSTRAINT "projects_created_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "created_by_actor" uuid;
--> statement-breakpoint
-- Legacy «USER-xx» ids never identified a login; attribute them to SYSTEM.
UPDATE "projects" SET "created_by_actor" = '00000000-0000-4000-8000-000000000001';
--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "created_by_user_id";
--> statement-breakpoint
ALTER TABLE "projects" RENAME COLUMN "created_by_actor" TO "created_by_user_id";
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "created_by_user_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_user_id_auth_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- All remaining business tables: populate then enforce (three-step each).
ALTER TABLE "analysis_sources" ADD COLUMN "actor_user_id" uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';
--> statement-breakpoint
ALTER TABLE "analysis_sources" ALTER COLUMN "actor_user_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_user_id" uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';
--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "actor_user_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "budget_sources" ADD COLUMN "created_by_user_id" uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';
--> statement-breakpoint
ALTER TABLE "budget_sources" ALTER COLUMN "created_by_user_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "created_by_user_id" uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';
--> statement-breakpoint
ALTER TABLE "contractors" ALTER COLUMN "created_by_user_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "crises_harms" ADD COLUMN "created_by_user_id" uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';
--> statement-breakpoint
ALTER TABLE "crises_harms" ALTER COLUMN "created_by_user_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "created_by_user_id" uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';
--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "created_by_user_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "executors" ADD COLUMN "created_by_user_id" uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';
--> statement-breakpoint
ALTER TABLE "executors" ALTER COLUMN "created_by_user_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "updated_by_user_id" uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';
--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "updated_by_user_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "priorities" ADD COLUMN "created_by_user_id" uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';
--> statement-breakpoint
ALTER TABLE "priorities" ALTER COLUMN "created_by_user_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "analysis_sources" ADD CONSTRAINT "analysis_sources_actor_user_id_auth_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_auth_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "budget_sources" ADD CONSTRAINT "budget_sources_created_by_user_id_auth_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_created_by_user_id_auth_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crises_harms" ADD CONSTRAINT "crises_harms_created_by_user_id_auth_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_created_by_user_id_auth_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "executors" ADD CONSTRAINT "executors_created_by_user_id_auth_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_updated_by_user_id_auth_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "priorities" ADD CONSTRAINT "priorities_created_by_user_id_auth_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;
