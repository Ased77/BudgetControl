import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatToman, formatNumber, toPersianDigits } from '../utils/numberUtils';
import { DashboardPredictiveEngine } from './DashboardPredictiveEngine';
import {
  ShieldAlert,
  Wallet,
  Building2,
  FolderKanban,
  AlertTriangle,
  Users2,
  HardHat,
  ArrowRight,
  Flame,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Scale,
  DollarSign,
  PieChart,
  Activity,
  Layers,
} from 'lucide-react';

export const NationalDashboardView: React.FC = () => {
  const {
    departments,
    budgetSources,
    projects,
    executors,
    contractors,
    crisesHarms,
    priorities,
    currentPercentages,
    selectedLocation,
    optimizationMetrics,
    setActiveTab,
    handleApplySmartRecommendations,
  } = useAppContext();

  // Financial aggregates
  const totalBudgetSources = useMemo(
    () => budgetSources.reduce((s, b) => s + b.totalAmountToman, 0),
    [budgetSources]
  );
  const totalAllocatedToProjects = useMemo(
    () => projects.reduce((s, p) => s + p.estimatedCostToman, 0),
    [projects]
  );
  const totalBeneficiaries = useMemo(
    () => projects.reduce((s, p) => s + p.beneficiariesCount, 0),
    [projects]
  );
  const criticalCrisesCount = useMemo(
    () => crisesHarms.filter((c) => c.urgency === 'CRITICAL').length,
    [crisesHarms]
  );

  return (
    <div id="national-dashboard-view-root" className="space-y-6">
      {/* Hero Macro Strip (Light Theme) */}
      <div id="national-dashboard-view-hero-macro-strip-light-theme" className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 rounded-3xl p-6 md:p-8 text-slate-900 border border-blue-200/80 shadow-sm relative overflow-hidden">
        {/* Subtle accent glow */}
        <div id="national-dashboard-view-subtle-accent-glow" className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div id="national-dashboard-view-subtle-accent-glow-2" className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div id="national-dashboard-view-subtle-accent-glow-3" className="relative z-10">
          <div id="national-dashboard-view-subtle-accent-glow-4" className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div id="national-dashboard-view-subtle-accent-glow-5" className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-700">سامانه پایش هوشمند توسعه</span>
            </div>

            <div id="national-dashboard-view-subtle-accent-glow-6" className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleApplySmartRecommendations}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>بهینه‌سازی زنده تخصیص بر مبنای محرومیت</span>
              </button>

              <button
                onClick={() => setActiveTab('PROJECTS')}
                className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold text-xs border border-slate-300 shadow-2xs transition-colors"
              >
                <FolderKanban className="w-4 h-4 text-blue-600" />
                <span>مشاهده رصد پروژه‌ها</span>
              </button>
            </div>
          </div>

          {/* Primary Macro KPI Cards */}
          <div id="national-dashboard-view-primary-macro-kpi-cards" className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 pt-4 border-t border-blue-200/60">
            <div id="national-dashboard-view-primary-macro-kpi-cards-2" className="bg-white/90 rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div id="national-dashboard-view-primary-macro-kpi-cards-3" className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
                <span>کل منابع مالی مصوب</span>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xl md:text-2xl font-black text-emerald-700 block font-mono">
                {formatToman(totalBudgetSources)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">از {toPersianDigits(budgetSources.length)} منبع و سرفصل فعال</span>
            </div>

            <div id="national-dashboard-view-primary-macro-kpi-cards-4" className="bg-white/90 rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div id="national-dashboard-view-primary-macro-kpi-cards-5" className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
                <span>پروژه‌های اجرایی فعال</span>
                <FolderKanban className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xl md:text-2xl font-black text-slate-900 block font-mono">
                {toPersianDigits(projects.length)} پروژه
              </span>
              <span className="text-[11px] text-blue-700 mt-1 block font-mono font-medium">
                ارزش: {formatToman(totalAllocatedToProjects)}
              </span>
            </div>

            <div
              id="national-dashboard-view-primary-macro-kpi-cards-6"
              onClick={() => setActiveTab('POPULATION')}
              className="bg-white/90 hover:bg-cyan-50/50 rounded-2xl p-4 border border-slate-200 hover:border-cyan-300 shadow-2xs transition-all cursor-pointer group"
              title="کلیک برای مشاهده جزئیات در تب آمار جمعیت"
            >
              <div id="national-dashboard-view-primary-macro-kpi-cards-7" className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
                <span className="group-hover:text-cyan-800 transition-colors">جمعیت محروم شناسایی‌شده</span>
                <div id="national-dashboard-view-primary-macro-kpi-cards-8" className="flex items-center gap-1 text-[10px] text-cyan-600 font-bold bg-cyan-50 px-1.5 py-0.5 rounded-md border border-cyan-200">
                  <span>تب جمعیت</span>
                  <ArrowRight className="w-3 h-3 rotate-180" />
                </div>
              </div>
              <span className="text-xl md:text-2xl font-black text-cyan-700 block font-mono">
                {formatNumber(selectedLocation.indicators.vulnerableGroupsPopulation)} نفر
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                از {formatNumber(selectedLocation.population)} نفر ({toPersianDigits(((selectedLocation.indicators.vulnerableGroupsPopulation / selectedLocation.population) * 100).toFixed(1))}٪ جمعیت کل)
              </span>
            </div>

            <div id="national-dashboard-view-primary-macro-kpi-cards-9" className="bg-white/90 rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div id="national-dashboard-view-primary-macro-kpi-cards-10" className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
                <span>صرفه‌جویی ضد موازی‌کاری</span>
                <ShieldAlert className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-xl md:text-2xl font-black text-amber-700 block font-mono">
                {formatToman(optimizationMetrics.potentialSavingsToman)}
              </span>
              <span className="text-[11px] text-amber-800 mt-1 block font-medium">جلوگیری از اتلاف منابع</span>
            </div>
          </div>
        </div>
      </div>

      {/* Predictive Analysis Engine Module */}
      <DashboardPredictiveEngine />

      {/* Two-Column Grid: Multi-Source Budget Pipeline & Critical Crises */}
      <div id="national-dashboard-view-two-column-grid-multi-source" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Multi-Source Budget Pipeline */}
        <div id="national-dashboard-view-card-1-multi-source-budget" className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div id="national-dashboard-view-card-1-multi-source-budget-2">
            <div id="national-dashboard-view-card-1-multi-source-budget-3" className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div id="national-dashboard-view-card-1-multi-source-budget-4" className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  تفکیک سرفصل‌های تأمین مالی (مسئولیت اجتماعی، دولتی، دهیاری)
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('BUDGET_SOURCES')}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
              >
                <span>مدیریت منابع</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>

            <div id="national-dashboard-view-card-1-multi-source-budget-5" className="space-y-3">
              {budgetSources.map((source) => {
                const percent =
                  source.totalAmountToman > 0
                    ? Math.round((source.allocatedAmountToman / source.totalAmountToman) * 100)
                    : 0;

                return (
                  <div
                    id={`national-dashboard-view-card-1-multi-source-budget-6-${source.id}`}
                    key={source.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5"
                  >
                    <div id={`national-dashboard-view-card-1-multi-source-budget-7-${source.id}`} className="flex items-center justify-between font-bold">
                      <span className="text-slate-900 dark:text-slate-100">{source.title}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono">{formatToman(source.totalAmountToman)}</span>
                    </div>

                    <div id={`national-dashboard-view-card-1-multi-source-budget-8-${source.id}`} className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{source.sponsorOrganization} ({source.sourceTypeFa})</span>
                      <span>مصرف: {toPersianDigits(percent)}٪</span>
                    </div>

                    <div id={`national-dashboard-view-card-1-multi-source-budget-9-${source.id}`} className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        id={`national-dashboard-view-card-1-multi-source-budget-10-${source.id}`}
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div id="national-dashboard-view-card-1-multi-source-budget-11" className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>مجموع منابع قابل برنامه‌ریزی:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{formatToman(totalBudgetSources)}</span>
          </div>
        </div>

        {/* Card 2: Critical Crises Requiring Intervention */}
        <div id="national-dashboard-view-card-2-critical-crises" className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div id="national-dashboard-view-card-2-critical-crises-2">
            <div id="national-dashboard-view-card-2-critical-crises-3" className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div id="national-dashboard-view-card-2-critical-crises-4" className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  کانون‌های بحرانی و آسیب‌های دارای فوریت بالا
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('CRISES_HARMS')}
                className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline flex items-center gap-1"
              >
                <span>مشاهده همه</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>

            <div id="national-dashboard-view-card-2-critical-crises-5" className="space-y-3">
              {crisesHarms.slice(0, 4).map((crisis) => (
                <div
                  id={`national-dashboard-view-card-2-critical-crises-6-${crisis.id}`}
                  key={crisis.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5"
                >
                  <div id={`national-dashboard-view-card-2-critical-crises-7-${crisis.id}`} className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{crisis.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        crisis.urgency === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {crisis.urgency === 'CRITICAL' ? 'بحرانی' : 'شدت بالا'}
                    </span>
                  </div>

                  <div id={`national-dashboard-view-card-2-critical-crises-8-${crisis.id}`} className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      {crisis.county} ({crisis.districtOrVillage})
                    </span>
                    <span className="font-mono">متأثرین: {formatNumber(crisis.affectedPopulation)} نفر</span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1">{crisis.recommendedIntervention}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="national-dashboard-view-card-2-critical-crises-9" className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">تعداد کانون‌های بحرانی حل‌نشده:</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">{toPersianDigits(criticalCrisesCount)} کانون فعال</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards to All System Pillars */}
      <div id="national-dashboard-view-quick-navigation-cards-to-all" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveTab('DEPARTMENTS')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-500 transition-all text-right group"
        >
          <Building2 className="w-5 h-5 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">نهادها و ادارات</span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{toPersianDigits(departments.length)} متولی</span>
        </button>

        <button
          onClick={() => setActiveTab('BUDGET_SOURCES')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500 transition-all text-right group"
        >
          <Wallet className="w-5 h-5 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">منابع و بودجه</span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{toPersianDigits(budgetSources.length)} سرفصل مالی</span>
        </button>

        <button
          onClick={() => setActiveTab('EXECUTORS')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-cyan-500 transition-all text-right group"
        >
          <Users2 className="w-5 h-5 text-cyan-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">مجریان طرح‌ها</span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{toPersianDigits(executors.length)} نهاد مجری</span>
        </button>

        <button
          onClick={() => setActiveTab('CONTRACTORS')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-500 transition-all text-right group"
        >
          <HardHat className="w-5 h-5 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">پیمانکاران ذیصلاح</span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{toPersianDigits(contractors.length)} شرکت معتبر</span>
        </button>

        <button
          onClick={() => setActiveTab('PRIORITIES')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-500 transition-all text-right group"
        >
          <Scale className="w-5 h-5 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">اولویت‌های توسعه</span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{toPersianDigits(priorities.length)} سرفصل اولویت</span>
        </button>

        <button
          onClick={() => setActiveTab('CRISES_HARMS')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-rose-500 transition-all text-right group"
        >
          <Flame className="w-5 h-5 text-rose-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">آسیب‌ها و بحران‌ها</span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{toPersianDigits(crisesHarms.length)} مورد ثبت‌شده</span>
        </button>
      </div>
    </div>
  );
};
