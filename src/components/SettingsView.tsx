import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { AdministrativeLevel, OrgType } from '../types';
import { PageHeader } from './PageHeader';
import { Num } from './Num';
import { formatMoneyParts, formatNumber } from '../utils/numberUtils';
import { exportToCsv } from '../utils/excelExport';
import { api } from '../services/api';
import {
  Settings,
  Building2,
  Save,
  CheckCircle2,
  MapPin,
  Database,
  Download,
  FileSpreadsheet,
  FolderKanban,
  Wallet,
  Flame,
  Briefcase,
  HardHat,
  Scale,
  Server,
  Users,
  ShieldCheck,
  History,
  LayoutGrid,
} from 'lucide-react';
import AnimatedContent from './AnimatedContent/AnimatedContent';

/**
 * Labels for the organization-type dropdown. The union carries five legal
 * forms; the settings form offers all of them so a config that already uses
 * one of the less common values is never silently rewritten by opening it.
 */
const ORG_TYPE_LABELS: Record<OrgType, string> = {
  GOVERNMENT: 'دولتی',
  PUBLIC: 'عمومی / شبه دولتی',
  PRIVATE: 'خصوصی',
  SEMI_PRIVATE: 'نیمه‌خصوصی',
  COOPERATIVE: 'تعاونی',
};

/**
 * Human labels for the active analysis scope. The scope itself is derived from
 * the selected location (see `handleSelectLocation`), so this page shows it as
 * a read-only fact rather than an editable control that could drift out of
 * step with the location picker.
 */
const SCOPE_LABELS: Record<AdministrativeLevel, string> = {
  NATIONAL: 'ملی / کشوری',
  PROVINCIAL: 'استانی',
  COUNTY: 'شهرستانی',
  RURAL_DISTRICT: 'بخشداری / دهیاری',
};

/**
 * سامانه's settings page: the one place for the facts the rest of the app
 * treats as configuration rather than data.
 *
 * Four cards, each bound to state that already exists in `AppContext`, so the
 * page cannot drift from what the workspace actually runs on:
 *
 *  - سازمان و بودجه — organization profile and the approved CSR budget, saved
 *    through `handleSaveOrgConfig` (API + audit log).
 *  - محدوده فعال — the active location, which is the single switch the whole
 *    system follows (scope, indicators, smart allocation).
 *  - داده‌ها و پشتیبان — record counts plus JSON backup and the CSR allocation
 *    CSV report.
 *  - درباره سامانه — live API/storage health, the signed-in identity and
 *    shortcuts into roles and the audit trail.
 */
