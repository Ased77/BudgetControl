/* =============================================================================
   0005 — Role matrix v2: replace the 8-role set with 13 roles.

   The old organizational model (ADMIN, PROVINCIAL_GOVERNOR, DEPARTMENT_HEAD,
   OFFICE_HEAD, REGIONAL_MANAGER, PLANNING_SPECIALIST, AUDITOR, DEHYAR_COUNCIL)
   is replaced wholesale by the 13-role chart:

     BUDGET_CHAIRMAN       رئیس سازمان برنامه و بودجه   (full national access)
     SYSTEM_ADMIN          مدیر سامانه                  (system stewardship)
     CULTURE_BUDGET_HEAD   مدیرکل بودجه فرهنگی
     TREASURY_FINANCE_HEAD مدیر مالی خزانه
     GOVERNOR              استاندار
     DISTRICT_GOVERNOR     بخش‌دار
     MAYOR                 شهردار
     OFFICE_HEAD           رئیس اداره                    (keeps its code)
     PROJECT_MANAGER       مدیر پروژه
     PLAN_OFFICER          مسئول طرح
     CONTRACTOR            پیمانکار
     TECH_SUPPORT          پشتیبان فنی
     INTERNAL_AUDITOR      حسابرس داخلی

   STEPS (order matters):
     1. Drop the three role CHECK constraints — the remap below writes role
        values the OLD checks would reject.
     2. Remap existing role values (auth_users, users display roster incl.
        its fa labels, audit_logs.user_role is display-only text).
   ADMIN→SYSTEM_ADMIN so bootstrap accounts keep the account-issuance guard
   (requireAdmin now checks SYSTEM_ADMIN).
     3. Replace the roles_permissions matrix with the 13 rows matching
       src/data/initialData.ts (guard: skip when v2 already applied — matrix
       edits an operator made afterwards are never touched by a re-apply).
     4. Re-create the CHECK constraints with the 13-value lists.

   Execution notes: guarded DO blocks make the file safe to re-apply after a
   failed or partially-manual run (same pattern as 0004).
   ============================================================================= */

-- (1) drop the OLD check constraints -------------------------------------------------
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    EXECUTE 'ALTER TABLE "users" DROP CONSTRAINT "users_role_check"';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_permissions_role_check') THEN
    EXECUTE 'ALTER TABLE "roles_permissions" DROP CONSTRAINT "roles_permissions_role_check"';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_users_role_check') THEN
    EXECUTE 'ALTER TABLE "auth_users" DROP CONSTRAINT "auth_users_role_check"';
  END IF;
END
$outer$;

-- (2) remap existing role values -----------------------------------------------------
UPDATE "auth_users" SET "role" = 'SYSTEM_ADMIN'          WHERE "role" = 'ADMIN';
UPDATE "auth_users" SET "role" = 'GOVERNOR'              WHERE "role" = 'PROVINCIAL_GOVERNOR';
UPDATE "auth_users" SET "role" = 'CULTURE_BUDGET_HEAD'   WHERE "role" = 'DEPARTMENT_HEAD';
-- OFFICE_HEAD keeps its code.
UPDATE "auth_users" SET "role" = 'PROJECT_MANAGER'       WHERE "role" = 'REGIONAL_MANAGER';
UPDATE "auth_users" SET "role" = 'TREASURY_FINANCE_HEAD' WHERE "role" = 'PLANNING_SPECIALIST';
UPDATE "auth_users" SET "role" = 'INTERNAL_AUDITOR'      WHERE "role" = 'AUDITOR';
UPDATE "auth_users" SET "role" = 'PLAN_OFFICER'          WHERE "role" = 'DEHYAR_COUNCIL';

-- Display roster: refresh the code AND the fa labels together so the role &
-- permission manager never shows a stale title under a remapped code.
UPDATE "users" SET "role" = 'SYSTEM_ADMIN',          "role_fa" = 'مدیر سامانه',       "role_title_fa" = 'مدیر سامانه'          WHERE "role" = 'ADMIN';
UPDATE "users" SET "role" = 'GOVERNOR',              "role_fa" = 'استاندار',          "role_title_fa" = 'استاندار'             WHERE "role" = 'PROVINCIAL_GOVERNOR';
UPDATE "users" SET "role" = 'CULTURE_BUDGET_HEAD',   "role_fa" = 'مدیرکل بودجه فرهنگی', "role_title_fa" = 'مدیرکل بودجه فرهنگی' WHERE "role" = 'DEPARTMENT_HEAD';
-- OFFICE_HEAD keeps its code and existing labels.
UPDATE "users" SET "role" = 'PROJECT_MANAGER',       "role_fa" = 'مدیر پروژه',        "role_title_fa" = 'مدیر پروژه'           WHERE "role" = 'REGIONAL_MANAGER';
UPDATE "users" SET "role" = 'TREASURY_FINANCE_HEAD', "role_fa" = 'مدیر مالی خزانه',   "role_title_fa" = 'مدیر مالی خزانه'      WHERE "role" = 'PLANNING_SPECIALIST';
UPDATE "users" SET "role" = 'INTERNAL_AUDITOR',      "role_fa" = 'حسابرس داخلی',      "role_title_fa" = 'حسابرس داخلی'         WHERE "role" = 'AUDITOR';
UPDATE "users" SET "role" = 'PLAN_OFFICER',          "role_fa" = 'مسئول طرح',         "role_title_fa" = 'مسئول طرح'            WHERE "role" = 'DEHYAR_COUNCIL';

