/**
 * Dev Seed Login — DISPOSABLE test accounts (never run with APP_ENV=production).
 *
 * WHY: pre-launch testing loop — a developer wants to log in as each of the
 * system's roles and see exactly what that role sees. There is no public
 * registration, so this script provisions one disposable account per role and
 * stores its plaintext dev credential in auth_users.dev_password, which only
 * the dev-only /dev endpoints read (see server/dev/seed-routes.ts).
 *
 * Safety gates:
 *  - Refuses to run when APP_ENV=production (double gate with app.ts).
 *  - Only rows with `is_test_user = true` are ever created/updated here.
 *  - Real accounts (bootstrap/admin-provisioned) are never touched.
 *
 * Idempotent: re-running refreshes the scrypt hash + devPassword of the same
 * stable UUIDs without creating duplicates.
 *
 * HOW TO REMOVE THE FEATURE: delete this file (plus server/dev/seed-routes.ts
 * and its mount in server/app.ts, the <DevSeedLoginPanel /> line in
 * LoginView.tsx, DevSeedLoginPanel.tsx, migration 0003 and its journal entry)
 * then run `bun run db:init` and
 *   ALTER TABLE auth_users DROP COLUMN is_test_user;
 *   ALTER TABLE auth_users DROP COLUMN dev_password;
 *
 * Usage:
 *   bun run db:seed:dev       (add the script to package.json or run directly)
 *   bun run scripts/dev-seed-users.ts
 */

import { isDevEnvironment } from '../server/dev/seed-routes.js';
import { hashPassword } from '../server/auth/password.js';
import { shutdownDatabase } from '../server/db/initialize.js';
import { db } from '../server/db/client.js';
import { authUsers } from '../server/db/schema.js';
import { listRolesPermissions, upsertUser } from '../server/db/repositories/user.repository.js';
import type { UserRole } from '../src/types.js';

/* --------------------------------------------------------------------------
   The seed table — one entry per role the RBAC matrix knows. Each stable
   UUID keeps the script idempotent across runs; the plaintext devPassword is
   what GET /dev/seed-users/:id/credentials hands back. Choose province/
   county values that exist in the locations registry so the account starts
   scoped somewhere meaningful.
   -------------------------------------------------------------------------- */