export const SettingsView: React.FC = () => {
  const {
    orgConfig,
    handleSaveOrgConfig,
    locations,
    selectedLocation,
    handleSelectLocation,
    administrativeScope,
    priorities,
    currentPercentages,
    projects,
    departments,
    budgetSources,
    crisesHarms,
    executors,
    contractors,
    analysisSources,
    rolesPermissions,
    users,
    auditLogs,
    currentUser,
    setActiveTab,
    addAuditLog,
  } = useAppContext();

  // Organization form — a local copy so typing never rewrites global state
  // until the operator saves, and re-seeded whenever the context version
  // changes (save round-trip, another tab, a location switch updating it).
  const [name, setName] = useState(orgConfig.name);
  const [orgType, setOrgType] = useState<OrgType>(orgConfig.orgType);
  const [activitySector, setActivitySector] = useState(orgConfig.activitySector);
  const [fiscalYear, setFiscalYear] = useState(orgConfig.fiscalYear);
  const [totalBudget, setTotalBudget] = useState(orgConfig.totalBudget);
  const [description, setDescription] = useState(orgConfig.description ?? '');

  useEffect(() => {
    setName(orgConfig.name);
    setOrgType(orgConfig.orgType);
    setActivitySector(orgConfig.activitySector);
    setFiscalYear(orgConfig.fiscalYear);
    setTotalBudget(orgConfig.totalBudget);
    setDescription(orgConfig.description ?? '');
  }, [orgConfig]);

  const isDirty =
    name !== orgConfig.name ||
    orgType !== orgConfig.orgType ||
    activitySector !== orgConfig.activitySector ||
    fiscalYear !== orgConfig.fiscalYear ||
    totalBudget !== orgConfig.totalBudget ||
    description !== (orgConfig.description ?? '');

  const [savedAt, setSavedAt] = useState<number | null>(null);
  useEffect(() => {
    if (savedAt === null) return;
    const timer = window.setTimeout(() => setSavedAt(null), 3000);
    return () => window.clearTimeout(timer);
  }, [savedAt]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveOrgConfig({
      ...orgConfig,
      name: name.trim() || orgConfig.name,
      orgType,
      activitySector: activitySector.trim(),
      fiscalYear: fiscalYear.trim(),
      totalBudget: Number.isFinite(totalBudget) ? Math.max(0, totalBudget) : orgConfig.totalBudget,
      description: description.trim(),
      updatedAt: new Date().toISOString(),
    });
    setSavedAt(Date.now());
  };

  const budgetHint = formatMoneyParts(totalBudget);

  // Live backend/storage status, so «تنظیمات» doubles as the place an operator
  // checks whether the PostgreSQL persistence layer is actually answering.
  const [health, setHealth] = useState<{ status: string; persistence: string } | null>(null);
  const [healthFailed, setHealthFailed] = useState(false);
  useEffect(() => {
    api.health()
      .then(setHealth)
      .catch(() => setHealthFailed(true));
  }, []);

  const datasetCounts = useMemo(
    () => [
      { id: 'projects', label: 'پروژه‌های اجرایی', count: projects.length, icon: FolderKanban, tile: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' },
      { id: 'departments', label: 'ادارات و نهادها', count: departments.length, icon: Building2, tile: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' },
      { id: 'budget-sources', label: 'منابع بودجه', count: budgetSources.length, icon: Wallet, tile: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' },
      { id: 'priorities', label: 'اولویت‌های CSR', count: priorities.length, icon: Scale, tile: 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400' },
      { id: 'crises', label: 'بحران‌ها و آسیب‌ها', count: crisesHarms.length, icon: Flame, tile: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400' },
      { id: 'executors', label: 'دستگاه‌های مجری', count: executors.length, icon: Briefcase, tile: 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400' },
      { id: 'contractors', label: 'پیمانکاران', count: contractors.length, icon: HardHat, tile: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400' },
      { id: 'analysis-sources', label: 'منابع تحلیل', count: analysisSources.length, icon: Database, tile: 'bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400' },
    ],
    [projects, departments, budgetSources, priorities, crisesHarms, executors, contractors, analysisSources]
  );

  const recordCount = datasetCounts.reduce((sum, d) => sum + d.count, 0);

  /** Full-workspace JSON backup, generated client-side from the live context. */
  const handleBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser.name,
      organization: orgConfig,
      activeLocation: selectedLocation,
      locations,
      priorities,
      currentPercentages,
      projects,
      departments,
      budgetSources,
      crisesHarms,
      executors,
      contractors,
      analysisSources,
      rolesPermissions,
      users,
      auditLogs,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `csr-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addAuditLog(
      'EXPORT_REPORT',
      'نسخه پشتیبان کامل (JSON)',
      'دریافت شد',
      `${formatNumber(recordCount)} رکورد`,
      'دریافت پشتیبان داده از صفحه تنظیمات'
    );
  };

  /** The same allocation report the dashboard export menu produces. */
  const handleAllocationCsv = () => {
    exportToCsv(orgConfig, priorities, currentPercentages, orgConfig.totalBudget);
    addAuditLog(
      'EXPORT_REPORT',
      'گزارش تخصیص بودجه CSR (CSV)',
      'دریافت شد',
      `${formatNumber(priorities.length)} سرفصل`,
      'خروجی گزارش تخصیص از صفحه تنظیمات'
    );
  };

  const openAuditTrail = () => {
    // RolesAndAccessView picks its sub-tab from the hash on mount, so the hash
    // must be in place before the tab switch renders it.
    window.location.hash = '#audit-logs';
    setActiveTab('ROLES_PERMISSIONS');
  };

  return (
    <AnimatedContent
      id="settings-view-root"
      className="space-y-4"
      container="#app-scrollable-main-workspace"
      distance={24}
      duration={0.5}
      ease="power2.out"
      stagger={0.06}
      threshold={0.05}
    >
      <PageHeader
        id="settings-view-page-header"
        icon={Settings}
        title="تنظیمات سامانه"
        subtitle="مشخصات سازمان و بودجه، محدوده فعال، پشتیبان‌گیری داده‌ها و وضعیت سامانه"
        tone="text-slate-600 dark:text-slate-300"
      />

      {/* ۱. سازمان و بودجه */}
      <form
        id="settings-view-organization-card"
        onSubmit={handleSave}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 space-y-4"
      >
        <div id="settings-view-organization-header" className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-sm text-slate-900 dark:text-slate-100">مشخصات سازمان و بودجه مسئولیت اجتماعی</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                این مقادیر در سراسر سامانه — از داشبورد تا گزارش‌های بودجه — به‌عنوان مرجع سازمانی استفاده می‌شوند.
              </p>
            </div>
          </div>
          {savedAt !== null && (
            <span id="settings-view-save-success" className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-1 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              ذخیره شد
            </span>
          )}
        </div>

        <div id="settings-view-organization-form" className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label htmlFor="settings-view-org-name" className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              نام کامل سازمان
            </label>
            <input
              id="settings-view-org-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="settings-view-org-type" className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              نوع سازمان
            </label>
            <select
              id="settings-view-org-type"
              value={orgType}
              onChange={(e) => setOrgType(e.target.value as OrgType)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {(Object.keys(ORG_TYPE_LABELS) as OrgType[]).map((key) => (
                <option key={key} value={key}>
                  {ORG_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="settings-view-activity-sector" className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              حوزه اصلی فعالیت
            </label>
            <input
              id="settings-view-activity-sector"
              type="text"
              value={activitySector}
              onChange={(e) => setActivitySector(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="settings-view-fiscal-year" className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              دوره / سال مالی مصوب
            </label>
            <input
              id="settings-view-fiscal-year"
              type="text"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="settings-view-total-budget" className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              بودجه کل مسئولیت اجتماعی (تومان)
            </label>
            <input
              id="settings-view-total-budget"
              type="number"
              required
              min={0}
              step={1000000}
              value={totalBudget}
              onChange={(e) => setTotalBudget(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div id="settings-view-total-budget-hint" className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span>معادل:</span>
              <bdi dir="ltr" className="tabular-nums font-black text-slate-800 dark:text-slate-100">{budgetHint.value}</bdi>
              <span>{budgetHint.unit}</span>
            </div>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="settings-view-org-description" className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              توضیحات و مصوبه مجمع
            </label>
            <textarea
              id="settings-view-org-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            id="settings-view-save-org"
            type="submit"
            disabled={!isDirty}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>ذخیره تغییرات</span>
          </button>
        </div>
      </form>

      <AnimatedContent
        className="grid grid-cols-1 xl:grid-cols-2 gap-4"
        container="#app-scrollable-main-workspace"
        distance={24}
        duration={0.5}
        ease="power2.out"
        stagger={0.06}
        threshold={0.05}
      >
        {/* ۲. محدوده فعال */}
        <div
          id="settings-view-workspace-card"
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 space-y-4"
        >
          <div className="flex items-start gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-sm text-slate-900 dark:text-slate-100">محدوده فعال سامانه</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                تغییر محدوده، سطح تحلیلی و پیشنهادهای هوشمند را برای همه صفحات بازتنظیم می‌کند.
              </p>
            </div>
          </div>

          <div className="text-xs">
            <label htmlFor="settings-view-location-select" className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              استان / شهرستان فعال
            </label>
            <select
              id="settings-view-location-select"
              value={selectedLocation.id}
              onChange={(e) => {
                const next = locations.find((l) => l.id === e.target.value);
                if (next) handleSelectLocation(next);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.province} — {loc.county}
                  {loc.district ? ` (${loc.district})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div id="settings-view-workspace-summary" className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
              <span className="block text-slate-400 mb-1">سطح تحلیلی فعال</span>
              <span className="font-black text-slate-800 dark:text-slate-100">{SCOPE_LABELS[administrativeScope]}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
              <span className="block text-slate-400 mb-1">قلمرو ثبت‌شده</span>
              <span className="font-black text-slate-800 dark:text-slate-100">
                {selectedLocation.province} — {selectedLocation.county}
              </span>
            </div>
          </div>

          <button
            id="settings-view-open-locations"
            type="button"
            onClick={() => setActiveTab('LOCATIONS')}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            ویرایش شاخص‌های محلی محدوده
          </button>
        </div>

        {/* ۴. درباره سامانه (کنار محدوده، تا دو کارت کوتاه هم‌قد بمانند) */}
        <div
          id="settings-view-about-card"
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 space-y-4"
        >
          <div className="flex items-start gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-sm text-slate-900 dark:text-slate-100">درباره سامانه</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                وضعیت اتصال و موتور ذخیره‌سازی، همراه با میان‌برهای حاکمیتی.
              </p>
            </div>
          </div>

          <div id="settings-view-system-health" className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Database className="w-3.5 h-3.5" />
              موتور ذخیره‌سازی
            </span>
            {healthFailed ? (
              <span className="font-bold text-rose-600 dark:text-rose-400">اتصال برقرار نشد</span>
            ) : health ? (
              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                متصل — {health.persistence === 'postgresql' ? 'PostgreSQL' : health.persistence}
              </span>
            ) : (
              <span className="text-slate-400">در حال بررسی…</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-[11px]">
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
              <Users className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <Num value={formatNumber(users.length)} className="block font-black text-slate-900 dark:text-slate-100" />
              <span className="text-slate-400">کاربر</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
              <ShieldCheck className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
              <Num value={formatNumber(rolesPermissions.length)} className="block font-black text-slate-900 dark:text-slate-100" />
              <span className="text-slate-400">نقش</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
              <History className="w-4 h-4 text-violet-500 mx-auto mb-1" />
              <Num value={formatNumber(auditLogs.length)} className="block font-black text-slate-900 dark:text-slate-100" />
              <span className="text-slate-400">رویداد ثبت‌شده</span>
            </div>
          </div>

          <div id="settings-view-about-user" className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">کاربر جاری</span>
            <span className="font-black text-slate-800 dark:text-slate-100 truncate">
              {currentUser.name} — {currentUser.roleFa}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="settings-view-open-roles"
              type="button"
              onClick={() => setActiveTab('ROLES_PERMISSIONS')}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              نقش‌ها و دسترسی
            </button>
            <button
              id="settings-view-open-audit-logs"
              type="button"
              onClick={openAuditTrail}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-2 hover:bg-violet-100 dark:hover:bg-violet-900/60 transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              لاگ ممیزی
            </button>
          </div>
        </div>
      </AnimatedContent>

      {/* ۳. داده‌ها و پشتیبان‌گیری */}
      <div
        id="settings-view-data-card"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 space-y-4"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-sm text-slate-900 dark:text-slate-100">داده‌ها و پشتیبان‌گیری</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                تصویری از داده‌های فعال سامانه برای بایگانی نظارتی و بازیابی در محیط دیگر.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2.5 py-1 shrink-0">
            <Num value={formatNumber(recordCount)} unit="رکورد" unitClassName="text-[0.85em] font-bold text-slate-500 dark:text-slate-400 ms-1" />
          </span>
        </div>

        <AnimatedContent
          id="settings-view-data-records"
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          container="#app-scrollable-main-workspace"
          distance={24}
          duration={0.5}
          ease="power2.out"
          stagger={0.06}
          threshold={0.05}
        >
          {datasetCounts.map((set) => {
            const SetIcon = set.icon;
            return (
              <div
                key={set.id}
                id={`settings-view-data-record-${set.id}`}
                className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3"
              >
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${set.tile}`}>
                  <SetIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <Num value={formatNumber(set.count)} className="block text-sm font-black text-slate-900 dark:text-slate-100 leading-none" />
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate" title={set.label}>{set.label}</span>
                </div>
              </div>
            );
          })}
        </AnimatedContent>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            id="settings-view-backup-json"
            type="button"
            onClick={handleBackup}
            className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            دریافت نسخه پشتیبان (JSON)
          </button>
          <button
            id="settings-view-export-csv"
            type="button"
            onClick={handleAllocationCsv}
            className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            خروجی گزارش تخصیص (CSV)
          </button>
        </div>
      </div>
    </AnimatedContent>
  );
};
