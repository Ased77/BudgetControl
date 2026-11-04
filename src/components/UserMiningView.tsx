/* =========================================================================
   داده‌کاوی کاربران — a triage screen that surfaces accounts likely to need
   help before their owners file a ticket.

   Server-computed (see server/db/repositories/user-mining.repository.ts):
   mobiles arrive masked, every rule is evaluated against real session and
   account timestamps, and the route itself is restricted to the technical
   manager and the system administrator. The client gate below is only a
   courtesy for direct rendering — it is not the security boundary.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Database,
  Loader2,
  Lock,
  Radar,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { PageHeader } from './PageHeader';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import type {
  UserMiningRiskLevel,
  UserMiningSeverity,
  UserMiningSignalCode,
  UserMiningUser,
} from '../types';

const fa = (value: number): string => value.toLocaleString('fa-IR');

const LEVEL_META: Record<
  UserMiningRiskLevel,
  { label: string; badge: string; dot: string; bar: string }
> = {
  CRITICAL: {
    label: 'بحرانی',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
  },
  HIGH: {
    label: 'بالا',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },
  MEDIUM: {
    label: 'متوسط',
    badge: 'bg-sky-50 text-sky-700 ring-sky-200',
    dot: 'bg-sky-500',
    bar: 'bg-sky-500',
  },
  LOW: {
    label: 'کم',
    badge: 'bg-slate-100 text-slate-600 ring-slate-200',
    dot: 'bg-slate-400',
    bar: 'bg-slate-400',
  },
  HEALTHY: {
    label: 'سالم',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
  },
};

const SEVERITY_META: Record<UserMiningSeverity, { label: string; chip: string }> = {
  CRITICAL: { label: 'بحرانی', chip: 'border-rose-200 bg-rose-50 text-rose-700' },
  HIGH: { label: 'بالا', chip: 'border-amber-200 bg-amber-50 text-amber-700' },
  MEDIUM: { label: 'متوسط', chip: 'border-sky-200 bg-sky-50 text-sky-700' },
  LOW: { label: 'کم', chip: 'border-slate-200 bg-slate-100 text-slate-600' },
};

const THRESHOLDS = [14, 30, 60, 90];

const lastSeenFa = (user: UserMiningUser): string => {
  if (user.lastSessionAt) {
    const ms = new Date(user.lastSessionAt).getTime();
    if (Number.isFinite(ms)) {
      const days = Math.max(0, Math.floor((Date.now() - ms) / 86_400_000));
      if (days === 0) return 'امروز';
      if (days === 1) return 'دیروز';
      return `${fa(days)} روز پیش`;
    }
  }
  if (user.lastActionLabel) return user.lastActionLabel;
  return 'بدون ورود';
};

const SCOPE_FA = (user: UserMiningUser): string => {
  if (user.county && user.province) return `${user.province} / ${user.county}`;
  return user.province ?? 'محدوده ملی';
};

function RiskBadge({ level }: { level: UserMiningRiskLevel }) {
  const meta = LEVEL_META[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      ریسک {meta.label}
    </span>
  );
}

export function UserMiningView() {
  const { currentUser, canAccessTab } = useAppContext();
  const allowed =
    currentUser.role === 'SYSTEM_ADMIN' ||
    currentUser.role === 'TECH_SUPPORT' ||
    canAccessTab('USER_MINING');

  const [dormantDays, setDormantDays] = useState(30);
  const [report, setReport] = useState<Awaited<ReturnType<typeof api.userMining>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<UserMiningRiskLevel | 'ALL'>('ALL');
  const [signal, setSignal] = useState<UserMiningSignalCode | null>(null);
  const [onlyIssues, setOnlyIssues] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await api.userMining(dormantDays));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت گزارش ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [dormantDays]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  const counts = useMemo(() => {
    const base: Record<UserMiningRiskLevel, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      HEALTHY: 0,
    };
    for (const user of report?.users ?? []) base[user.riskLevel] += 1;
    return base;
  }, [report]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (report?.users ?? []).filter((user) => {
      if (onlyIssues && user.signals.length === 0) return false;
      if (level !== 'ALL' && user.riskLevel !== level) return false;
      if (signal && !user.signals.some((item) => item.code === signal)) return false;
      if (!needle) return true;
      return [user.name, user.roleFa, user.mobileMasked, user.province, user.county]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [report, onlyIssues, level, signal, query]);

  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">دسترسی به این گزارش محدود است</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          «داده‌کاوی کاربران» فقط برای مدیر فنی و مدیر کل سامانه در دسترس است. این محدودیت در سرور
          نیز اعمال می‌شود.
        </p>
      </div>
    );
  }

  const totalAccounts = report?.totals.accounts ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        id="user-mining"
        icon={Radar}
        title="داده‌کاوی کاربران"
        subtitle="پیش از آنکه کاربر مشکلش را گزارش کند، نشانه‌های رکود، بن‌بست دسترسی و نشست‌های مشکوک را ببینید."
        adornment={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
              <Lock className="h-3.5 w-3.5" />
              مدیر فنی + مدیر کل سامانه
            </span>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              به‌روزرسانی
            </button>
          </div>
        }
      />

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">گزارش دریافت نشد</p>
            <p className="mt-1 text-xs leading-5 text-rose-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
          >
            تلاش دوباره
          </button>
        </div>
      )}

      {loading && !report ? (
        <div className="space-y-4" aria-busy="true" aria-label="در حال ساخت گزارش">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: 'کل حساب‌ها',
                value: report.totals.accounts,
                hint: `${fa(report.totals.inactiveAccounts)} غیرفعال`,
                icon: Users,
                tone: 'bg-slate-100 text-slate-600',
              },
              {
                label: 'حساب‌های فعال',
                value: report.totals.activeAccounts,
                hint: `${fa(report.totals.neverSignedIn)} هرگز وارد نشده`,
                icon: ShieldCheck,
                tone: 'bg-emerald-50 text-emerald-600',
              },
              {
                label: 'نیازمند بررسی',
                value: report.totals.usersWithSignals,
                hint: `${fa(report.totals.dormant)} راکد یا بی‌استفاده`,
                icon: AlertTriangle,
                tone: 'bg-amber-50 text-amber-600',
              },
              {
                label: 'ریسک بحرانی',
                value: report.totals.criticalUsers,
                hint: 'نقش بدون مسیر دسترسی',
                icon: ShieldAlert,
                tone: 'bg-rose-50 text-rose-600',
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">{kpi.label}</p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-slate-800">
                      {fa(kpi.value)}
                    </p>
                  </div>
                  <span className={`rounded-xl p-2 ${kpi.tone}`}>
                    <kpi.icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-[10px] text-slate-400">{kpi.hint}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700">توزیع ریسک حساب‌ها</h3>
              </div>
              <p className="text-[10px] text-slate-400">
                ساخته‌شده در{' '}
                {new Date(report.generatedAt).toLocaleString('fa-IR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'HEALTHY'] as const).map((key) =>
                counts[key] > 0 ? (
                  <div
                    key={key}
                    className={LEVEL_META[key].bar}
                    style={{ width: `${(counts[key] / Math.max(1, totalAccounts)) * 100}%` }}
                    title={`${LEVEL_META[key].label}: ${fa(counts[key])}`}
                  />
                ) : null,
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'HEALTHY'] as const).map((key) => (
                <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${LEVEL_META[key].dot}`} />
                  {LEVEL_META[key].label}
                  <span className="font-bold text-slate-700">{fa(counts[key])}</span>
                </span>
              ))}
            </div>
          </div>

          {report.issues.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">الگوهای شناسایی‌شده</h3>
                {signal && (
                  <button
                    type="button"
                    onClick={() => setSignal(null)}
                    className="text-[11px] font-bold text-sky-700 hover:underline"
                  >
                    پاک کردن فیلتر الگو
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {report.issues.map((issue) => {
                  const active = signal === issue.code;
                  return (
                    <button
                      key={issue.code}
                      type="button"
                      onClick={() => setSignal(active ? null : issue.code)}
                      aria-pressed={active}
                      className={`rounded-xl border p-3 text-right transition ${
                        active
                          ? 'border-sky-300 bg-sky-50 ring-1 ring-sky-200'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700">{issue.label}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${SEVERITY_META[issue.severity].chip}`}
                        >
                          {fa(issue.count)} حساب
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-slate-500">
                        {issue.recommendation}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
              <label className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="نام، نقش، موبایل یا محدوده…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-9 pl-3 text-xs text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <select
                value={level}
                onChange={(event) => setLevel(event.target.value as UserMiningRiskLevel | 'ALL')}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none focus:border-sky-300"
                aria-label="سطح ریسک"
              >
                <option value="ALL">همهٔ سطوح ریسک</option>
                <option value="CRITICAL">بحرانی</option>
                <option value="HIGH">بالا</option>
                <option value="MEDIUM">متوسط</option>
                <option value="LOW">کم</option>
                <option value="HEALTHY">سالم</option>
              </select>

              <select
                value={dormantDays}
                onChange={(event) => setDormantDays(Number(event.target.value))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none focus:border-sky-300"
                aria-label="آستانه رکود"
              >
                {THRESHOLDS.map((days) => (
                  <option key={days} value={days}>
                    آستانه رکود: {fa(days)} روز
                  </option>
                ))}
              </select>

              <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[11px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={onlyIssues}
                  onChange={(event) => setOnlyIssues(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600"
                />
                فقط نیازمند بررسی
              </label>

              <span className="ms-auto text-[11px] text-slate-400">
                {fa(filtered.length)} از {fa(report.users.length)} حساب
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="p-10 text-center">
                <ShieldCheck className="mx-auto h-9 w-9 text-emerald-400" />
                <p className="mt-3 text-sm font-bold text-slate-700">
                  {report.users.length === 0
                    ? 'هنوز حسابی برای بررسی وجود ندارد'
                    : 'با این فیلترها مشکلی پیدا نشد'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {report.users.length === 0
                    ? 'پس از ساخته‌شدن حساب‌ها، این گزارش به‌طور خودکار آن‌ها را ارزیابی می‌کند.'
                    : 'فیلترها را پاک کنید یا عبارت جست‌وجو را کوتاه‌تر کنید.'}
                </p>
                {report.users.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setLevel('ALL');
                      setSignal(null);
                      setOnlyIssues(false);
                    }}
                    className="mt-3 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
                  >
                    نمایش همهٔ حساب‌ها
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((user) => {
                  const open = expanded === user.id;
                  return (
                    <li key={user.id}>
                      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                            {user.name.trim().charAt(0) || '؟'}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-bold text-slate-800">{user.name}</span>
                              <RiskBadge level={user.riskLevel} />
                              {!user.isActive && (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                                  غیرفعال
                                </span>
                              )}
                              {user.isTestUser && (
                                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                                  آزمایشی
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {user.roleFa} · موبایل {user.mobileMasked} · {SCOPE_FA(user)}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              آخرین نشست: {lastSeenFa(user)} · ورود: {fa(user.logins)} · اقدام:{' '}
                              {fa(user.actions)} · نشست فعال: {fa(user.activeSessions)}
                            </p>
                            {user.signals.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {user.signals.map((item) => (
                                  <span
                                    key={item.code}
                                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${SEVERITY_META[item.severity].chip}`}
                                  >
                                    {item.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 sm:ps-4">
                          <span className="text-[10px] font-bold text-slate-400">
                            امتیاز {fa(user.riskScore)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpanded(open ? null : user.id)}
                            aria-expanded={open}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                          >
                            {open ? 'بستن' : 'جزئیات'}
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </div>
                      </div>

                      {open && (
                        <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-3 sm:px-4">
                          {user.signals.length === 0 ? (
                            <p className="text-xs text-emerald-700">
                              هیچ نشانهٔ مشکوکی برای این حساب دیده نمی‌شود.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {user.signals.map((item) => (
                                <li
                                  key={item.code}
                                  className="rounded-lg border border-slate-200 bg-white p-2.5"
                                >
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${SEVERITY_META[item.severity].chip}`}
                                    >
                                      {SEVERITY_META[item.severity].label}
                                    </span>
                                    <span className="text-xs font-bold text-slate-700">
                                      {item.label}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                                    {item.detail}
                                  </p>
                                  <p className="mt-1 text-[11px] font-medium leading-5 text-sky-700">
                                    اقدام پیشنهادی: {item.recommendation}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500 sm:grid-cols-4">
                            <span>عمر حساب: {fa(user.accountAgeDays)} روز</span>
                            <span>ورودها: {fa(user.logins)}</span>
                            <span>اقدام‌ها: {fa(user.actions)}</span>
                            <span>نشست فعال: {fa(user.activeSessions)}</span>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="px-1 text-[10px] leading-5 text-slate-400">
            شمارهٔ موبایل در سرور ماسک می‌شود و این گزارش فقط خواندنی است. آستانهٔ رکود بر اساس تاریخ
            واقعی نشست‌ها محاسبه می‌شود؛ رویدادهای ثبت‌شده در سابقهٔ حسابرسی برای شمارش اقدام‌ها و
            تشخیص فعالیت خارج از محدوده به کار می‌روند.
          </p>
        </>
      ) : null}
    </div>
  );
}
