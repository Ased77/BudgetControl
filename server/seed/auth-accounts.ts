/* =========================================================================
   Demo role accounts — REAL identities, one per RBAC role.

   These are the same 13 people the Dev Seed Login provisions
   (09991000001–09991000013), but this module creates them as ordinary
   accounts:

     - a real `auth_users` row with a normal scrypt `password_hash`
     - `is_test_user = false` and `dev_password = NULL`

   So they authenticate through the ordinary `POST /api/auth/login` path in
   every environment — including a deployed Vercel function, where the
   dev-only panel and its plaintext column do not exist.

   Both entry points share this list, so roles, mobiles and passwords can
   never drift:
     - scripts/seed-auth-accounts.ts   operator run, prints credentials
     - server/db/initialize.ts         only when SEED_AUTH_ACCOUNTS=1
     - scripts/dev-seed-users.ts       dev panel, derived from the same array

   SECURITY: the passwords below are published in this repository. Treat the
   accounts as demo/staging identities: keep SEED_AUTH_ACCOUNTS unset for a
   real deployment, and rotate or deactivate them after a trial.
   ========================================================================= */

import { db } from '../db/client.js';
import { authUsers } from '../db/schema.js';
import { hashPassword } from '../auth/password.js';
import { getAuthUserByMobile } from '../auth/repo.js';
import { normalizeMobile } from '../auth/mobile.js';
import { listRolesPermissions, upsertUser } from '../db/repositories/user.repository.js';
import type { UserRole } from '../../src/types.js';

export interface AuthSeedAccount {
  /** Stable UUID: re-seeding updates the same identity, never a duplicate. */
  id: string;
  /** Login identity — normalized at run time, never trusted raw. */
  mobile: string;
  displayName: string;
  role: UserRole;
  /** Demo credential. Also used by the dev panel's plaintext helper. */
  password: string;
  province?: string;
  county?: string;
}