const SEED_USERS: Array<{
  id: string;
  /** Normalized login identity (11 digits, 09 prefix) of the test account. */
  mobile: string;
  displayName: string;
  role: UserRole;
  devPassword: string;
  province?: string;
  county?: string;
}> = [
  // Mobiles 09991000001–13 give one test account per matrix role; the first
  // eight reuse the stable UUIDs of the original seed batch so re-provisioning
  // on an existing dev base re-labels those accounts in place.
  { id: 'bd8457af-eb7a-45e5-b2f9-c91a838c07d3', mobile: '09991000001', displayName: 'حساب آزمایشی — مدیر سامانه',      role: 'SYSTEM_ADMIN',          devPassword: 'DevSysAdmin1405!' },
  { id: 'a83f2f35-3847-42c1-96bf-6dc30d1b40a3', mobile: '09991000002', displayName: 'حساب آزمایشی — استاندار',       role: 'GOVERNOR',              devPassword: 'DevGovernor1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: '4bfb4cf9-7702-4a8d-a7b7-5708cdbf46bc', mobile: '09991000003', displayName: 'حساب آزمایشی — مدیرکل بودجه فرهنگی', role: 'CULTURE_BUDGET_HEAD', devPassword: 'DevCulture1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: 'dc97842e-d634-41d6-923d-934ab0ce511e', mobile: '09991000004', displayName: 'حساب آزمایشی — رئیس اداره',     role: 'OFFICE_HEAD',           devPassword: 'DevOffice1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: '5addfd1f-3180-43ae-8e97-ab4982eae30c', mobile: '09991000005', displayName: 'حساب آزمایشی — مدیر پروژه',     role: 'PROJECT_MANAGER',       devPassword: 'DevProject1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: '4a9c1c3b-4dff-43de-ab5b-6e96b5f6a929', mobile: '09991000006', displayName: 'حساب آزمایشی — مدیر مالی خزانه', role: 'TREASURY_FINANCE_HEAD', devPassword: 'DevTreasury1405!' },
  { id: 'baef3d2d-ca31-4fba-bb2d-d03695c77c2a', mobile: '09991000007', displayName: 'حساب آزمایشی — حسابرس داخلی',   role: 'INTERNAL_AUDITOR',      devPassword: 'DevAudit1405!' },
  { id: 'a2c67742-01ab-446e-8c1e-df17ae8337ab', mobile: '09991000008', displayName: 'حساب آزمایشی — مسئول طرح',      role: 'PLAN_OFFICER',          devPassword: 'DevPlan1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: '0e1d5a64-2c77-49a0-9f01-4fe6f1d2a201', mobile: '09991000009', displayName: 'حساب آزمایشی — رئیس سازمان برنامه و بودجه', role: 'BUDGET_CHAIRMAN', devPassword: 'DevChairman1405!' },
  { id: '1f2e6b75-3d88-40b1-8012-5ff7f2e3b312', mobile: '09991000010', displayName: 'حساب آزمایشی — بخش‌دار',        role: 'DISTRICT_GOVERNOR',     devPassword: 'DevDistrict1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: '2a3f7c86-4e99-41c2-9123-60a8c3f4c423', mobile: '09991000011', displayName: 'حساب آزمایشی — شهردار',         role: 'MAYOR',                 devPassword: 'DevMayor1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: '3b4a8d97-5faa-42d3-a234-71b9c4a5d534', mobile: '09991000012', displayName: 'حساب آزمایشی — پیمانکار',       role: 'CONTRACTOR',            devPassword: 'DevContractor1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: '4c5b9ea8-60bb-43e4-b345-82cac5b6e645', mobile: '09991000013', displayName: 'حساب آزمایشی — پشتیبان فنی',    role: 'TECH_SUPPORT',          devPassword: 'DevTech1405!' },
];

async function main(): Promise<void> {
  if (!isDevEnvironment()) {
    console.error('[dev-seed] APP_ENV=production — refuse to create test accounts. Aborting.');
    process.exitCode = 1;
    return;
  }

  // Persian labels come from the live RBAC matrix, the same source the real
  // admin-provisioning flow (POST /api/auth/users) uses.
  const matrix = await listRolesPermissions();

  for (const seed of SEED_USERS) {
    const matrixRole = matrix.find((r) => r.role === seed.role);
    if (!matrixRole) {
      console.warn(`[dev-seed] role ${seed.role} is not in the RBAC matrix — skipped`);
      continue;
    }

    await db
      .insert(authUsers)
      .values({
        id: seed.id,
        mobile: seed.mobile,
        passwordHash: await hashPassword(seed.devPassword),
        displayName: seed.displayName,
        role: seed.role,
        isTestUser: true,
        devPassword: seed.devPassword,
        province: seed.province ?? null,
        county: seed.county ?? null,
      })
      // Idempotent by the stable UUID: re-running refreshes the credentials.
      .onConflictDoUpdate({
        target: authUsers.id,
        set: {
          passwordHash: await hashPassword(seed.devPassword),
          mobile: seed.mobile,
          displayName: seed.displayName,
          role: seed.role,
          isActive: true,
          isTestUser: true,
          devPassword: seed.devPassword,
          province: seed.province ?? null,
          county: seed.county ?? null,
        },
      });

    // Mirror into the legacy `users` roster so the account is visible and
    // editable in the role & permission manager — exactly what the admin
    // issuance flow does for every account it creates.
    await upsertUser({
      id: seed.id,
      name: seed.displayName,
      role: seed.role,
      roleFa: matrixRole.roleTitleFa,
      roleTitleFa: matrixRole.roleTitleFa,
      avatar: '',
      organization: seed.province ? `${seed.province}${seed.county ? ' — ' + seed.county : ''}` : 'سطح ملی',
      ...(seed.province ? { province: seed.province } : {}),
      ...(seed.county ? { county: seed.county } : {}),
    });

    console.log(`[dev-seed] ${seed.role.padEnd(20)} ${seed.mobile}  (dev password: ${seed.devPassword})`);
  }

  console.log(`\n[dev-seed] done — ${SEED_USERS.length} test accounts ready. Log in via the Dev seed users panel on the login page`);
  console.log('[dev-seed] reminder: these are disposable accounts; delete the feature before going live.');
}

main()
  .catch(async (error) => {
    console.error('[dev-seed] failed:', (error as Error).message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await shutdownDatabase();
    } catch {
      /* pool already closed */
    }
  });
