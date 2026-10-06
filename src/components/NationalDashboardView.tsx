import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatMoney, formatMoneyParts, formatNumber, formatPercent } from '../utils/numberUtils';
import { Num } from './Num';
import { DashboardPredictiveEngine } from './DashboardPredictiveEngine';
import { PageHeader } from './PageHeader';
import {
  ShieldAlert,
  Wallet,
  Building2,
  FolderKanban,
  Users2,
  HardHat,
  ArrowRight,
  Flame,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  Scale,
  Activity,
} from 'lucide-react';

/**
 * KPI card shell — one card level, equal heights, spacing on the 4/8/12/16/24
 * scale. `tone` maps to the semantic status tokens (see index.css @theme):
 * `neutral` for regular figures, `warning`/`risk` for deprivation and gaps,
 * `success` for positive outcomes.
 */
const KPI_CARD_TONES: Record<'neutral' | 'warning' | 'success', { icon: string; value: string }> = {
  neutral: { icon: 'text-slate-500', value: 'text-slate-900' },
  warning: { icon: 'text-amber-600', value: 'text-amber-700' },
  success: { icon: 'text-emerald-600', value: 'text-emerald-700' },
};

export const NationalDashboardView: React.FC = () => {
  const {
    departments,
    budgetSources,
    projects,
    executors,
    contractors,
    crisesHarms,
    priorities,
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
  const criticalCrisesCount = useMemo(
    () => crisesHarms.filter((c) => c.urgency === 'CRITICAL').length,
    [crisesHarms]
  );

  // The engine reports the budget its duplicate-detection actually prevented
  // from being wasted. Zero (or no projects yet) means "not calculated yet" —
  // the card then renders the empty state below instead of a fake ۰ figure.
  const antiDuplicationSavingsToman = optimizationMetrics.preventedWastedBudgetToman ?? 0;
  const savingsCalculated = antiDuplicationSavingsToman > 0;

  const vulnerablePopulation = selectedLocation.indicators.vulnerableGroupsPopulation;
  const vulnerableSharePct =
    selectedLocation.population > 0 ? (vulnerablePopulation / selectedLocation.population) * 100 : 0;

  return (
    <div id="national-dashboard-view-root" className="space-y-6">
      <PageHeader
        id="national-dashboard-view-page-header"
        icon={Activity}
        title="داشبورد ملی توسعه متوازن"
        subtitle={`پایش کلان منابع، شاخص‌های محرومیت و تخصیص بهینه اعتبارات`}
        tone="text-blue-600"
        breadcrumb={
          <nav aria-label="محدوده جغرافیایی داده‌ها" className="flex flex-wrap items-center gap-1">
            <span>کشور</span>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>{selectedLocation.province}</span>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span className="font-bold text-slate-700">{selectedLocation.county}</span>
            <span className="ms-2 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-700">
              داده‌های این صفحه محدود به همین شهرستان است
            </span>
          </nav>
        }
        adornment={
          <span className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-full px-2.5 py-1 bg-white">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            سامانه پایش هوشمند توسعه
          </span>
        }
      >
        {/* One primary CTA per section; «رصد پروژه‌ها» is deliberately secondary. */}
        <button
          onClick={handleApplySmartRecommendations}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors"
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span>بهینه‌سازی زنده تخصیص</span>
        </button>

        <button
          onClick={() => setActiveTab('PROJECTS')}
          className="flex items-center gap-2 bg-transparent hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold text-xs border border-slate-300 transition-colors"
        >
          <FolderKanban className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>مشاهده رصد پروژه‌ها</span>
        </button>
      </PageHeader>

      {/* Primary Macro KPI Cards — compact strip so the forecast chart below
          stays visible on a 1080p screen without scrolling. */}
      <div id="national-dashboard-view-primary-macro-kpi-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* کل منابع مالی مصوب — regular KPI: neutral ink */}
        <div id="national-dashboard-view-kpi-budget-sources" className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col gap-2 h-full min-h-28">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>کل منابع مالی مصوب</span>
            <Wallet className={`w-4 h-4 ${KPI_CARD_TONES.neutral.icon}`} aria-hidden="true" />
          </div>
          <Num
            {...formatMoneyParts(totalBudgetSources)}
            className={`text-xl md:text-2xl font-black leading-none ${KPI_CARD_TONES.neutral.value}`}
          />
          <span className="text-xs text-slate-500">
            از {formatNumber(budgetSources.length)} منبع و سرفصل فعال
          </span>
        </div>

        {/* پروژه‌های اجرایی فعال — regular KPI: neutral ink */}
        <div id="national-dashboard-view-kpi-projects" className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col gap-2 h-full min-h-28">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>پروژه‌های اجرایی فعال</span>
            <FolderKanban className={`w-4 h-4 ${KPI_CARD_TONES.neutral.icon}`} aria-hidden="true" />
          </div>
          <Num
            value={formatNumber(projects.length)}
            unit="پروژه"
            className={`text-xl md:text-2xl font-black leading-none ${KPI_CARD_TONES.neutral.value}`}
            unitClassName="text-xs font-bold text-slate-500 ms-1.5"
          />
          <span className="text-xs text-slate-500">
            ارزش: <Num value={formatMoney(totalAllocatedToProjects)} className="font-bold text-slate-700" />
          </span>
        </div>

        {/* جمعیت محروم — deprivation is a risk indicator: warning amber */}
        <div
          id="national-dashboard-view-kpi-vulnerable-population"
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab('POPULATION')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('POPULATION'); } }}
          aria-label={`جمعیت محروم شناسایی‌شده ${formatNumber(vulnerablePopulation)} نفر — مشاهده جزئیات در تب آمار جمعیت`}
          title="کلیک برای مشاهده جزئیات در تب آمار جمعیت"
          className="bg-white hover:bg-amber-50/40 rounded-2xl p-4 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer group flex flex-col gap-2 h-full min-h-28"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span className="group-hover:text-amber-800 transition-colors">جمعیت محروم شناسایی‌شده</span>
            <Users2 className={`w-4 h-4 ${KPI_CARD_TONES.warning.icon}`} aria-hidden="true" />
          </div>
          <Num
            value={formatNumber(vulnerablePopulation)}
            unit="نفر"
            className={`text-xl md:text-2xl font-black leading-none ${KPI_CARD_TONES.warning.value}`}
            unitClassName="text-xs font-bold text-slate-500 ms-1.5"
          />
          <span className="text-xs text-slate-500">
            از {formatNumber(selectedLocation.population)} نفر (
            <Num value={formatPercent(vulnerableSharePct)} className="font-bold text-amber-700" /> جمعیت کل)
          </span>
        </div>

        {/* صرفه‌جویی ضد موازی‌کاری — a positive outcome when calculated;
            otherwise an honest empty state instead of a fake «۰ تومان». */}
        <div id="national-dashboard-view-kpi-anti-duplication" className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col gap-2 h-full min-h-28">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>صرفه‌جویی ضد موازی‌کاری</span>
            <ShieldAlert
              className={`w-4 h-4 ${savingsCalculated ? KPI_CARD_TONES.success.icon : 'text-slate-500'}`}
              aria-hidden="true"
            />
          </div>
          {savingsCalculated ? (
            <>
              <Num
                {...formatMoneyParts(antiDuplicationSavingsToman)}
                className={`text-xl md:text-2xl font-black leading-none ${KPI_CARD_TONES.success.value}`}
              />
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                جلوگیری از اتلاف منابع
              </span>
            </>
          ) : (
            /* Empty state — quiet by design: muted icon, caption-sized text,
               no hero number. The figure appears once the duplicate-detection
               engine has actually evaluated projects. */
            <div className="flex flex-col gap-1" aria-live="polite">
              <span className="text-sm font-bold text-slate-600">هنوز محاسبه نشده</span>
              <span className="text-xs text-slate-500 leading-relaxed">
                پس از ثبت پروژه‌ها، موتور تشخیص موازی‌کاری مبلغی را که از اتلاف نجات داده است اینجا نمایش می‌دهد.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Predictive Analysis Engine Module */}
      <DashboardPredictiveEngine />

      {/* Two-Column Grid: Multi-Source Budget Pipeline & Critical Crises */}
      <div id="national-dashboard-view-two-column-grid-multi-source" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Multi-Source Budget Pipeline */}
        <div id="national-dashboard-view-card-1-multi-source-budget" className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col justify-between">
          <div id="national-dashboard-view-card-1-multi-source-budget-2">
            <div id="national-dashboard-view-card-1-multi-source-budget-3" className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
              <div id="national-dashboard-view-card-1-multi-source-budget-4" className="flex items-center gap-2 min-w-0">
                <Wallet className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                <h3 className="font-bold text-sm text-slate-900">
                  تفکیک سرفصل‌های تأمین مالی (مسئولیت اجتماعی، دولتی، دهیاری)
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('BUDGET_SOURCES')}
                className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1 shrink-0"
              >
                <span>مدیریت منابع</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
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
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5"
                  >
                    <div id={`national-dashboard-view-card-1-multi-source-budget-7-${source.id}`} className="flex items-center justify-between gap-2 font-bold">
                      <span className="text-slate-900">{source.title}</span>
                      <Num {...formatMoneyParts(source.totalAmountToman)} className="text-emerald-700" />
                    </div>

                    <div id={`national-dashboard-view-card-1-multi-source-budget-8-${source.id}`} className="flex items-center justify-between text-xs text-slate-500">
                      <span>{source.sponsorOrganization} ({source.sourceTypeFa})</span>
                      <span>
                        مصرف: <Num value={formatPercent(percent)} className="font-bold text-slate-700" />
                      </span>
                    </div>

                    <div id={`national-dashboard-view-card-1-multi-source-budget-9-${source.id}`} className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
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

          <div id="national-dashboard-view-card-1-multi-source-budget-11" className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>مجموع منابع قابل برنامه‌ریزی:</span>
            <Num {...formatMoneyParts(totalBudgetSources)} className="font-black text-slate-900" />
          </div>
        </div>

        {/* Card 2: Critical Crises Requiring Intervention — risk semantics */}
        <div id="national-dashboard-view-card-2-critical-crises" className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col justify-between">
          <div id="national-dashboard-view-card-2-critical-crises-2">
            <div id="national-dashboard-view-card-2-critical-crises-3" className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
              <div id="national-dashboard-view-card-2-critical-crises-4" className="flex items-center gap-2 min-w-0">
                <Flame className="w-5 h-5 text-risk shrink-0" aria-hidden="true" />
                <h3 className="font-bold text-sm text-slate-900">
                  کانون‌های بحرانی و آسیب‌های دارای فوریت بالا
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('CRISES_HARMS')}
                className="text-xs text-risk-strong font-bold hover:underline flex items-center gap-1 shrink-0"
              >
                <span>مشاهده همه</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
              </button>
            </div>

            <div id="national-dashboard-view-card-2-critical-crises-5" className="space-y-3">
              {crisesHarms.slice(0, 4).map((crisis) => (
                <div
                  id={`national-dashboard-view-card-2-critical-crises-6-${crisis.id}`}
                  key={crisis.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5"
                >
                  <div id={`national-dashboard-view-card-2-critical-crises-7-${crisis.id}`} className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{crisis.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${
                        crisis.urgency === 'CRITICAL'
                          ? 'bg-risk-soft text-risk-strong border border-red-200'
                          : 'bg-warning-soft text-warning-strong border border-amber-200'
                      }`}
                    >
                      {crisis.urgency === 'CRITICAL' ? 'بحرانی' : 'شدت بالا'}
                    </span>
                  </div>

                  <div id={`national-dashboard-view-card-2-critical-crises-8-${crisis.id}`} className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {crisis.county} ({crisis.districtOrVillage})
                    </span>
                    <span>
                      متأثرین: <Num value={formatNumber(crisis.affectedPopulation)} unit="نفر" className="font-bold text-slate-700" unitClassName="text-slate-500 ms-0.5" />
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-1" title={crisis.recommendedIntervention}>{crisis.recommendedIntervention}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="national-dashboard-view-card-2-critical-crises-9" className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">تعداد کانون‌های بحرانی حل‌نشده:</span>
            <Num
              value={formatNumber(criticalCrisesCount, true, 0)}
              unit="کانون فعال"
              className="font-black text-risk-strong"
              unitClassName="text-[0.9em] font-bold text-risk-strong ms-1"
            />
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards to All System Pillars */}
      <div id="national-dashboard-view-quick-navigation-cards-to-all" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <button
          onClick={() => setActiveTab('DEPARTMENTS')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-400 transition-colors text-start group"
        >
          <Building2 className="w-5 h-5 text-slate-500 group-hover:text-indigo-600 mb-2 transition-colors" aria-hidden="true" />
          <span className="font-bold text-xs text-slate-900 block">نهادها و ادارات</span>
          <span className="text-xs text-slate-500 mt-0.5 block">{formatNumber(departments.length)} متولی</span>
        </button>

        <button
          onClick={() => setActiveTab('BUDGET_SOURCES')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-400 transition-colors text-start group"
        >
          <Wallet className="w-5 h-5 text-slate-500 group-hover:text-emerald-600 mb-2 transition-colors" aria-hidden="true" />
          <span className="font-bold text-xs text-slate-900 block">منابع و بودجه</span>
          <span className="text-xs text-slate-500 mt-0.5 block">{formatNumber(budgetSources.length)} سرفصل مالی</span>
        </button>

        <button
          onClick={() => setActiveTab('EXECUTORS')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-cyan-400 transition-colors text-start group"
        >
          <Users2 className="w-5 h-5 text-slate-500 group-hover:text-cyan-600 mb-2 transition-colors" aria-hidden="true" />
          <span className="font-bold text-xs text-slate-900 block">مجریان طرح‌ها</span>
          <span className="text-xs text-slate-500 mt-0.5 block">{formatNumber(executors.length)} نهاد مجری</span>
        </button>

        <button
          onClick={() => setActiveTab('CONTRACTORS')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-400 transition-colors text-start group"
        >
          <HardHat className="w-5 h-5 text-slate-500 group-hover:text-amber-600 mb-2 transition-colors" aria-hidden="true" />
          <span className="font-bold text-xs text-slate-900 block">پیمانکاران ذیصلاح</span>
          <span className="text-xs text-slate-500 mt-0.5 block">{formatNumber(contractors.length)} شرکت معتبر</span>
        </button>

        <button
          onClick={() => setActiveTab('PRIORITIES')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-purple-400 transition-colors text-start group"
        >
          <Scale className="w-5 h-5 text-slate-500 group-hover:text-purple-600 mb-2 transition-colors" aria-hidden="true" />
          <span className="font-bold text-xs text-slate-900 block">اولویت‌های توسعه</span>
          <span className="text-xs text-slate-500 mt-0.5 block">{formatNumber(priorities.length)} سرفصل اولویت</span>
        </button>

        <button
          onClick={() => setActiveTab('CRISES_HARMS')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-rose-400 transition-colors text-start group"
        >
          <Flame className="w-5 h-5 text-slate-500 group-hover:text-rose-600 mb-2 transition-colors" aria-hidden="true" />
          <span className="font-bold text-xs text-slate-900 block">آسیب‌ها و بحران‌ها</span>
          <span className="text-xs text-slate-500 mt-0.5 block">{formatNumber(crisesHarms.length)} مورد ثبت‌شده</span>
        </button>
      </div>
    </div>
  );
};
