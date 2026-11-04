/* =========================================================================
   User mining — early-warning signals about the people using the system.

   The goal is to notice a struggling account BEFORE its owner opens a
   support ticket: an account nobody ever activated, a privileged operator
   who stopped signing in, a role that cannot open any page, a scoped user
   whose activity drifted outside their province, or a shared account with
   many live sessions.

   WHERE THE TIME COMES FROM
   `audit_logs.timestamp` is a PERSIAN DISPLAY STRING written by the client
   (e.g. «۱۴۰۵/۸/۱۳ - ۱۰:۳۰»), not a sortable instant, so it cannot drive a
   date window. Every time-based rule here therefore reads real `timestamptz`
   columns: `auth_users.created_at` for account age and `refresh_tokens`
   (created/expiry/revocation) for session recency. Audit rows still supply
   counts by action type, the newest event label (ordered by the identity
   `seq`) and the set of provinces/counties the account has written in.

   Access to the caller is enforced in the route (`requireRoles`); this module
   only assembles the report and masks mobile numbers so the payload is safe
   for a triage screen.
   ========================================================================= */

import { desc, eq, sql } from 'drizzle-orm';
import type {
  UserMiningIssueSummary,
  UserMiningReport,
  UserMiningRiskLevel,
  UserMiningSeverity,
  UserMiningSignal,
  UserMiningSignalCode,
  UserMiningUser,
  UserRole,
} from '../../../src/types.js';
import { withDbErrorMapping } from '../errors.js';
import { db } from '../client.js';
import { auditLogs, authUsers, refreshTokens, rolesPermissions, users } from '../schema.js';

const SEVERITY_WEIGHT: Record<UserMiningSeverity, number> = {
  CRITICAL: 45,
  HIGH: 25,
  MEDIUM: 12,
  LOW: 4,
};

const SEVERITY_RANK: Record<UserMiningSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

interface SignalMeta {
  label: string;
  recommendation: string;
}

const SIGNAL_META: Record<UserMiningSignalCode, SignalMeta> = {
  NEVER_SIGNED_IN: {
    label: 'هرگز وارد نشده',
    recommendation: 'راهنمای ورود و رمز عبور را برای کاربر بفرستید و یک تماس فعال‌سازی بگیرید.',
  },
  DORMANT_ACCOUNT: {
    label: 'حساب راکد',
    recommendation: 'علت عدم استفاده را پیگیری کنید و در صورت تغییر مسئولیت، دسترسی را بازبینی کنید.',
  },
  ACCOUNT_DISABLED: {
    label: 'حساب غیرفعال',
    recommendation: 'اگر تعلیق موقت است کاربر را مطلع کنید؛ اگر دائمی است سابقه و نشست‌ها را ببندید.',
  },
  PRIVILEGED_DORMANT: {
    label: 'دسترسی حساس بی‌استفاده',
    recommendation: 'حساب دارای دسترسی حساس را بازبینی یا غیرفعال کنید.',
  },
  NO_TASK_ACTIVITY: {
    label: 'ورود بدون اقدام',
    recommendation: 'یک جلسه آموزش کوتاه یا راهنمای گام‌به‌گام متناسب با همین نقش ارسال کنید.',
  },
  ROLE_WITHOUT_ACCESS: {
    label: 'نقش بدون مسیر دسترسی',
    recommendation: 'ماتریس دسترسی این نقش را در «نقش‌ها و دسترسی» اصلاح کنید.',
  },
  SCOPE_DRIFT: {
    label: 'فعالیت خارج از محدوده',
    recommendation: 'محدوده مجاز کاربر را تأیید یا اصلاح کنید تا دادهٔ خارج از قلمرو ثبت نشود.',
  },
  SESSION_SPRAWL: {
    label: 'نشست‌های متعدد فعال',
    recommendation: 'نشست‌های قدیمی را ببندید و احتمال اشتراک‌گذاری حساب را بررسی کنید.',
  },
};

/** Roles whose compromise or abandonment matters beyond one page. */
const PRIVILEGED_ROLES: ReadonlySet<UserRole> = new Set([
  'SYSTEM_ADMIN',
  'TECH_SUPPORT',
  'BUDGET_CHAIRMAN',
  'TREASURY_FINANCE_HEAD',
]);

const DAY_MS = 86_400_000;

interface AuditAggregate {
  actorUserId: string;
  logins: number;
  actions: number;
  lastActionLabel: string | null;
  provinces: string[] | null;
  counties: string[] | null;
}

interface SessionAggregate {
  userId: string;
  lastSessionAt: Date | string | null;
  activeSessions: number;
}

const toDays = (from: Date | string | null | undefined): number | null => {
  if (!from) return null;
  const ms = new Date(from).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor((Date.now() - ms) / DAY_MS));
};

const toIso = (value: Date | string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
};

/** `09991234567` → `0999***67`; the report never carries a full number. */
const maskMobile = (mobile: string): string =>
  mobile.replace(/^(\d{0,4})(\d*)(\d{2})$/, (_match, head: string, _middle: string, tail: string) =>
    `${head}***${tail}`,
  );

