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
  ArrowRight,
  Building2,
  Activity,
  Droplets,
  HeartPulse,
  Briefcase,
  HardHat,
  Scale,
} from 'lucide-react';

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
        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-xl text-xs space-y-1.5 font-sans z-50">
          <span className="font-bold text-slate-900 block pb-1 border-b border-slate-100 font-mono">
            سال مالی {label}
          </span>
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4">
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
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
      {/* Engine Header & Scenario Selector (Light Theme) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
              موتور تحلیل پیش‌بین تقاضای توسعه‌ای
            </span>
            <span className="text-xs text-slate-500 font-medium">
              بر پایه تحلیل {summaryMetrics.totalLogInterventionsAnalyzed} لاگ ممیزی و بودجه‌های تخصیص‌یافته
            </span>
          </div>

          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            پیش‌بینی نیازهای توسعه‌ای و اعتبارات سال آینده (۱۴۰۴-۱۴۰۵)
          </h2>
        </div>

        {/* Scenario Controls */}
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 shrink-0 space-y-1.5 self-start lg:self-auto">
          <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold px-1">
            <span>سناریوی مدل پیش‌بین:</span>
            <Sliders className="w-3 h-3 text-indigo-600" />
          </div>
          <div className="flex items-center gap-1">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
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

        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
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

        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
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

        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
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
      <div className="bg-slate-50/50 rounded-2xl p-4 md:p-5 border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                نمودار روند چندساله اعتبارات مصوب در برابر تقاضای واقعی پیش‌بینی‌شده
              </h3>
              <span className="text-[11px] text-slate-500">
                سوابق سنواتی (۱۴۰۱ و ۱۴۰۲)، سال مالی جاری (۱۴۰۳)، پیش‌بینی سال آینده (۱۴۰۴) و افق دو ساله (۱۴۰۵)
              </span>
            </div>
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-start sm:self-auto shadow-2xs">
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
        <div className="h-72 md:h-80 w-full" dir="ltr">
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
                  tickFormatter={(val) => `${(val / 1_000_000_000_000).toFixed(1)} همت`}
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
                  tickFormatter={(val) => `${(val / 1_000_000_000_000).toFixed(1)} همت`}
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
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              منحنی پیش‌بین حاصل ترکیب لاگ‌های تاریخی، تورم ساخت و نیازهای معوقه است.
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              بخش سبز نشان‌دهنده خط روند اعتبارات تصویب‌شده قطعی است.
            </span>
          </div>
          <span className="text-slate-400 font-mono">واحد ارقام: میلیارد و هزار میلیارد تومان (همت)</span>
        </div>
      </div>

      {/* Sector Forecast Details & Log-Derived Rationales */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              تفکیک برآورد نیازهای توسعه‌ای سال آینده به همراه دلایل مستخرج از لاگ‌ها
            </h3>
            <span className="text-xs text-slate-500">
              ارزیابی هوشمند اولویت‌ها بر اساس تعداد مداخلات ثبت‌شده و هشدارهای موازی‌کاری
            </span>
          </div>

          {/* Filter badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterUrgency('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterUrgency === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              همه سرفصل‌ها ({sectorForecasts.length})
            </button>
            <button
              onClick={() => setFilterUrgency('CRITICAL_SURGE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterUrgency === 'CRITICAL_SURGE'
                  ? 'bg-rose-700 text-white'
                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
              }`}
            >
              جهش بحرانی
            </button>
            <button
              onClick={() => setFilterUrgency('HIGH_GROWTH')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterUrgency === 'HIGH_GROWTH'
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              }`}
            >
              رشد شتابان
            </button>
          </div>
        </div>

        {/* Sector Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSectors.map((sector) => (
            <div
              key={sector.priorityId}
              className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-indigo-300 transition-colors space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-slate-100 border border-slate-200">
                      {getSectorIcon(sector.code)}
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-1" title={sector.titleFa}>
                        {sector.titleFa}
                      </h4>
                      <span className="text-[11px] text-slate-500">{sector.category}</span>
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

                {/* Financial comparison row */}
                <div className="grid grid-cols-3 gap-2 py-2 px-2.5 bg-slate-50 rounded-lg border border-slate-100 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">تخصیص جاری (۱۴۰۳)</span>
                    <span className="font-bold font-mono text-slate-800">
                      {formatToman(sector.currentAllocatedToman)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">برآورد نیاز (۱۴۰۴)</span>
                    <span className="font-bold font-mono text-indigo-700">
                      {formatToman(sector.projectedNeedNextYearToman)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">درصد رشد نیاز</span>
                    <span className="font-bold font-mono text-rose-700">
                      +{toPersianDigits(sector.growthRatePct)}٪
                    </span>
                  </div>
                </div>

                {/* Log-derived Rationale */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                  <div className="flex items-center gap-1 text-slate-500 mb-1 font-semibold text-[10px]">
                    <FileClock className="w-3 h-3 text-indigo-600" />
                    <span>علت مستخرج از سوابق لاگ‌ها و شاخص‌های محلی:</span>
                  </div>
                  <p className="line-clamp-2">{sector.logDerivedRationale}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span>تعداد لاگ‌های مرتبط: {toPersianDigits(sector.logInterventionCount)} لاگ ممیزی</span>
                <button
                  onClick={() => setActiveTab('PRIORITIES')}
                  className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>تنظیم وزن</span>
                  <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Executive Insight Strip */}
      <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <span className="font-black text-xs text-indigo-900 block">
              جمع‌بندی تحلیلی برای کمیته برنامه‌ریزی و بودجه شهرستان:
            </span>
            <p className="text-xs text-indigo-950 mt-0.5 leading-relaxed max-w-4xl">
              {executiveInsight}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
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
    </div>
  );
};
