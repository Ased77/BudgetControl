import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatToman, formatNumber, toPersianDigits } from '../utils/numberUtils';
import {
  runDashboardPredictiveAnalysis,
  ForecastScenario,
  SectorDevelopmentForecast,
} from '../utils/predictiveAnalysisEngine';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  BrainCircuit,
  Sparkles,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Sliders,
  Layers,
  Calendar,
  CheckCircle2,
  FileClock,
  Building2,
  Activity,
  Droplets,
  HeartPulse,
  Briefcase,
  HardHat,
  Scale,
  X,
  ChevronDown,
} from 'lucide-react';

// Audit action badges (mirrors RolesAndAccessView audit trail styling)
const AUDIT_ACTION_LABELS: Record<string, { label: string; badge: string }> = {
  PERCENTAGE_CHANGE: { label: 'تنظیم درصد بودجه', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  BUDGET_UPDATE: { label: 'تغییر سقف کل بودجه', badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
  SCENARIO_APPLIED: { label: 'اعمال سناریوی AI', badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
  LOCATION_CHANGE: { label: 'تغییر موقعیت مکانی', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  DUPLICATE_FLAGGED: { label: 'هشدار موازی‌کاری', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  PRIORITY_ADD: { label: 'افزودن اولویت', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  PRIORITY_EDIT: { label: 'ویرایش اولویت', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  PRIORITY_DELETE: { label: 'حذف اولویت', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  PROJECT_ADD: { label: 'ثبت پروژه جدید', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  PROJECT_EDIT: { label: 'ویرایش پروژه', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  PROJECT_DELETE: { label: 'حذف پروژه', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  PROJECT_STATUS_CHANGE: { label: 'تغییر وضعیت پروژه', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  DEPARTMENT_ADD: { label: 'ثبت نهاد جدید', badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
  DEPARTMENT_EDIT: { label: 'ویرایش نهاد', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  DEPARTMENT_DELETE: { label: 'حذف نهاد', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  BUDGET_SOURCE_ADD: { label: 'ثبت منبع بودجه', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  BUDGET_SOURCE_EDIT: { label: 'ویرایش منبع بودجه', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  BUDGET_SOURCE_DELETE: { label: 'حذف منبع بودجه', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  CRISIS_ADD: { label: 'ثبت بحران جدید', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  CRISIS_EDIT: { label: 'ویرایش بحران', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  CRISIS_DELETE: { label: 'حذف بحران', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  EXECUTOR_ADD: { label: 'ثبت مجری جدید', badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
  EXECUTOR_EDIT: { label: 'ویرایش مجری', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  EXECUTOR_DELETE: { label: 'حذف مجری', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  CONTRACTOR_ADD: { label: 'ثبت پیمانکار جدید', badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
  CONTRACTOR_EDIT: { label: 'ویرایش پیمانکار', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  CONTRACTOR_DELETE: { label: 'حذف پیمانکار', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  EXPORT_REPORT: { label: 'خروجی گزارش', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  LOGIN: { label: 'ورود به سامانه', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  LOGOUT: { label: 'خروج از سامانه', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

export const DashboardPredictiveEngine: React.FC = () => {
  const {
    priorities,
    currentPercentages,
    budgetSources,
    projects,
    auditLogs,
    crisesHarms,
    selectedLocation,
    setActiveTab,
  } = useAppContext();

  // Scenario toggle
  const [scenario, setScenario] = useState<ForecastScenario>('BASE');
  const [chartType, setChartType] = useState<'BUDGET_VS_NEED' | 'SECTOR_TRENDS'>('BUDGET_VS_NEED');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');

  // Sector detail modal
  const [detailSector, setDetailSector] = useState<SectorDevelopmentForecast | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const openSectorDetail = (sector: SectorDevelopmentForecast) => {
    setDetailSector(sector);
    setExpandedLogId(null);
  };

  // Compute forecast
  const predictiveData = useMemo(() => {
    return runDashboardPredictiveAnalysis(
      priorities,
      currentPercentages,
      budgetSources,
      projects,
      auditLogs,
      crisesHarms,
      selectedLocation,
      scenario
    );
  }, [
    priorities,
    currentPercentages,
    budgetSources,
    projects,
    auditLogs,
    crisesHarms,
    selectedLocation,
    scenario,
  ]);

  const { timelineTrends, sectorForecasts, summaryMetrics, executiveInsight } = predictiveData;

  // Filtered sector list
  const filteredSectors = useMemo(() => {
    if (filterUrgency === 'ALL') return sectorForecasts;
    return sectorForecasts.filter((s) => s.urgencyStatus === filterUrgency);
  }, [sectorForecasts, filterUrgency]);

  // Per-urgency tab counts
  const urgencyCounts = useMemo(() => ({
    ALL: sectorForecasts.length,
    CRITICAL_SURGE: sectorForecasts.filter((s) => s.urgencyStatus === 'CRITICAL_SURGE').length,
    HIGH_GROWTH: sectorForecasts.filter((s) => s.urgencyStatus === 'HIGH_GROWTH').length,
  }), [sectorForecasts]);

  // Sector icon helper
  const getSectorIcon = (code: number) => {
    switch (code) {
      case 1:
        return <Droplets className="w-4 h-4 text-cyan-600" />;
      case 4:
        return <HeartPulse className="w-4 h-4 text-rose-600" />;
      case 2:
        return <Briefcase className="w-4 h-4 text-amber-600" />;
      case 3:
      case 6:
        return <Activity className="w-4 h-4 text-indigo-600" />;
      case 5:
        return <Building2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <HardHat className="w-4 h-4 text-blue-600" />;
    }
  };

  // Recharts Custom Tooltip
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div id="dashboard-predictive-engine-root" className="bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-xl text-xs space-y-1.5 font-sans z-50">
          <span className="font-bold text-slate-900 block pb-1 border-b border-slate-100 font-mono">
            سال مالی {label}
          </span>
          {payload.map((entry: any, index: number) => (
            <div id={`dashboard-predictive-engine-div-2-${index}`} key={`tooltip-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-bold font-mono text-slate-800">
                {formatToman(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="dashboard-predictive-engine-div-3" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
      {/* Engine Header & Scenario Selector (Light Theme) */}
      <div id="dashboard-predictive-engine-engine-header-scenario-selector" className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div id="dashboard-predictive-engine-engine-header-scenario-selector-2" className="space-y-1">
          <div id="dashboard-predictive-engine-engine-header-scenario-selector-3" className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
              موتور تحلیل پیش‌بین تقاضای توسعه‌ای
            </span>
            <span className="text-xs text-slate-500 font-medium">
              بر پایه تحلیل {toPersianDigits(summaryMetrics.totalLogInterventionsAnalyzed)} لاگ ممیزی و بودجه‌های تخصیص‌یافته
            </span>
          </div>

          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            پیش‌بینی نیازهای توسعه‌ای و اعتبارات سال آینده (۱۴۰۴-۱۴۰۵)
          </h2>
        </div>

        {/* Scenario Controls */}
        <div id="dashboard-predictive-engine-scenario-controls" className="bg-slate-50 p-2 rounded-xl border border-slate-200 shrink-0 space-y-1.5 self-start lg:self-auto">
          <div id="dashboard-predictive-engine-scenario-controls-2" className="flex items-center justify-between text-[11px] text-slate-600 font-bold px-1">
            <span>سناریوی مدل پیش‌بین:</span>
            <Sliders className="w-3 h-3 text-indigo-600" />
          </div>
          <div id="dashboard-predictive-engine-scenario-controls-3" className="flex items-center gap-1">
            <button
              onClick={() => setScenario('BASE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scenario === 'BASE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              سناریوی مبنا (تداوم روند)
            </button>
            <button
              onClick={() => setScenario('CRISIS_STRESS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scenario === 'CRISIS_STRESS'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              تشدید بحران‌های حاد
            </button>
            <button
              onClick={() => setScenario('ACCELERATED_DEVELOPMENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scenario === 'ACCELERATED_DEVELOPMENT'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              مهار ۱۰۰٪ محرومیت
            </button>
          </div>
        </div>
      </div>

      {/* 4 Macro Forecast KPI Cards */}
      <div id="dashboard-predictive-engine-4-macro-forecast-kpi-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div id="dashboard-predictive-engine-4-macro-forecast-kpi-cards-2" className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200">
          <div id="dashboard-predictive-engine-4-macro-forecast-kpi-cards-3" className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>برآورد کل نیاز بودجه‌ای ۱۴۰۴</span>
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="text-xl font-black text-indigo-700 block font-mono">
            {formatToman(summaryMetrics.projectedNextYearNeedToman)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            پوشش تقاضای واقعی مناطق محروم
          </span>
        </div>

        <div id="dashboard-predictive-engine-4-macro-forecast-kpi-cards-4" className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200">
          <div id="dashboard-predictive-engine-4-macro-forecast-kpi-cards-5" className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>نرخ رشد سالانه تقاضا</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-xl font-black text-amber-700 block font-mono">
            +{toPersianDigits(summaryMetrics.forecastedTotalGrowthPct)}٪
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            نسبت به بودجه مصوب جاری (۱۴۰۳)
          </span>
        </div>

        <div id="dashboard-predictive-engine-4-macro-forecast-kpi-cards-6" className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200">
          <div id="dashboard-predictive-engine-4-macro-forecast-kpi-cards-7" className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>بیشترین کانون جهش تقاضا</span>
            <Flame className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <span className="text-sm font-black text-rose-700 block truncate" title={summaryMetrics.highestPressureSector}>
            {summaryMetrics.highestPressureSector}
          </span>
          <span className="text-[11px] text-rose-700 font-mono mt-1 block font-semibold">
            رشد پیش‌بینی: +{toPersianDigits(summaryMetrics.highestGrowthPct)}٪
          </span>
        </div>

        <div id="dashboard-predictive-engine-4-macro-forecast-kpi-cards-8" className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200">
          <div id="dashboard-predictive-engine-4-macro-forecast-kpi-cards-9" className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>شکاف مالی پیش‌بینی‌شده</span>
            <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <span className="text-xl font-black text-purple-700 block font-mono">
            {formatToman(summaryMetrics.estimatedDeficitGapToman)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            نیاز به جذب منابع مسئولیت اجتماعی و خیرین
          </span>
        </div>
      </div>

      {/* Main Interactive Trend Chart Section */}
      <div id="dashboard-predictive-engine-main-interactive-trend-chart" className="bg-slate-50/50 rounded-2xl p-4 md:p-5 border border-slate-200 space-y-4">
        <div id="dashboard-predictive-engine-main-interactive-trend-chart-2" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div id="dashboard-predictive-engine-main-interactive-trend-chart-3" className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div id="dashboard-predictive-engine-main-interactive-trend-chart-4">
              <h3 className="font-bold text-sm text-slate-900">
                نمودار روند چندساله اعتبارات مصوب در برابر تقاضای واقعی پیش‌بینی‌شده
              </h3>
              <span className="text-[11px] text-slate-500">
                سوابق سنواتی (۱۴۰۱ و ۱۴۰۲)، سال مالی جاری (۱۴۰۳)، پیش‌بینی سال آینده (۱۴۰۴) و افق دو ساله (۱۴۰۵)
              </span>
            </div>
          </div>

          {/* Chart Type Toggle */}
          <div id="dashboard-predictive-engine-chart-type-toggle" className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-start sm:self-auto shadow-2xs">
            <button
              onClick={() => setChartType('BUDGET_VS_NEED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartType === 'BUDGET_VS_NEED'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مقایسه بودجه و نیاز
            </button>
            <button
              onClick={() => setChartType('SECTOR_TRENDS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartType === 'SECTOR_TRENDS'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              روند تفکیکی بخش‌ها
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div id="dashboard-predictive-engine-chart-canvas" className="h-72 md:h-80 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'BUDGET_VS_NEED' ? (
              <AreaChart data={timelineTrends} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNeed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis
                   stroke="#64748b"
                   tickFormatter={(val) => `${toPersianDigits((val / 1_000_000_000_000).toFixed(1))} همت`}
                   tick={{ fontSize: 11, fill: '#64748b' }}
                 />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
                  formatter={(value) => (
                    <span className="font-sans font-bold text-slate-700 px-1">{value}</span>
                  )}
                />
                <ReferenceLine
                  x="۱۴۰۳ (جاری)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{
                    value: 'مرز سال جاری',
                    position: 'top',
                    fill: '#b45309',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="projectedNeedToman"
                  name="نیاز واقعی توسعه‌ای پیش‌بینی‌شده"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorNeed)"
                />
                <Area
                  type="monotone"
                  dataKey="allocatedBudgetToman"
                  name="بودجه مصوب / تخصیص‌یافته"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorBudget)"
                />
              </AreaChart>
            ) : (
              <BarChart data={timelineTrends} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis
                   stroke="#64748b"
                   tickFormatter={(val) => `${toPersianDigits((val / 1_000_000_000_000).toFixed(1))} همت`}
                   tick={{ fontSize: 11, fill: '#64748b' }}
                 />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
                  formatter={(value) => (
                    <span className="font-sans font-bold text-slate-700 px-1">{value}</span>
                  )}
                />
                <Bar dataKey="waterNeedToman" name="آبرسانی و تنش آبی" stackId="a" fill="#0284c7" />
                <Bar dataKey="infrastructureNeedToman" name="عمران و راه روستایی" stackId="a" fill="#d97706" />
                <Bar dataKey="healthNeedToman" name="بهداشت، درمان و فوریت‌ها" stackId="a" fill="#e11d48" />
                <Bar dataKey="employmentNeedToman" name="اشتغال و توانمندسازی" stackId="a" fill="#059669" />
                <Bar dataKey="educationAndSocialToman" name="آموزش و حمایت اجتماعی" stackId="a" fill="#7c3aed" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend annotation */}
        <div id="dashboard-predictive-engine-legend-annotation" className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
          <div id="dashboard-predictive-engine-legend-annotation-2" className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              منحنی پیش‌بین حاصل ترکیب لاگ‌های تاریخی، تورم ساخت و نیازهای معوقه است.
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              بخش سبز نشان‌دهنده خط روند اعتبارات تصویب‌شده قطعی است.
            </span>
          </div>
          <span className="text-slate-400 font-mono">واحد ارقام: میلیارد و هزار میلیارد تومان</span>
        </div>
      </div>

      {/* Sector Forecast Details & Log-Derived Rationales */}
      <div id="dashboard-predictive-engine-sector-forecast-details-log" className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 md:p-5 space-y-4">
        <div id="dashboard-predictive-engine-sector-forecast-details-log-2" className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div id="dashboard-predictive-engine-sector-forecast-details-log-3" className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0">
              <Layers className="w-4 h-4 text-indigo-600" />
            </span>
            <div>
              <h3 className="font-black text-sm text-slate-900 leading-snug">
                تفکیک برآورد نیازهای توسعه‌ای سال آینده به همراه دلایل مستخرج از لاگ‌ها
              </h3>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                ارزیابی هوشمند اولویت‌ها بر اساس مداخلات ثبت‌شده و هشدارهای موازی‌کاری — برای جزئیات کامل، روی هر کارت بزنید
              </span>
            </div>
          </div>

          {/* Urgency filter tabs — segmented control with live counts */}
          <div id="dashboard-predictive-engine-filter-badges" className="flex items-center gap-1 self-start lg:self-auto bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setFilterUrgency('ALL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterUrgency === 'ALL'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <span>همه سرفصل‌ها</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${filterUrgency === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {toPersianDigits(urgencyCounts.ALL)}
              </span>
            </button>
            <button
              onClick={() => setFilterUrgency('CRITICAL_SURGE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterUrgency === 'CRITICAL_SURGE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-rose-50 hover:text-rose-700'
              }`}
            >
              <span>جهش بحرانی</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${filterUrgency === 'CRITICAL_SURGE' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'}`}>
                {toPersianDigits(urgencyCounts.CRITICAL_SURGE)}
              </span>
            </button>
            <button
              onClick={() => setFilterUrgency('HIGH_GROWTH')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterUrgency === 'HIGH_GROWTH'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              <span>رشد شتابان</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${filterUrgency === 'HIGH_GROWTH' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'}`}>
                {toPersianDigits(urgencyCounts.HIGH_GROWTH)}
              </span>
            </button>
          </div>
        </div>

        {/* Sector Cards Grid — summary only; click opens the full detail modal */}
        {filteredSectors.length > 0 ? (
        <div id="dashboard-predictive-engine-sector-cards-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSectors.map((sector) => (
            <div
              id="dashboard-predictive-engine-sector-cards-grid-card"
              key={sector.priorityId}
              onClick={() => openSectorDetail(sector)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSectorDetail(sector); } }}
              title="کلیک برای مشاهده جزئیات کامل"
              className="group bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all space-y-3 flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <div id={`dashboard-predictive-engine-sector-cards-grid-3-${sector.priorityId}`}>
                <div id={`dashboard-predictive-engine-sector-cards-grid-4-${sector.priorityId}`} className="flex items-center justify-between gap-2">
                  <div id={`dashboard-predictive-engine-sector-cards-grid-5-${sector.priorityId}`} className="flex items-center gap-2 min-w-0">
                    <span className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-colors shrink-0">
                      {getSectorIcon(sector.code)}
                    </span>
                    <div id={`dashboard-predictive-engine-sector-cards-grid-6-${sector.priorityId}`} className="min-w-0">
                      <span className="text-[11px] text-slate-500 truncate block">{sector.category}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      sector.urgencyStatus === 'CRITICAL_SURGE'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : sector.urgencyStatus === 'HIGH_GROWTH'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {sector.urgencyStatusFa}
                  </span>
                </div>
              </div>

              <h4
                id={`dashboard-predictive-engine-sector-cards-grid-title-${sector.priorityId}`}
                className="font-black text-sm text-slate-900 leading-snug text-right line-clamp-2"
                title={sector.titleFa}
              >
                {sector.titleFa}
              </h4>

              <div id={`dashboard-predictive-engine-log-derived-rationale-3-${sector.priorityId}`} className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <FileClock className="w-3 h-3 text-indigo-500" />
                  {toPersianDigits(sector.logInterventionCount)} لاگ ممیزی
                </span>
                <span className="flex items-center gap-1 text-indigo-500 font-bold group-hover:text-indigo-700 transition-colors">
                  جزئیات
                  <ArrowUpRight className="w-3 h-3 rtl:-scale-x-100 group-hover:-translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
                </span>
              </div>
            </div>
          ))}
        </div>
        ) : (
          <div id="dashboard-predictive-engine-sector-cards-grid-empty" className="flex flex-col items-center justify-center gap-2 py-10 bg-white rounded-xl border border-dashed border-slate-300 text-center">
            <span className="p-2.5 rounded-full bg-slate-100">
              <Layers className="w-4 h-4 text-slate-400" />
            </span>
            <span className="text-xs font-bold text-slate-600">هیچ سرفصلی در این وضعیت فوریت یافت نشد.</span>
            <span className="text-[11px] text-slate-400">فیلتر وضعیت فوریت را تغییر دهید تا سایر بخش‌ها نمایش داده شوند.</span>
          </div>
        )}
      </div>

      {/* AI Executive Insight Strip */}
      <div id="dashboard-predictive-engine-ai-executive-insight-strip" className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div id="dashboard-predictive-engine-ai-executive-insight-strip-2" className="flex items-start gap-3">
          <div id="dashboard-predictive-engine-ai-executive-insight-strip-3" className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div id="dashboard-predictive-engine-ai-executive-insight-strip-4">
            <span className="font-black text-xs text-indigo-900 block">
              جمع‌بندی تحلیلی برای کمیته برنامه‌ریزی و بودجه شهرستان:
            </span>
            <p className="text-xs text-indigo-950 mt-0.5 leading-relaxed max-w-4xl">
              {executiveInsight}
            </p>
          </div>
        </div>

        <div id="dashboard-predictive-engine-ai-executive-insight-strip-5" className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <button
            onClick={() => setActiveTab('PRIORITIES')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>تنظیم درصدهای تخصیص</span>
          </button>
          <button
            onClick={() => setActiveTab('AUDIT_LOGS')}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-2 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <FileClock className="w-3.5 h-3.5 text-slate-600" />
            <span>مشاهده لاگ‌های خام</span>
          </button>
        </div>
      </div>

      {/* Sector Detail Modal — full card details */}
      {detailSector && (
        <div
          id="dashboard-predictive-engine-sector-detail-modal"
          onClick={() => setDetailSector(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            id="dashboard-predictive-engine-sector-detail-modal-2"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-predictive-engine-sector-detail-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh] space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal header */}
            <div id="dashboard-predictive-engine-sector-detail-modal-3" className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div id="dashboard-predictive-engine-sector-detail-modal-4" className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                  {getSectorIcon(detailSector.code)}
                </span>
                <div id="dashboard-predictive-engine-sector-detail-modal-5">
                  <h3
                    id="dashboard-predictive-engine-sector-detail-modal-title"
                    className="font-black text-base text-slate-900 dark:text-slate-100 leading-snug"
                  >
                    {detailSector.titleFa}
                  </h3>
                  <span className="text-xs text-slate-500">{detailSector.category}</span>
                </div>
              </div>
              <button
                onClick={() => setDetailSector(null)}
                aria-label="بستن"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Urgency status */}
            <div id="dashboard-predictive-engine-sector-detail-modal-6" className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">وضعیت فوریت بخش:</span>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  detailSector.urgencyStatus === 'CRITICAL_SURGE'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : detailSector.urgencyStatus === 'HIGH_GROWTH'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {detailSector.urgencyStatusFa}
              </span>
            </div>

            {/* Full financial breakdown */}
            <div id="dashboard-predictive-engine-sector-detail-modal-7" className="grid grid-cols-2 gap-3">
              <div id="dashboard-predictive-engine-sector-detail-modal-8" className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] text-slate-500 block mb-1">تخصیص جاری (۱۴۰۳)</span>
                <span className="text-base font-black font-mono text-slate-800 block">
                  {formatToman(detailSector.currentAllocatedToman)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  سهم تخصیص: {toPersianDigits(detailSector.currentPercentage)}٪
                </span>
              </div>
              <div id="dashboard-predictive-engine-sector-detail-modal-9" className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 text-center">
                <span className="text-[11px] text-indigo-700 block mb-1">برآورد نیاز (۱۴۰۴)</span>
                <span className="text-base font-black font-mono text-indigo-700 block">
                  {formatToman(detailSector.projectedNeedNextYearToman)}
                </span>
                <span className="text-[10px] text-indigo-700 block mt-1 font-semibold">
                  رشد نیاز: +{toPersianDigits(detailSector.growthRatePct)}٪
                </span>
              </div>
            </div>

            {/* Deficit, log pressure & crises */}
            <div id="dashboard-predictive-engine-sector-detail-modal-10" className="grid grid-cols-3 gap-3">
              <div id="dashboard-predictive-engine-sector-detail-modal-11" className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 text-center">
                <span className="text-[10px] text-rose-700 block mb-1">کسری پیش‌بینی‌شده</span>
                <span className="text-xs font-black font-mono text-rose-800 block">
                  {formatToman(detailSector.forecastedDeficitToman)}
                </span>
              </div>
              <div id="dashboard-predictive-engine-sector-detail-modal-12" className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block mb-1">ضریب فشار لاگ</span>
                <span className="text-xs font-black font-mono text-slate-800 block">
                  ×{toPersianDigits(detailSector.logPressureFactor.toFixed(2))}
                </span>
              </div>
              <div id="dashboard-predictive-engine-sector-detail-modal-13" className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-center">
                <span className="text-[10px] text-amber-700 block mb-1">بحران‌های حل‌نشده</span>
                <span className="text-xs font-black font-mono text-amber-800 block">
                  {toPersianDigits(detailSector.unresolvedCrisesCount)} کانون
                </span>
              </div>
            </div>

            {/* Related raw audit logs — underlying evidence incl. log count */}
            <div id="dashboard-predictive-engine-sector-detail-modal-audit-logs" className="rounded-xl border border-indigo-100 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-900 p-3">
              <div id="dashboard-predictive-engine-sector-detail-modal-audit-logs-2" className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-semibold text-xs">
                  <FileClock className="w-3.5 h-3.5" />
                  <span>لاگ‌های ممیزی مرتبط با این بخش:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-300">
                    {toPersianDigits(detailSector.logInterventionCount)} لاگ ممیزی
                  </span>
                  {detailSector.relatedAuditLogs.length > 0 && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-indigo-300 dark:bg-indigo-600" />
                      <span className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400">
                        {toPersianDigits(detailSector.relatedAuditLogs.length)} سوابق
                      </span>
                    </>
                  )}
                </div>
              </div>

              {detailSector.relatedAuditLogs.length > 0 ? (
                <div id="dashboard-predictive-engine-sector-detail-modal-audit-logs-3" className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                  {detailSector.relatedAuditLogs.map((log) => {
                    const actionInfo = AUDIT_ACTION_LABELS[log.actionType] || {
                      label: log.actionType,
                      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                    };
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <div
                        id={`dashboard-predictive-engine-sector-detail-modal-audit-log-${log.id}`}
                        key={log.id}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          aria-expanded={isExpanded}
                          title={isExpanded ? 'جمع‌بندی' : 'نمایش جزئیات لاگ'}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-right hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${actionInfo.badge}`}>
                              {actionInfo.label}
                            </span>
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                              {log.targetPriorityTitle || log.actionType}
                            </span>
                          </span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono text-slate-400">{log.timestamp}</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </span>
                        </button>
                        {isExpanded && (
                          <div
                            id={`dashboard-predictive-engine-sector-detail-modal-audit-log-${log.id}-detail`}
                            className="px-3 pb-3 pt-1 space-y-1.5 bg-slate-50/70 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800"
                          >
                            {(log.oldValue || log.newValue) && (
                              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                {log.oldValue || '-'} ➔ {log.newValue || '-'}
                              </div>
                            )}
                            {log.rationale && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{log.rationale}</p>
                            )}
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-200/70 dark:border-slate-800">
                              <span className="font-bold text-slate-500 dark:text-slate-400">{log.userName}</span>
                              <span>({log.userRole})</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p id="dashboard-predictive-engine-sector-detail-modal-audit-logs-empty" className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                  لاگ مستقیم مرتبطی در سوابق ممیزی ثبت نشده است؛ فشار این بخش بر پایه شاخص‌های منطقه‌ای و بحران‌های فعال محاسبه شده است.
                </p>
              )}
            </div>

            {/* Full log-derived rationale — unclamped */}
            <div id="dashboard-predictive-engine-sector-detail-modal-15" className="pt-1 border-t border-slate-200 dark:border-slate-800">
              <div id="dashboard-predictive-engine-sector-detail-modal-16" className="flex items-center gap-1 text-slate-500 mb-1.5 font-semibold text-xs">
                <FileClock className="w-3.5 h-3.5 text-indigo-600" />
                <span>علت مستخرج از سوابق لاگ‌ها و شاخص‌های محلی:</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {detailSector.logDerivedRationale}
              </p>
            </div>

            {/* Modal footer actions */}
            <div id="dashboard-predictive-engine-sector-detail-modal-17" className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setDetailSector(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              >
                بستن
              </button>
              <button
                onClick={() => { setDetailSector(null); setActiveTab('PRIORITIES'); }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>تنظیم وزن در اولویت‌ها</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
