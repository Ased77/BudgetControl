/**
 * db:doctor:auth — does a given credential actually exist and verify in the
 * database this project points at?
 *
 * WHY: `POST /api/auth/login` answers the SAME 401 ("شماره موبایل یا رمز عبور
 * نادرست است") whether the account is missing, disabled, or the password is
 * wrong. That is deliberate (no account enumeration), but it makes a deployment
 * problem invisible: a Vercel function whose `SEED_AUTH_ACCOUNTS` never took
 * effect looks exactly like a typo in the password.
 *
 * This script reads the table directly and reports, per demo account, which of
 * those three is true. It never writes and never prints a hash — only whether
 * the published demo password verifies against the stored scrypt hash.
 *
 * Usage:
 *   bun run db:doctor:auth
 *   bun run db:doctor:auth --json
 *   bun run db:doctor:auth --mobile 09991000001 --password 'DevSysAdmin1405!'
 *
 * Checking the DEPLOYED database (the Vercel function's own connection string):
 *   $env:DATABASE_URL='postgres://…?sslmode=require'; bun run db:doctor:auth
 *
 * Exit code 0 only when every checked credential would log in today.
 */
import { Pool } from 'pg';
import { loadDatabaseConfig } from '../server/config.js';
import { verifyPassword } from '../server/auth/password.js';
import { normalizeMobile } from '../server/auth/mobile.js';
import { AUTH_SEED_ACCOUNTS } from '../server/seed/auth-accounts.js';

type Verdict = 'OK' | 'MISSING' | 'DISABLED' | 'BAD_PASSWORD' | 'WRONG_ACCOUNT' | 'ERROR';

interface Check {
  mobile: string;
  role: string;
  displayName: string;
  verdict: Verdict;
  note: string;
  /** Only set when the caller supplied a credential to test. */
  testedPassword?: string;
}

interface AuthRow {
  id: string;
  mobile: string;
  password_hash: string;
  role: string;
  display_name: string;
  is_active: boolean;
  is_test_user: boolean;
}

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : undefined;
}

async function main(): Promise<void> {
  const json = process.argv.includes('--json');
  const settings = loadDatabaseConfig();
  const pool = new Pool(settings.pool);

  const suppliedMobile = normalizeMobile(flag('--mobile'));
  const suppliedPassword = flag('--password');

  // One target list: a single operator-supplied credential, or the 13 demo
  // identities from the same array the seeder uses.
  const targets = suppliedMobile
    ? [
        {
          mobile: suppliedMobile,
          role: '(caller)',
          displayName: '',
          password: suppliedPassword ?? '',
        },
      ]
    : AUTH_SEED_ACCOUNTS.map((account) => ({
        mobile: normalizeMobile(account.mobile) ?? account.mobile,
        role: account.role,
        displayName: account.displayName,
        password: account.password,
      }));

  try {
    const rows = await pool
      .query<AuthRow>(
        `SELECT id, mobile, password_hash, role, display_name, is_active, is_test_user
           FROM auth_users
          WHERE mobile = ANY($1::text[])`,
        [targets.map((target) => target.mobile)],
      )
      .catch((error: Error) => {
        throw new Error(
          `cannot read auth_users (${error.message}) — is this the app database? run: bun run db:init`,
        );
      });

    const byMobile = new Map(rows.rows.map((row) => [row.mobile, row]));

    const checks: Check[] = [];
    for (const target of targets) {
      const row = byMobile.get(target.mobile);
      const base = { mobile: target.mobile, role: target.role, displayName: target.displayName };

      if (!row) {
        checks.push({ ...base, verdict: 'MISSING', note: 'no auth_users row for this mobile' });
        continue;
      }
      // A row may hold the number under a stable UUID we have never seen: it
      // was created by hand, by bootstrap, or by an admin. The seeder refuses
      // to hijack it, so say so instead of implying the seed will fix it.
      const expectedId = AUTH_SEED_ACCOUNTS.find((account) => normalizeMobile(account.mobile) === target.mobile)?.id;
      if (!suppliedMobile && expectedId && row.id !== expectedId) {
        checks.push({
          ...base,
          verdict: 'WRONG_ACCOUNT',
          note: `mobile belongs to account ${row.id} — db:seed:auth will skip it, never overwrite it`,
        });
        continue;
      }
      if (!row.is_active) {
        checks.push({ ...base, verdict: 'DISABLED', note: 'is_active = false — the account was deactivated' });
        continue;
      }
      if (!target.password) {
        checks.push({ ...base, verdict: 'OK', note: 'account exists and is active (no password supplied)' });
        continue;
      }
      const valid = await verifyPassword(target.password, row.password_hash);
      checks.push(
        valid
          ? {
              ...base,
              verdict: 'OK',
              note: `password verifies${row.is_test_user ? ' (dev seed row)' : ''}`,
              ...(suppliedMobile ? { testedPassword: target.password } : {}),
            }
          : {
              ...base,
              verdict: 'BAD_PASSWORD',
              note: 'account exists and is active, but the password does NOT verify',
            },
      );
    }

    const counts = checks.reduce<Record<string, number>>((acc, check) => {
      acc[check.verdict] = (acc[check.verdict] ?? 0) + 1;
      return acc;
    }, {});
    const ok = checks.every((check) => check.verdict === 'OK');

    if (json) {
      console.log(
        JSON.stringify(
          { target: settings.target, ok, counts, checks: checks.map(({ testedPassword, ...rest }) => rest) },
          null,
          2,
        ),
      );
    } else {
      console.log(`[auth:doctor] target  ${settings.target} (ssl: ${settings.sslMode})`);
      console.log(`[auth:doctor] checked ${checks.length} credential(s)\n`);
      console.log('  result        mobile        role                     note');
      console.log('  ------------  ------------  -----------------------  ------------------------------------------');
      for (const check of checks) {
        console.log(
          `  ${check.verdict.padEnd(12)}  ${check.mobile.padEnd(12)}  ${String(check.role).padEnd(23)}  ${check.note}`,
        );
      }
      console.log('');
      if (counts.MISSING || counts.WRONG_ACCOUNT) {
        console.log(
          '[auth:doctor] the demo accounts are NOT provisioned in this database — that is exactly what the\n' +
            '[auth:doctor] login 401 means. Create them against this same connection string:\n' +
            '[auth:doctor]     bun run db:seed:auth --init',
        );
      }
      if (counts.BAD_PASSWORD) {
        console.log(
          '[auth:doctor] some accounts exist with a different password (changed by hand or by a previous\n' +
            '[auth:doctor] operator). Re-running db:seed:auth resets them to the published demo values.',
        );
      }
      if (counts.DISABLED) {
        console.log('[auth:doctor] some accounts are deactivated — reactivate them from the role manager.');
      }
      console.log(ok ? '[auth:doctor] OK — every checked credential would log in' : '[auth:doctor] FAILED — see above');
    }

    if (!ok) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[auth:doctor] failed:', (error as Error).message);
  process.exit(1);
});
