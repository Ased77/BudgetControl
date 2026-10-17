import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatMoney, formatMoneyParts, formatNumber, formatPercent } from '../utils/numberUtils';
import { Num } from './Num';
import { AnimatedGauge } from './AnimatedGauge';
import { DashboardPredictiveEngine } from './DashboardPredictiveEngine';
import { DashboardChartsPanel } from './DashboardChartsPanel';
import { PageHeader } from './PageHeader';
import {
  ShieldAlert,
  Wallet,
  FolderKanban,
  Users2,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Activity,
  X,
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
  const [isBudgetSourcesModalOpen, setIsBudgetSourcesModalOpen] = useState(false);
  const {
    budgetSources,
    projects,
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
        <button
          id="national-dashboard-view-kpi-budget-sources"
          type="button"
          onClick={() => setIsBudgetSourcesModalOpen(true)}
          aria-haspopup="dialog"
          className="bg-white hover:bg-emerald-50/40 rounded-2xl p-4 border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer text-start flex flex-col gap-2 h-full min-h-28"
        >
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
        </button>

        {/* پروژه‌های اجرایی فعال — regular KPI: neutral ink. The figure is a
            doorway: the card navigates to the projects page, so a real <button>
            carries it rather than a div with role="button" — Enter and Space come
            from the element itself, and the whole card is one hit target. */}
        <button
          id="national-dashboard-view-kpi-projects"
          type="button"
          onClick={() => setActiveTab('PROJECTS')}
          aria-label={`پروژه‌های اجرایی فعال ${formatNumber(projects.length)} پروژه — مشاهده صفحه پروژه‌ها`}
          title="کلیک برای مشاهده صفحه پروژه‌ها"
          className="bg-white hover:bg-blue-50/40 rounded-2xl p-4 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer text-start flex flex-col gap-2 h-full min-h-28"
        >
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
        </button>

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

      {/* Dashboard analytics panel — the dashboard's own charts: deprivation
          profile, funding mix and drawdown, project portfolio, crisis map,
          department delivery and anti-duplication alerts. */}
      <DashboardChartsPanel />

      {isBudgetSourcesModalOpen && (
        <div
          id="national-dashboard-view-card-1-multi-source-budget-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setIsBudgetSourcesModalOpen(false)}
        >
          <div
            id="national-dashboard-view-card-1-multi-source-budget"
            role="dialog"
            aria-modal="true"
            aria-labelledby="national-dashboard-view-card-1-multi-source-budget-title"
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div id="national-dashboard-view-card-1-multi-source-budget-2">
              <div id="national-dashboard-view-card-1-multi-source-budget-3" className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div id="national-dashboard-view-card-1-multi-source-budget-4" className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
                    <Wallet className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 id="national-dashboard-view-card-1-multi-source-budget-title" className="text-base font-black leading-relaxed text-slate-900">
                      تفکیک سرفصل‌های تأمین مالی
                    </h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                      منابع مسئولیت اجتماعی، دولتی و دهیاری
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {formatNumber(budgetSources.length)} منبع
                  </span>
                  <button
                    onClick={() => setActiveTab('BUDGET_SOURCES')}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                  >
                    <span>مدیریت منابع</span>
                    <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBudgetSourcesModalOpen(false)}
                    aria-label="بستن"
                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div id="national-dashboard-view-card-1-multi-source-budget-5" className="space-y-3">
                {budgetSources.map((source) => {
                  const percent =
                    source.totalAmountToman > 0
                      ? Math.round((source.allocatedAmountToman / source.totalAmountToman) * 100)
                      : 0;
                  const progressPercent = Math.min(100, Math.max(0, percent));

                  return (
                    <div
                      id={`national-dashboard-view-card-1-multi-source-budget-6-${source.id}`}
                      key={source.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-emerald-200 sm:p-3.5"
                    >
                      <div id={`national-dashboard-view-card-1-multi-source-budget-7-${source.id}`} className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-stretch gap-3">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <AnimatedGauge
                            svgId={`national-dashboard-view-card-1-multi-source-budget-9-${source.id}`}
                            progressId={`national-dashboard-view-card-1-multi-source-budget-10-${source.id}`}
                            value={progressPercent}
                            radius={26}
                            center={32}
                            strokeWidth={5}
                            trackClassName="text-slate-100"
                            toneClassName="text-emerald-500"
                            pathLength={100}
                            rotateArc
                            ariaLabel={`درصد مصرف‌شده: ${formatPercent(percent)}`}
                            className="h-20 w-20 shrink-0 sm:h-24 sm:w-24"
                          >
                            <Num
                              value={formatPercent(percent)}
                              className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700"
                            />
                          </AnimatedGauge>
                          <span className="text-[10px] font-medium text-slate-500">مصرف‌شده</span>
                        </div>
                        <div className="flex min-w-[6.5rem] flex-col justify-center rounded-lg bg-emerald-50 px-2.5 py-2 text-left">
                          <span className="mb-1 block text-[10px] font-medium text-emerald-800/70">سقف منبع</span>
                          <Num {...formatMoneyParts(source.totalAmountToman)} className="whitespace-nowrap text-xs font-black text-emerald-800" />
                        </div>
                        <div className="flex min-w-0 flex-col justify-center">
                          <h3 className="line-clamp-2 break-words text-sm font-bold leading-relaxed text-slate-900" title={source.title}>
                            {source.title}
                          </h3>
                          <p className="mt-1 truncate text-xs leading-relaxed text-slate-500" title={source.sponsorOrganization}>
                            {source.sponsorOrganization}
                          </p>
                          <span
                            id={`national-dashboard-view-card-1-multi-source-budget-8-${source.id}`}
                            className="mt-2 max-w-full truncate self-start rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                            title={source.sourceTypeFa}
                          >
                            {source.sourceTypeFa}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div id="national-dashboard-view-card-1-multi-source-budget-11" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <span className="block text-xs font-semibold text-slate-600">مجموع منابع قابل برنامه‌ریزی</span>
                <span className="mt-0.5 block text-[10px] text-slate-400">{formatNumber(budgetSources.length)} منبع فعال</span>
              </div>
              <Num {...formatMoneyParts(totalBudgetSources)} className="text-sm font-black text-slate-900" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