-- Audit trail stores the role as plain display text (no CHECK).
UPDATE "audit_logs" SET "user_role" = 'مدیر سامانه'     WHERE "user_role" = 'ADMIN';
UPDATE "audit_logs" SET "user_role" = 'استاندار'       WHERE "user_role" = 'PROVINCIAL_GOVERNOR';
UPDATE "audit_logs" SET "user_role" = 'مدیرکل بودجه فرهنگی' WHERE "user_role" = 'DEPARTMENT_HEAD';
-- رئیس اداره keeps its label.
UPDATE "audit_logs" SET "user_role" = 'مدیر پروژه'     WHERE "user_role" = 'REGIONAL_MANAGER';
UPDATE "audit_logs" SET "user_role" = 'مدیر مالی خزانه' WHERE "user_role" = 'PLANNING_SPECIALIST';
UPDATE "audit_logs" SET "user_role" = 'حسابرس داخلی'   WHERE "user_role" = 'AUDITOR';
UPDATE "audit_logs" SET "user_role" = 'مسئول طرح'      WHERE "user_role" = 'DEHYAR_COUNCIL';

-- (3) replace the matrix -------------------------------------------------------------
DO $outer$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "roles_permissions" WHERE "role" = 'BUDGET_CHAIRMAN') THEN
    DELETE FROM "roles_permissions";
    INSERT INTO "roles_permissions" (
      "role", "role_title_fa", "description",
      "can_view_dashboard", "can_edit_departments", "can_manage_budget",
      "can_manage_crises", "can_manage_priorities", "can_create_project",
      "can_approve_projects", "can_manage_executors", "can_manage_contractors",
      "can_export_reports", "can_audit_logs", "scope_level"
    ) VALUES
    ('BUDGET_CHAIRMAN', 'رئیس سازمان برنامه و بودجه',
     'دسترسی تام ملی: تصویب نهایی بودجه و پروژه‌ها، ممیزی عالی، تعریف سازمان و پشتیبانی از الگوریتم هوشمند',
     true, true, true, true, true, true, true, true, true, true, true, 'NATIONAL'),
    ('SYSTEM_ADMIN', 'مدیر سامانه',
     'مدیریت فنی سامانه: تعریف ادارات، مجریان و پیمانکاران، تنظیم اولویت‌ها، لاگ‌های سیستمی و خروجی گزارش‌ها — بدون ویرایش محتوای بحران‌ها',
     true, true, true, false, true, false, false, true, true, true, true, 'NATIONAL'),
    ('CULTURE_BUDGET_HEAD', 'مدیرکل بودجه فرهنگی',
     'ثبت و پیگیری پروژه‌های حوزه فرهنگی اداره متبوع، انتخاب پیمانکاران و گزارش پیشرفت فیزیکی و مالی',
     true, false, false, true, false, true, false, true, true, true, false, 'COUNTY'),
    ('TREASURY_FINANCE_HEAD', 'مدیر مالی خزانه',
     'تنظیم درصدهای تخصیص و موازنه بودجه، منابع و تغییرات ریالی، سنجش انحرافات مالی و خروجی گزارش‌های خزانه',
     true, false, true, false, true, false, false, false, false, true, true, 'NATIONAL'),
    ('GOVERNOR', 'استاندار',
     'مدیریت و هماهنگی کلان دستگاه‌های اجرایی در سطح استان، تصویب پروژه‌ها و پایش موازی‌کاری',
     true, false, true, true, true, true, true, true, true, true, true, 'COUNTY'),
    ('DISTRICT_GOVERNOR', 'بخش‌دار',
     'ثبت مطالبات و مشکلات بخش، گزارش پروژه‌های اولویت‌دار و پایش اجرای طرح‌های بخش',
     true, false, false, true, true, true, false, false, false, true, false, 'COUNTY'),
    ('MAYOR', 'شهردار',
     'ثبت و پیگیری طرح‌های شهری، مدیریت مجریان شهری و پیمانکاران خدمات شهری',
     true, false, false, true, false, true, false, true, true, true, false, 'COUNTY'),
    ('OFFICE_HEAD', 'رئیس اداره',
     'ثبت پروژه‌های اداره متبوع در گردش‌کار ثبت پروژه، پیگیری پروژه‌های ثبت‌شده توسط خود و مشاهده پیمانکاران تخصیص‌یافته به همان پروژه‌ها',
     true, false, false, false, false, true, false, false, false, false, false, 'COUNTY'),
    ('PROJECT_MANAGER', 'مدیر پروژه',
     'به‌روزرسانی پیشرفت فیزیکی و مالی پروژه‌های تخصیص‌یافته، برقراری ارتباط با پیمانکار همان پروژه‌ها',
     true, false, false, false, false, true, false, false, false, false, false, 'COUNTY'),
    ('PLAN_OFFICER', 'مسئول طرح',
     'ثبت طرح‌ها و مطالبات روستایی و محلی، اعلام پروژه‌های اولویت‌دار محل و نظارت میدانی بر حسن اجرا',
     true, false, false, true, false, true, false, false, false, true, false, 'RURAL_DISTRICT'),
    ('CONTRACTOR', 'پیمانکار',
     'مشاهده داشبورد سراسری و پروژه‌های تخصیص‌یافته — بدون مجوز ویرایش داده یا خروجی گزارش',
     true, false, false, false, false, false, false, false, false, false, false, 'COUNTY'),
    ('TECH_SUPPORT', 'پشتیبان فنی',
     'پشتیبانی فنی سامانه: بررسی لاگ‌ها و سلامت سیستم، بدون مجوز ویرایش داده‌های تجاری',
     true, false, false, false, false, false, false, false, false, false, true, 'NATIONAL'),
    ('INTERNAL_AUDITOR', 'حسابرس داخلی',
     'بررسی لاگ‌های سیستمی، رصد انحرافات بودجه‌ای، پیشگیری از فساد و صدور گزارش‌های ممیزی داخلی',
     true, false, false, false, false, false, false, false, false, true, true, 'NATIONAL');
  END IF;