const riskLevelFor = (score: number): UserMiningRiskLevel => {
  if (score >= SEVERITY_WEIGHT.CRITICAL) return 'CRITICAL';
  if (score >= SEVERITY_WEIGHT.HIGH) return 'HIGH';
  if (score >= SEVERITY_WEIGHT.MEDIUM) return 'MEDIUM';
  if (score > 0) return 'LOW';
  return 'HEALTHY';
};

/**
 * Build the report. `dormantDays` is a threshold (7–180), not a lookback
 * window: every signal is evaluated against the account's real timestamps.
 */
export async function buildUserMiningReport(dormantDaysInput: number): Promise<UserMiningReport> {
  const dormantDays = Math.max(7, Math.min(180, Math.floor(Number(dormantDaysInput)) || 30));

  return withDbErrorMapping(async () => {
    const [roleRows, accountRows, auditRows, sessionRows] = await Promise.all([
      db.select().from(rolesPermissions),
      db
        .select({
          id: authUsers.id,
          mobile: authUsers.mobile,
          displayName: authUsers.displayName,
          role: authUsers.role,
          isActive: authUsers.isActive,
          isTestUser: authUsers.isTestUser,
          createdAt: authUsers.createdAt,
          authProvince: authUsers.province,
          authCounty: authUsers.county,
          profileName: users.name,
          profileRoleFa: users.roleFa,
          profileProvince: users.province,
          profileCounty: users.county,
        })
        .from(authUsers)
        // `users.id` is text (legacy roster ids predate UUIDs) while the auth
        // id is uuid, so the comparison must be explicit — PostgreSQL has no
        // implicit text = uuid operator. Roster rows for real accounts carry
        // the auth UUID as text (see seed/auth-accounts and POST /auth/users).
        .leftJoin(users, eq(users.id, sql`${authUsers.id}::text`))
        .orderBy(desc(authUsers.createdAt)),
      db
        .select({
          actorUserId: auditLogs.actorUserId,
          logins:
            sql<number>`count(*) filter (where ${auditLogs.actionType} = 'LOGIN')`.mapWith(Number),
          actions:
            sql<number>`count(*) filter (where ${auditLogs.actionType} not in ('LOGIN', 'LOGOUT'))`.mapWith(
              Number,
            ),
          lastActionLabel:
            sql<string | null>`(array_agg(${auditLogs.timestamp} order by ${auditLogs.seq} desc))[1]`,
          provinces:
            sql<
              string[]
            >`coalesce(array_agg(distinct ${auditLogs.province}) filter (where ${auditLogs.province} is not null), array[]::text[])`,
          counties:
            sql<
              string[]
            >`coalesce(array_agg(distinct ${auditLogs.county}) filter (where ${auditLogs.county} is not null), array[]::text[])`,
        })
        .from(auditLogs)
        .groupBy(auditLogs.actorUserId),
      db
        .select({
          userId: refreshTokens.userId,
          lastSessionAt: sql<Date | null>`max(${refreshTokens.createdAt})`,
          activeSessions:
            sql<number>`count(*) filter (where ${refreshTokens.revokedAt} is null and ${refreshTokens.consumedAt} is null and ${refreshTokens.expiresAt} > now())`.mapWith(
              Number,
            ),
        })
        .from(refreshTokens)
        .groupBy(refreshTokens.userId),
    ]);

    const roles = new Map(roleRows.map((row) => [row.role, row]));
    const audits = new Map<string, AuditAggregate>(
      auditRows.map((row) => [row.actorUserId, row] as const),
    );
    const sessions = new Map<string, SessionAggregate>(
      sessionRows.map((row) => [row.userId, row] as const),
    );

    const mined: UserMiningUser[] = accountRows.map((account) => {
      const role = account.role as UserRole;
      const roleRow = roles.get(role);
      const roleFa = roleRow?.roleTitleFa ?? account.profileRoleFa ?? role;
      const audit = audits.get(account.id);
      const session = sessions.get(account.id);

      const accountAgeDays = toDays(account.createdAt) ?? 0;
      const lastSessionDays = toDays(session?.lastSessionAt);
      const logins = audit?.logins ?? 0;
      const actions = audit?.actions ?? 0;
      const activeSessions = session?.activeSessions ?? 0;

      const hasWrite =
        (roleRow?.canEditDepartments ?? false) ||
        (roleRow?.canManageBudget ?? false) ||
        (roleRow?.canManageCrises ?? false) ||
        (roleRow?.canManagePriorities ?? false) ||
        (roleRow?.canCreateProject ?? false) ||
        (roleRow?.canApproveProjects ?? false) ||
        (roleRow?.canManageExecutors ?? false) ||
        (roleRow?.canManageContractors ?? false);
      const canNavigate =
        !!roleRow &&
        (roleRow.canViewDashboard || hasWrite || roleRow.canAuditLogs || roleRow.canExportReports);

      const province = account.profileProvince ?? account.authProvince ?? undefined;
      const county = account.profileCounty ?? account.authCounty ?? undefined;
      const privileged = PRIVILEGED_ROLES.has(role);

      const signals: UserMiningSignal[] = [];
      const addSignal = (code: UserMiningSignalCode, severity: UserMiningSeverity, detail: string) => {
        signals.push({
          code,
          severity,
          label: SIGNAL_META[code].label,
          detail,
          recommendation: SIGNAL_META[code].recommendation,
        });
      };

      if (!canNavigate) {
        addSignal(
          'ROLE_WITHOUT_ACCESS',
          'CRITICAL',
          'این نقش در ماتریس دسترسی هیچ صفحهٔ قابل‌ورودی ندارد؛ کاربر پس از ورود به بن‌بست می‌رسد.',
        );
      }

      if (!account.isActive) {
        addSignal('ACCOUNT_DISABLED', 'MEDIUM', 'حساب غیرفعال است و ورود کاربر با خطا رد می‌شود.');
      }

      if (!session && logins === 0) {
        if (accountAgeDays >= 1) {
          addSignal(
            'NEVER_SIGNED_IN',
            'HIGH',
            `حساب ${accountAgeDays.toLocaleString('fa-IR')} روز پیش ساخته شده و هنوز هیچ ورودی ثبت نکرده است.`,
          );
        }
      } else if (lastSessionDays !== null && lastSessionDays >= dormantDays && account.isActive) {
        addSignal(
          'DORMANT_ACCOUNT',
          privileged ? 'HIGH' : 'MEDIUM',
          `آخرین نشست این حساب ${lastSessionDays.toLocaleString('fa-IR')} روز پیش بوده است.`,
        );
      }

      if (privileged && lastSessionDays !== null && lastSessionDays >= 14 && lastSessionDays < dormantDays) {
        addSignal(
          'PRIVILEGED_DORMANT',
          'HIGH',
          `دسترسی حساس پس از ${lastSessionDays.toLocaleString('fa-IR')} روز استفاده نشده است.`,
        );
      }

      if (logins > 0 && actions === 0 && hasWrite) {
        addSignal(
          'NO_TASK_ACTIVITY',
          'MEDIUM',
          'کاربر وارد سامانه شده اما هیچ رویداد کاری غیر از ورود/خروج ثبت نکرده است.',
        );
      }

      if (province && audit?.provinces && audit.provinces.length > 0) {
        const foreign = audit.provinces.filter((value) => value && value !== province);
        if (foreign.length > 0) {
          addSignal(
            'SCOPE_DRIFT',
            'MEDIUM',
            `در سابقهٔ این حساب رویدادهایی از ${foreign.slice(0, 2).join('، ')} ثبت شده در حالی که محدودهٔ منتسب ${province} است.`,
          );
        }
      }

      if (activeSessions >= 3) {
        addSignal(
          'SESSION_SPRAWL',
          'LOW',
          `${activeSessions.toLocaleString('fa-IR')} نشست فعال هم‌زمان برای این حساب باز است.`,
        );
      }

      const riskScore = signals.reduce((sum, signal) => sum + SEVERITY_WEIGHT[signal.severity], 0);

      return {
        id: account.id,
        name: account.profileName ?? account.displayName,
        mobileMasked: maskMobile(account.mobile),
        role,
        roleFa,
        province,
        county,
        isActive: account.isActive,
        isTestUser: account.isTestUser,
        accountAgeDays,
        lastSessionAt: toIso(session?.lastSessionAt),
        lastActionLabel: audit?.lastActionLabel ?? undefined,
        logins,
        actions,
        activeSessions,
        riskScore,
        riskLevel: riskLevelFor(riskScore),
        signals,
      };
    });

    mined.sort((a, b) => b.riskScore - a.riskScore || a.name.localeCompare(b.name, 'fa'));

    const issuesByCode = new Map<UserMiningSignalCode, UserMiningIssueSummary>();
    for (const user of mined) {
      for (const signal of user.signals) {
        const existing = issuesByCode.get(signal.code);
        if (existing) existing.count += 1;
        else
          issuesByCode.set(signal.code, {
            code: signal.code,
            label: signal.label,
            severity: signal.severity,
            count: 1,
            recommendation: signal.recommendation,
          });
      }
    }

    const issues = [...issuesByCode.values()].sort(
      (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.count - a.count,
    );

    return {
      generatedAt: new Date().toISOString(),
      dormantDays,
      totals: {
        accounts: mined.length,
        activeAccounts: mined.filter((user) => user.isActive).length,
        inactiveAccounts: mined.filter((user) => !user.isActive).length,
        usersWithSignals: mined.filter((user) => user.signals.length > 0).length,
        criticalUsers: mined.filter((user) => user.riskLevel === 'CRITICAL').length,
        neverSignedIn: mined.filter((user) => user.signals.some((s) => s.code === 'NEVER_SIGNED_IN')).length,
        dormant: mined.filter(
          (user) => user.signals.some((s) => s.code === 'DORMANT_ACCOUNT' || s.code === 'PRIVILEGED_DORMANT'),
        ).length,
      },
      issues,
      users: mined,
    };
  });
}