export const AUTH_SEED_ACCOUNTS: readonly AuthSeedAccount[] = [
  { id: 'bd8457af-eb7a-45e5-b2f9-c91a838c07d3', mobile: '09991000001', displayName: 'حساب آزمایشی — مدیر سامانه', role: 'SYSTEM_ADMIN', password: 'DevSysAdmin1405!' },
  { id: 'a83f2f35-3847-42c1-96bf-6dc30d1b40a3', mobile: '09991000002', displayName: 'حساب آزمایشی — استاندار', role: 'GOVERNOR', password: 'DevGovernor1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: '4bfb4cf9-7702-4a8d-a7b7-5708cdbf46bc', mobile: '09991000003', displayName: 'حساب آزمایشی — مدیرکل بودجه فرهنگی', role: 'CULTURE_BUDGET_HEAD', password: 'DevCulture1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: 'dc97842e-d634-41d6-923d-934ab0ce511e', mobile: '09991000004', displayName: 'حساب آزمایشی — رئیس اداره', role: 'OFFICE_HEAD', password: 'DevOffice1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: '5addfd1f-3180-43ae-8e97-ab4982eae30c', mobile: '09991000005', displayName: 'حساب آزمایشی — مدیر پروژه', role: 'PROJECT_MANAGER', password: 'DevProject1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: '4a9c1c3b-4dff-43de-ab5b-6e96b5f6a929', mobile: '09991000006', displayName: 'حساب آزمایشی — مدیر مالی خزانه', role: 'TREASURY_FINANCE_HEAD', password: 'DevTreasury1405!' },
  { id: 'baef3d2d-ca31-4fba-bb2d-d03695c77c2a', mobile: '09991000007', displayName: 'حساب آزمایشی — حسابرس داخلی', role: 'INTERNAL_AUDITOR', password: 'DevAudit1405!' },
  { id: 'a2c67742-01ab-446e-8c1e-df17ae8337ab', mobile: '09991000008', displayName: 'حساب آزمایشی — مسئول طرح', role: 'PLAN_OFFICER', password: 'DevPlan1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: '0e1d5a64-2c77-49a0-9f01-4fe6f1d2a201', mobile: '09991000009', displayName: 'حساب آزمایشی — رئیس سازمان برنامه و بودجه', role: 'BUDGET_CHAIRMAN', password: 'DevChairman1405!' },
  { id: '1f2e6b75-3d88-40b1-8012-5ff7f2e3b312', mobile: '09991000010', displayName: 'حساب آزمایشی — بخش‌دار', role: 'DISTRICT_GOVERNOR', password: 'DevDistrict1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: '2a3f7c86-4e99-41c2-9123-60a8c3f4c423', mobile: '09991000011', displayName: 'حساب آزمایشی — شهردار', role: 'MAYOR', password: 'DevMayor1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: '3b4a8d97-5faa-42d3-a234-71b9c4a5d534', mobile: '09991000012', displayName: 'حساب آزمایشی — پیمانکار', role: 'CONTRACTOR', password: 'DevContractor1405!', province: 'کرمان', county: 'رفسنجان' },
  { id: '4c5b9ea8-60bb-43e4-b345-82cac5b6e645', mobile: '09991000013', displayName: 'حساب آزمایشی — پشتیبان فنی', role: 'TECH_SUPPORT', password: 'DevTech1405!' },
];

export type AuthSeedOutcome = 'created' | 'updated' | 'skipped';

export interface AuthSeedResult {
  mobile: string;
  displayName: string;
  role: UserRole | string;
  password: string;
  outcome: AuthSeedOutcome;
  /** Why an account was skipped; never contains a credential. */
  note?: string;
}

export interface SeedAuthAccountsOptions {
  /** Validate and report, write nothing. */
  dryRun?: boolean;
}

interface Prepared {
  account: AuthSeedAccount;
  mobile: string;
  roleFa: string;
  passwordHash: string;
}

/**
 * Create or refresh the 13 demo identities as real accounts.
 *
 * Idempotent by the stable UUID. A mobile that already belongs to a DIFFERENT
 * account is never hijacked: that row is reported as skipped so an operator
 * can resolve it deliberately. Re-running resets each account's password to
 * the seeded value (that is the point of a seed), so a changed password is not
 * preserved.
 */
export async function seedAuthAccounts(
  options: SeedAuthAccountsOptions = {},
): Promise<AuthSeedResult[]> {
  const { dryRun = false } = options;

  const matrix = await listRolesPermissions();
  if (matrix.length === 0) {
    throw new Error(
      '[seed-auth] roles_permissions is empty — apply the schema first (bun run db:init, or rerun with --init).',
    );
  }
  const roleTitleFa = new Map(matrix.map((entry) => [entry.role as string, entry.roleTitleFa]));

  const results: AuthSeedResult[] = [];
  const prepared: Prepared[] = [];

  for (const account of AUTH_SEED_ACCOUNTS) {
    const mobile = normalizeMobile(account.mobile);
    if (!mobile) {
      results.push({
        mobile: account.mobile,
        displayName: account.displayName,
        role: account.role,
        password: account.password,
        outcome: 'skipped',
        note: 'mobile is not a valid Iranian mobile number',
      });
      continue;
    }

    const roleFa = roleTitleFa.get(account.role);
    if (!roleFa) {
      results.push({
        mobile,
        displayName: account.displayName,
        role: account.role,
        password: account.password,
        outcome: 'skipped',
        note: `role ${account.role} is not in the RBAC matrix`,
      });
      continue;
    }

    const existing = await getAuthUserByMobile(mobile);
    if (existing && existing.id !== account.id) {
      results.push({
        mobile,
        displayName: account.displayName,
        role: account.role,
        password: account.password,
        outcome: 'skipped',
        note: `mobile already belongs to account ${existing.id} — not overwritten`,
      });
      continue;
    }

    results.push({
      mobile,
      displayName: account.displayName,
      role: account.role,
      password: account.password,
      outcome: existing ? 'updated' : 'created',
    });

    if (!dryRun) {
      prepared.push({ account, mobile, roleFa, passwordHash: await hashPassword(account.password) });
    }
  }

  if (!dryRun && prepared.length > 0) {
    await db.transaction(async (tx) => {
      for (const { account, mobile, roleFa, passwordHash } of prepared) {
        const row = {
          mobile,
          passwordHash,
          displayName: account.displayName,
          role: account.role,
          province: account.province ?? null,
          county: account.county ?? null,
          isActive: true,
          // Real accounts: no test flag, no plaintext credential at rest.
          isTestUser: false,
          devPassword: null,
        };
        await tx
          .insert(authUsers)
          .values({ id: account.id, ...row })
          .onConflictDoUpdate({ target: authUsers.id, set: row });

        // Mirror into the roster the role & permission manager reads, exactly
        // as POST /api/auth/users does for every account it provisions.
        await upsertUser(
          {
            id: account.id,
            name: account.displayName,
            role: account.role,
            roleFa,
            roleTitleFa: roleFa,
            avatar: '',
            organization: account.province
              ? `${account.province}${account.county ? ' — ' + account.county : ''}`
              : 'سطح ملی',
            ...(account.province ? { province: account.province } : {}),
            ...(account.county ? { county: account.county } : {}),
          },
          tx,
        );
      }
    });
  }

  return results;
}