END
$outer$;

-- (4) re-create the check constraints with the 13-value lists ------------------------
DO $outer$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    EXECUTE 'ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" IN (''BUDGET_CHAIRMAN'', ''SYSTEM_ADMIN'', ''CULTURE_BUDGET_HEAD'', ''TREASURY_FINANCE_HEAD'', ''GOVERNOR'', ''DISTRICT_GOVERNOR'', ''MAYOR'', ''OFFICE_HEAD'', ''PROJECT_MANAGER'', ''PLAN_OFFICER'', ''CONTRACTOR'', ''TECH_SUPPORT'', ''INTERNAL_AUDITOR''))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_permissions_role_check') THEN
    EXECUTE 'ALTER TABLE "roles_permissions" ADD CONSTRAINT "roles_permissions_role_check" CHECK ("roles_permissions"."role" IN (''BUDGET_CHAIRMAN'', ''SYSTEM_ADMIN'', ''CULTURE_BUDGET_HEAD'', ''TREASURY_FINANCE_HEAD'', ''GOVERNOR'', ''DISTRICT_GOVERNOR'', ''MAYOR'', ''OFFICE_HEAD'', ''PROJECT_MANAGER'', ''PLAN_OFFICER'', ''CONTRACTOR'', ''TECH_SUPPORT'', ''INTERNAL_AUDITOR''))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_users_role_check') THEN
    EXECUTE 'ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_role_check" CHECK ("auth_users"."role" IN (''BUDGET_CHAIRMAN'', ''SYSTEM_ADMIN'', ''CULTURE_BUDGET_HEAD'', ''TREASURY_FINANCE_HEAD'', ''GOVERNOR'', ''DISTRICT_GOVERNOR'', ''MAYOR'', ''OFFICE_HEAD'', ''PROJECT_MANAGER'', ''PLAN_OFFICER'', ''CONTRACTOR'', ''TECH_SUPPORT'', ''INTERNAL_AUDITOR''))';
  END IF;
END
$outer$;

DO $outer$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "users"
    WHERE "role" NOT IN ('BUDGET_CHAIRMAN', 'SYSTEM_ADMIN', 'CULTURE_BUDGET_HEAD', 'TREASURY_FINANCE_HEAD', 'GOVERNOR',
                         'DISTRICT_GOVERNOR', 'MAYOR', 'OFFICE_HEAD', 'PROJECT_MANAGER', 'PLAN_OFFICER',
                         'CONTRACTOR', 'TECH_SUPPORT', 'INTERNAL_AUDITOR')
  ) OR EXISTS (
    SELECT 1 FROM "auth_users"
    WHERE "role" NOT IN ('BUDGET_CHAIRMAN', 'SYSTEM_ADMIN', 'CULTURE_BUDGET_HEAD', 'TREASURY_FINANCE_HEAD', 'GOVERNOR',
                         'DISTRICT_GOVERNOR', 'MAYOR', 'OFFICE_HEAD', 'PROJECT_MANAGER', 'PLAN_OFFICER',
                         'CONTRACTOR', 'TECH_SUPPORT', 'INTERNAL_AUDITOR')
  ) THEN
    RAISE EXCEPTION 'role remap incomplete — unmapped role values remain';
  END IF;
  IF (SELECT count(*) FROM "roles_permissions") <> 13 THEN
    RAISE EXCEPTION 'roles_permissions must hold exactly 13 rows after v2 (found %)', (SELECT count(*) FROM "roles_permissions");
  END IF;
END
$outer$;
