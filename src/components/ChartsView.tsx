import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CsrPriority, SmartRecommendationResult } from '../types';
import { useAppContext } from '../context/AppContext';
import { PageHeader } from './PageHeader';
import { formatCurrency, toPersianDigits } from '../utils/numberUtils';
import { 
  PieChart as PieIcon, BarChart3, Radar as RadarIcon, Globe2, 
  CircleDot, Flame, Sparkles, SlidersHorizontal, AlertTriangle, 
  CheckCircle2, Info, ArrowUpRight, TrendingUp, X, RefreshCw, RotateCcw,
  Sliders, Play, Activity, ArrowRight, Zap, Check
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Radar, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis, ReferenceLine, Label
} from 'recharts';

interface ChartsViewProps {
  priorities?: CsrPriority[];
  currentPercentages?: Record<string, number>;
  totalBudgetToman?: number;
  recommendations?: SmartRecommendationResult;
  onPercentageChange?: (priorityId: string, val: number) => void;
  onAutoRebalance?: () => void;
  onApplySmartRecommendations?: () => void;
  onResetToDefault?: () => void;
  onNavigateToDashboard?: () => void;
}

const COLORS = [
  '#2563eb', '#059669', '#d97706', '#4f46e5', 
  '#f43f5e', '#0d9488', '#9333ea', '#ea580c', '#0284c7'
];

export const ChartsView: React.FC<ChartsViewProps> = (props) => {
  const context = useAppContext();

  const priorities = props.priorities ?? context.priorities;
  const currentPercentages = props.currentPercentages ?? context.currentPercentages;
  const totalBudgetToman = props.totalBudgetToman ?? context.orgConfig.totalBudget;
  const recommendations = props.recommendations ?? context.recommendations;
  const onPercentageChange = props.onPercentageChange ?? context.handlePercentageChange;
  const onAutoRebalance = props.onAutoRebalance ?? context.handleAutoRebalance;
  const onApplySmartRecommendations = props.onApplySmartRecommendations ?? context.handleApplySmartRecommendations;
  const onResetToDefault = props.onResetToDefault ?? context.handleResetToDefault;
  const onNavigateToDashboard = props.onNavigateToDashboard ?? (() => context.setActiveTab('DASHBOARD'));
  // Bubble Chart Interactive States
  const [yAxisMetric, setYAxisMetric] = useState<'CURRENT' | 'RECOMMENDED'>('CURRENT');
  const [bubbleFilter, setBubbleFilter] = useState<'ALL' | 'HOTSPOTS' | 'DEFICITS'>('ALL');
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [showLiveAdjuster, setShowLiveAdjuster] = useState<boolean>(false);
  const [adjusterCategory, setAdjusterCategory] = useState<string>('ALL');

  // Live Synchronization Tracking
  const prevPercentagesRef = useRef<Record<string, number>>(currentPercentages);
  const [recentChanges, setRecentChanges] = useState<Record<string, { delta: number; prevPct: number; newPct: number; timestamp: number }>>({});
  const [lastSyncLog, setLastSyncLog] = useState<{ title: string; prevVal: number; newVal: number; delta: number; time: string } | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Detect live changes arriving from Dashboard or local adjustments
  useEffect(() => {
    const prev = prevPercentagesRef.current;
    const deltas: Record<string, { delta: number; prevPct: number; newPct: number; timestamp: number }> = {};
    let changedCount = 0;
    let mostRecentPriority: CsrPriority | null = null;
    let mostRecentDelta = 0;
    let mostRecentPrev = 0;
    let mostRecentNew = 0;

    priorities.forEach((p) => {
      const oldVal = prev[p.id] ?? p.defaultPercentage;
      const newVal = currentPercentages[p.id] ?? p.defaultPercentage;
      const diff = Number((newVal - oldVal).toFixed(2));
      if (Math.abs(diff) >= 0.05) {
        deltas[p.id] = { delta: diff, prevPct: oldVal, newPct: newVal, timestamp: Date.now() };
        changedCount++;
        mostRecentPriority = p;
        mostRecentDelta = diff;
        mostRecentPrev = oldVal;
        mostRecentNew = newVal;
      }
    });

    if (changedCount > 0 && mostRecentPriority) {
      setRecentChanges(deltas);
      const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncLog({
        title: (mostRecentPriority as CsrPriority).title,
        prevVal: mostRecentPrev,
        newVal: mostRecentNew,
        delta: mostRecentDelta,
        time: timeStr,
      });

      setSyncNotice(
        changedCount === 1
          ? `هماهنگ‌سازی زنده: "${(mostRecentPriority as CsrPriority).title}" از ${toPersianDigits(mostRecentPrev)}٪ به ${toPersianDigits(mostRecentNew)}٪ (${mostRecentDelta > 0 ? '+' : ''}${toPersianDigits(mostRecentDelta)}٪) انتقال یافت.`
          : `هماهنگ‌سازی زنده: ${toPersianDigits(changedCount)} سرفصل بودجه با داشبورد به‌روزرسانی و متحرک‌سازی شدند.`
      );

      const clearTimer = setTimeout(() => {
        setRecentChanges({});
      }, 4500);

      const noticeTimer = setTimeout(() => {
        setSyncNotice(null);
      }, 5500);

      prevPercentagesRef.current = { ...currentPercentages };
      return () => {
        clearTimeout(clearTimer);
        clearTimeout(noticeTimer);
      };
    }
    prevPercentagesRef.current = { ...currentPercentages };
  }, [currentPercentages, priorities]);

  // Replay live transition animation by triggering temporary delta halos
  const handleReplayAnimation = () => {
    const replayDeltas: Record<string, { delta: number; prevPct: number; newPct: number; timestamp: number }> = {};
    priorities.forEach((p) => {
      const cur = currentPercentages[p.id] ?? p.defaultPercentage;
      const rec = recommendations.scores[p.id] ?? p.defaultPercentage;
      const diff = Number((cur - rec).toFixed(1));
      replayDeltas[p.id] = {
        delta: diff === 0 ? 0.5 : diff,
        prevPct: rec,
        newPct: cur,
        timestamp: Date.now()
      };
    });
    setRecentChanges(replayDeltas);
    setSyncNotice('انیمیشن موقعیت و حجم حباب‌ها بازپخش شد.');
    setTimeout(() => {
      setRecentChanges({});
      setSyncNotice(null);
    }, 3800);
  };

  // Prepare Bubble Chart Data: Relationship between Deprivation/Harm Index & Budget Allocation
  const bubbleItems = useMemo(() => {
    return priorities.map((p, idx) => {
      const currentPct = currentPercentages[p.id] ?? p.defaultPercentage;
      const recommendedPct = recommendations.scores[p.id] ?? p.defaultPercentage;
      const prev = recommendations.explainability[p.id]?.prevalence;
      const localSeverity = prev ? prev.local : (p.weightFactor ? p.weightFactor * 10 : 35);
      const nationalSeverity = prev ? prev.national : 35;
      const provincialSeverity = prev ? prev.provincial : 36;
      const countySeverity = prev ? prev.county : 38;
      const locationQuotient = prev ? prev.locationQuotient : 1.0;
      const isHotspot = Boolean(recommendations.explainability[p.id]?.isLocalHotspot || (prev?.prevalenceTier === 'LOCAL_HOTSPOT'));
      const isUniversal = Boolean(recommendations.explainability[p.id]?.isUniversalSevere || (prev?.prevalenceTier === 'UNIVERSAL_CRITICAL'));

      const activePct = yAxisMetric === 'CURRENT' ? currentPct : recommendedPct;
      const currentBudgetToman = Math.round((totalBudgetToman * currentPct) / 100);
      const recommendedBudgetToman = Math.round((totalBudgetToman * recommendedPct) / 100);
      const activeBudgetToman = yAxisMetric === 'CURRENT' ? currentBudgetToman : recommendedBudgetToman;

      // 4-Quadrant Policy Matrix Classification:
      // Severity Threshold = 45%, Balanced Allocation Threshold = 8.5%
      let quadrant: 'HOTSPOT_COVERED' | 'CRITICAL_DEFICIT' | 'PREVENTATIVE' | 'STABLE';
      let quadrantLabel = '';
      let quadrantBadgeClass = '';

      if (localSeverity >= 45 && activePct >= 8.5) {
        quadrant = 'HOTSPOT_COVERED';
        quadrantLabel = 'پوشش بهینه کانون بحران (آسیب بالا، بودجه کافی)';
        quadrantBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      } else if (localSeverity >= 45 && activePct < 8.5) {
        quadrant = 'CRITICAL_DEFICIT';
        quadrantLabel = '⚠️ هشدار کسری بودجه (آسیب بالا، بودجه ناکافی)';
        quadrantBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
      } else if (localSeverity < 45 && activePct >= 8.5) {
        quadrant = 'PREVENTATIVE';
        quadrantLabel = 'سرمایه‌گذاری پیشگیرانه/زیربنایی (آسیب کنترل‌شده، بودجه بالا)';
        quadrantBadgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
      } else {
        quadrant = 'STABLE';
        quadrantLabel = 'مدیریت پایدار و متعادل (آسیب نرمال، بودجه متناسب)';
        quadrantBadgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
      }

      // Color scheme
      let bubbleColor = COLORS[idx % COLORS.length];
      if (isHotspot) bubbleColor = '#e11d48';
      else if (isUniversal) bubbleColor = '#9333ea';

      return {
        id: p.id,
        code: p.code,
        title: p.title,
        shortTitle: p.title.length > 22 ? p.title.substring(0, 22) + '...' : p.title,
        category: p.category,
        deprivationIndex: localSeverity,
        nationalSeverity,
        provincialSeverity,
        countySeverity,
        locationQuotient,
        currentPct,
        recommendedPct,
        activePct,
        currentBudgetToman,
        recommendedBudgetToman,
        activeBudgetToman,
        // Sizing metric for ZAxis (minimum bubble radius 200, max 1600)
        bubbleZMetric: Math.max(10, Math.round(activeBudgetToman / 1_000_000_000)), // in Billion Toman
        isHotspot,
        isUniversal,
        tierLabelFa: prev?.tierLabelFa || 'نرمال',
        primaryDriver: recommendations.explainability[p.id]?.primaryDriver || p.description,
        rationale: recommendations.explainability[p.id]?.rationale || '',
        quadrant,
        quadrantLabel,
        quadrantBadgeClass,
        color: bubbleColor,
        strokeColor: isHotspot ? '#9f1239' : '#334155',
      };
    });
  }, [priorities, currentPercentages, recommendations, totalBudgetToman, yAxisMetric]);

  // Filtered bubbles based on filter chip
  const filteredBubbles = useMemo(() => {
    if (bubbleFilter === 'HOTSPOTS') {
      return bubbleItems.filter((b) => b.isHotspot || b.isUniversal || b.deprivationIndex >= 45);
    }
    if (bubbleFilter === 'DEFICITS') {
      return bubbleItems.filter((b) => b.quadrant === 'CRITICAL_DEFICIT');
    }
    return bubbleItems;
  }, [bubbleItems, bubbleFilter]);

  // Selected bubble for drill-down card
  const activeSelectedBubble = useMemo(() => {
    if (!selectedBubbleId) return null;
    return bubbleItems.find((b) => b.id === selectedBubbleId) || null;
  }, [bubbleItems, selectedBubbleId]);

  // Quadrant summary stats
  const quadrantStats = useMemo(() => {
    const covered = bubbleItems.filter((b) => b.quadrant === 'HOTSPOT_COVERED').length;
    const deficit = bubbleItems.filter((b) => b.quadrant === 'CRITICAL_DEFICIT').length;
    const preventative = bubbleItems.filter((b) => b.quadrant === 'PREVENTATIVE').length;
    const stable = bubbleItems.filter((b) => b.quadrant === 'STABLE').length;
    return { covered, deficit, preventative, stable };
  }, [bubbleItems]);

  // Prepare data for Pie & Bar chart
  const pieData = priorities.map((p) => {
    const pct = currentPercentages[p.id] || 0;
    const amountToman = Math.round((totalBudgetToman * pct) / 100);
    return {
      name: p.title,
      value: pct,
      amountToman,
    };
  });

  // Prepare radar chart comparison data (Manual vs Smart AI vs Default)
  const radarData = priorities.map((p) => ({
    subject: p.title.length > 18 ? p.title.substring(0, 18) + '...' : p.title,
    دستی: currentPercentages[p.id] || 0,
    پیشنهاد_هوشمند: recommendations.scores[p.id] || p.defaultPercentage,
    پیش_فرض: p.defaultPercentage,
  }));

  // Prepare 4-Tier Prevalence comparison data
  const prevalenceData = priorities.map((p) => {
    const prev = recommendations.explainability[p.id]?.prevalence;
    return {
      name: p.title.length > 14 ? p.title.substring(0, 14) + '...' : p.title,
      'میانگین کشوری': prev ? prev.national : 0,
      'میانگین استانی': prev ? prev.provincial : 0,
      'میانگین شهرستانی': prev ? prev.county : 0,
      'کانون محلی پیرامونی': prev ? prev.local : 0,
    };
  });

  // Custom Bubble Tooltip
  const CustomBubbleTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div id="charts-view-root" className="bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-300 shadow-xl text-right text-xs dir-rtl max-w-sm space-y-2.5 z-50">
          <div id="charts-view-div-2" className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div id="charts-view-div-3" className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: item.color }} />
              <span className="font-black text-slate-900 text-xs">{item.title}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {item.category}
            </span>
          </div>

          <div id="charts-view-div-4" className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <div id="charts-view-div-5">
              <span className="text-slate-500 block text-[10px]">نرخ محرومیت محلی:</span>
              <span className="font-extrabold text-rose-700 dir-rtl font-mono text-sm">
                {toPersianDigits(item.deprivationIndex)}٪
              </span>
            </div>
            <div id="charts-view-div-6">
              <span className="text-slate-500 block text-[10px]">میانگین کشور / ضریب LQ:</span>
              <span className="font-bold text-slate-700 dir-rtl font-mono">
                {toPersianDigits(item.nationalSeverity)}٪ (LQ: {toPersianDigits(item.locationQuotient)})
              </span>
            </div>
            <div id="charts-view-div-7">
              <span className="text-slate-500 block text-[10px]">
                {yAxisMetric === 'CURRENT' ? 'سهم بودجه کنونی:' : 'سهم پیشنهادی AI:'}
              </span>
              <span className="font-extrabold text-indigo-700 dir-rtl font-mono text-sm">
                {toPersianDigits(item.activePct)}٪
              </span>
            </div>
            <div id="charts-view-div-8">
              <span className="text-slate-500 block text-[10px]">مبلغ بودجه مصوب:</span>
              <span className="font-black text-emerald-700 dir-rtl text-xs">
                {formatCurrency(item.activeBudgetToman, 'TOMAN', true)}
              </span>
            </div>
          </div>

          <div id="charts-view-div-9" className="pt-1.5 border-t border-slate-100 space-y-1">
            <div id="charts-view-div-10" className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500">ماتریس انطباق:</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.quadrantBadgeClass}`}>
                {item.quadrantLabel}
              </span>
            </div>
            {item.isHotspot && (
              <div id="charts-view-div-11" className="flex items-center gap-1.5 text-[10px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-1 rounded-md">
                <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>کانون بحران حاد منطقه {context.selectedLocation.city} (نیازمند اولویت ۱ بودجه)</span>
              </div>
            )}
            <p className="text-[10px] text-slate-400 text-center pt-0.5">
              💡 برای بررسی دقیق‌تر روی حباب کلیک کنید
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="charts-view-div-12" className="space-y-6">
      <PageHeader
        id="charts-view-page-header"
        icon={BarChart3}
        title="نمودارها و تحلیل زنده تخصیص"
        subtitle="نمودار حبابی ارتباط شاخص محرومیت با تخصیص بودجه و تحلیل زنده جریان اعتبارات"
        tone="bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900"
      />

      {/* ========================================================================= */}
      {/* 1. FEATURED ANALYTICAL BUBBLE CHART: DEPRIVATION INDEX VS BUDGET ALLOCATION */}
      {/* ========================================================================= */}
      <div id="charts-view-div-13" className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        
        {/* Header & Controls Toolbar */}
        <div id="charts-view-header-controls-toolbar" className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div id="charts-view-header-controls-toolbar-2">
            <div id="charts-view-header-controls-toolbar-3" className="flex items-center gap-2 flex-wrap">
              <div id="charts-view-header-controls-toolbar-4" className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-xs">
                <CircleDot className="w-4 h-4 text-cyan-200" />
              </div>
              <div id="charts-view-header-controls-toolbar-5">
                <h3 className="font-black text-slate-900 text-base">
                  نمودار حبابی ماتریس محرومیت و تخصیص بودجه (Bubble Chart)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ارتباط بصری دو‌بعدی بین شدت آسیب‌های منطقه (محور افقی) و درصد بودجه مصوب (محور عمودی) • اندازه حباب = مبلغ بودجه (همت)
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Toggle Controls */}
          <div id="charts-view-interactive-toggle-controls" className="flex items-center gap-2 flex-wrap">
            {/* Y-Axis Metric Switcher */}
            <div id="charts-view-y-axis-metric-switcher" className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setYAxisMetric('CURRENT')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  yAxisMetric === 'CURRENT'
                    ? 'bg-white text-indigo-700 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تخصیص فعلی کاربر
              </button>
              <button
                type="button"
                onClick={() => setYAxisMetric('RECOMMENDED')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                  yAxisMetric === 'RECOMMENDED'
                    ? 'bg-white text-purple-700 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>پیشنهاد هوشمند AI</span>
              </button>
            </div>

            {/* Quick Filter Selector */}
            <div id="charts-view-quick-filter-selector" className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setBubbleFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg border font-bold transition-all ${
                  bubbleFilter === 'ALL'
                    ? 'bg-slate-800 text-white border-slate-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                همه ({toPersianDigits(priorities.length)})
              </button>

              <button
                type="button"
                onClick={() => setBubbleFilter('HOTSPOTS')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-bold transition-all ${
                  bubbleFilter === 'HOTSPOTS'
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                }`}
              >
                <Flame className="w-3 h-3 text-rose-400" />
                <span>کانون‌های بحران</span>
              </button>

              <button
                type="button"
                onClick={() => setBubbleFilter('DEFICITS')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-bold transition-all ${
                  bubbleFilter === 'DEFICITS'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                }`}
                title="اولویت‌هایی با آسیب بالا ولی بودجه کمتر از ۹٪"
              >
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>کسری بودجه ({toPersianDigits(quadrantStats.deficit)})</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Quadrants Summary KPI Badges */}
        <div id="charts-view-4-quadrants-summary-kpi-badges" className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div id="charts-view-4-quadrants-summary-kpi-badges-2" className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between">
            <div id="charts-view-4-quadrants-summary-kpi-badges-3">
              <span className="text-[10px] font-bold text-emerald-900 block">پوشش بهینه کانون بحران</span>
              <span className="text-[9px] text-emerald-700">آسیب بالا + بودجه مکفی (≥۹٪)</span>
            </div>
            <span className="text-sm font-black text-emerald-800 font-mono bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
              {toPersianDigits(quadrantStats.covered)}
            </span>
          </div>

          <div id="charts-view-4-quadrants-summary-kpi-badges-4" className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/70 flex items-center justify-between">
            <div id="charts-view-4-quadrants-summary-kpi-badges-5">
              <span className="text-[10px] font-bold text-rose-900 block flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                هشدار کسری بودجه
              </span>
              <span className="text-[9px] text-rose-700">آسیب بالا + بودجه کم (&lt;۹٪)</span>
            </div>
            <span className="text-sm font-black text-rose-800 font-mono bg-white px-2 py-0.5 rounded-lg border border-rose-200">
              {toPersianDigits(quadrantStats.deficit)}
            </span>
          </div>

          <div id="charts-view-4-quadrants-summary-kpi-badges-6" className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 flex items-center justify-between">
            <div id="charts-view-4-quadrants-summary-kpi-badges-7">
              <span className="text-[10px] font-bold text-blue-900 block">سرمایه‌گذاری پیشگیرانه</span>
              <span className="text-[9px] text-blue-700">آسیب کنترل‌شده + بودجه بالا</span>
            </div>
            <span className="text-sm font-black text-blue-800 font-mono bg-white px-2 py-0.5 rounded-lg border border-blue-200">
              {toPersianDigits(quadrantStats.preventative)}
            </span>
          </div>

          <div id="charts-view-4-quadrants-summary-kpi-badges-8" className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div id="charts-view-4-quadrants-summary-kpi-badges-9">
              <span className="text-[10px] font-bold text-slate-800 block">مدیریت متعادل و پایدار</span>
              <span className="text-[9px] text-slate-600">آسیب عادی + بودجه متناسب</span>
            </div>
            <span className="text-sm font-black text-slate-800 font-mono bg-white px-2 py-0.5 rounded-lg border border-slate-200">
              {toPersianDigits(quadrantStats.stable)}
            </span>
          </div>
        </div>

        {/* Live Synchronization Status & Quick Adjuster Bar */}
        <div id="charts-view-live-synchronization-status" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-gradient-to-r from-emerald-50/90 via-indigo-50/70 to-slate-50 border border-emerald-200/80 text-xs">
          <div id="charts-view-live-synchronization-status-2" className="flex items-center gap-2.5 flex-wrap">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div id="charts-view-live-synchronization-status-3" className="flex items-center gap-1.5">
              <span className="font-black text-emerald-950">همگام‌سازی زنده فعال:</span>
              <span className="text-slate-600 font-medium">
                {syncNotice || 'اتصال بلادرنگ به تخصیص بودجه داشبورد برقرار است. تغییر درصدها، اندازه و ارتفاع حباب‌ها را متحرک می‌کند.'}
              </span>
            </div>
            {lastSyncLog && (
              <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-800 font-bold font-mono">
                آخرین تغییر: {lastSyncLog.time}
              </span>
            )}
          </div>

          <div id="charts-view-live-synchronization-status-4" className="flex items-center gap-2 flex-wrap">
            {/* Replay Animation */}
            <button
              type="button"
              onClick={handleReplayAnimation}
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all active:scale-95"
              title="پخش مجدد انیمیشن پرواز و تغییر اندازه حباب‌ها"
            >
              <Play className="w-3 h-3 text-indigo-600 fill-indigo-600" />
              <span>بازپخش انیمیشن</span>
            </button>

            {/* Live Sliders Toggle */}
            {onPercentageChange && (
              <button
                type="button"
                onClick={() => setShowLiveAdjuster(!showLiveAdjuster)}
                className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                  showLiveAdjuster
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>تنظیم زنده اسلایدرها</span>
                <span className={`w-2 h-2 rounded-full ${showLiveAdjuster ? 'bg-white' : 'bg-indigo-600'}`} />
              </button>
            )}

            {/* Quick Link to Dashboard */}
            {onNavigateToDashboard && (
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="رفتن به جدول اصلی تخصیص بودجه در تب داشبورد"
              >
                <span>جدول داشبورد</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Live Budget Allocation Quick Adjuster Tray */}
        {showLiveAdjuster && onPercentageChange && (
          <div id="charts-view-collapsible-live-budget" className="p-4 rounded-xl bg-slate-50 border border-indigo-200 space-y-3 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div id="charts-view-collapsible-live-budget-2" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div id="charts-view-collapsible-live-budget-3" className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="font-black text-slate-800">
                  شبیه‌ساز و کنترل زنده بودجه (Live Budget Slider Dock)
                </span>
                <span className="text-[10px] text-slate-500">
                  با تغییر هر اسلایدر، حباب مربوطه در نمودار زیر بلافاصله به بالا/پایین حرکت کرده و اندازه‌اش تغییر می‌کند.
                </span>
              </div>
              <div id="charts-view-collapsible-live-budget-4" className="flex items-center gap-1.5 flex-wrap">
                {onAutoRebalance && (
                  <button
                    type="button"
                    onClick={onAutoRebalance}
                    className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                  >
                    <RefreshCw className="w-3 h-3 text-indigo-600" />
                    <span>تراز خودکار ۱۰۰٪</span>
                  </button>
                )}
                {onApplySmartRecommendations && (
                  <button
                    type="button"
                    onClick={onApplySmartRecommendations}
                    className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white shadow-2xs"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>اعمال هوشمند AI</span>
                  </button>
                )}
                {onResetToDefault && (
                  <button
                    type="button"
                    onClick={onResetToDefault}
                    className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-800"
                    title="بازنشانی"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Sliders Grid */}
            <div id="charts-view-sliders-grid" className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {priorities.map((p) => {
                const currentVal = currentPercentages[p.id] ?? p.defaultPercentage;
                const recVal = recommendations.scores[p.id] ?? p.defaultPercentage;
                const bubbleInfo = bubbleItems.find((b) => b.id === p.id);
                const isRecentlyChanged = recentChanges[p.id] !== undefined;

                return (
                  <div
                    id={`charts-view-sliders-grid-2-${p.id}`}
                    key={`adjuster-${p.id}`}
                    className={`p-2.5 rounded-lg border transition-all ${
                      isRecentlyChanged
                        ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/40 shadow-sm'
                        : selectedBubbleId === p.id
                        ? 'bg-indigo-50/70 border-indigo-300 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div id={`charts-view-sliders-grid-3-${p.id}`} className="flex items-center justify-between mb-1.5">
                      <div id={`charts-view-sliders-grid-4-${p.id}`} className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: bubbleInfo?.color || '#6366f1' }} />
                        <span className="font-bold text-slate-900 truncate" title={p.title}>
                          کد {toPersianDigits(p.code)} - {p.title}
                        </span>
                      </div>
                      <span className="font-mono font-black text-indigo-700 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {toPersianDigits(currentVal)}٪
                      </span>
                    </div>

                    <div id={`charts-view-sliders-grid-5-${p.id}`} className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="24"
                        step="0.5"
                        value={currentVal}
                        onChange={(e) => onPercentageChange(p.id, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    <div id={`charts-view-sliders-grid-6-${p.id}`} className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                      <span>شدت آسیب: {toPersianDigits(bubbleInfo?.deprivationIndex || 0)}٪</span>
                      <span>پیشنهاد AI: {toPersianDigits(recVal)}٪</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Scatter / Bubble Chart Canvas */}
        <div id="charts-view-main-scatter-bubble-chart-canvas" className="h-[clamp(360px,55vh,540px)] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 25, right: 30, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical stroke="#f1f5f9" />
              
              {/* X Axis: Deprivation & Harm Index (0 to 80%) */}
              <XAxis 
                type="number" 
                dataKey="deprivationIndex" 
                name="شاخص محرومیت و آسیب محلی" 
                domain={[10, 80]}
                unit="٪"
                tickFormatter={(v) => toPersianDigits(v) + '٪'}
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ 
                  value: '← نرخ آسیب و محرومیت در منطقه (شاخص ۱۰۰) →', 
                  position: 'bottom', 
                  offset: 20, 
                  fontSize: 11, 
                  fill: '#475569',
                  fontWeight: 'bold'
                }}
              />

              {/* Y Axis: Budget Allocation Percentage */}
              <YAxis 
                type="number" 
                dataKey="activePct" 
                name="درصد تخصیص بودجه" 
                domain={[0, 24]}
                unit="٪"
                tickFormatter={(v) => toPersianDigits(v) + '٪'}
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ 
                  value: yAxisMetric === 'CURRENT' ? 'سهم بودجه فعلی (٪)' : 'سهم پیشنهادی AI (٪)', 
                  angle: -90, 
                  position: 'insideLeft', 
                  offset: 0, 
                  fontSize: 11, 
                  fill: '#475569',
                  fontWeight: 'bold'
                }}
              />

              {/* Z Axis: Controls Bubble Diameter proportional to Budget in Billion Toman */}
              <ZAxis 
                type="number" 
                dataKey="bubbleZMetric" 
                range={[160, 1100]} 
                name="مبلغ بودجه" 
                unit=" همت"
              />

              {/* Quadrant Benchmark Reference Lines */}
              <ReferenceLine x={45} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5}>
                <Label 
                  value="مرز بحران آسیب محلی (۴۵٪)" 
                  position="insideTopRight" 
                  fill="#e11d48" 
                  fontSize={10} 
                  fontWeight="bold"
                />
              </ReferenceLine>

              <ReferenceLine y={8.5} stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1.5}>
                <Label 
                  value="میانگین تخصیص متعادل (۸.۵٪)" 
                  position="insideTopLeft" 
                  fill="#4f46e5" 
                  fontSize={10} 
                  fontWeight="bold"
                />
              </ReferenceLine>

              <Tooltip content={<CustomBubbleTooltip />} />

              {/* Bubbles Scatter with animated SVG custom shape */}
              <Scatter 
                name="سرفصل‌های مسئولیت اجتماعی" 
                data={filteredBubbles}
                isAnimationActive={false}
                shape={(pointProps: any) => {
                  const { cx, cy, size, payload } = pointProps;
                  if (typeof cx !== 'number' || typeof cy !== 'number' || isNaN(cx) || isNaN(cy)) return null;

                  const rawRadius = Math.sqrt((size || 200) / Math.PI);
                  const radius = Math.max(12, Math.min(32, Math.round(rawRadius * 1.25)));
                  const isSelected = selectedBubbleId === payload.id;
                  const change = recentChanges[payload.id];
                  const delta = change?.delta;
                  const isPositive = delta !== undefined && delta > 0;

                  return (
                    <g 
                      key={`bubble-node-${payload.id}`}
                      className="cursor-pointer"
                      onClick={() => setSelectedBubbleId(selectedBubbleId === payload.id ? null : payload.id)}
                    >
                      {/* Animated Ripple / Pulse Halo for recently synchronized items */}
                      {change && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={radius + 10}
                          fill="none"
                          stroke={isPositive ? '#10b981' : '#f43f5e'}
                          strokeWidth={2.5}
                          strokeDasharray="4 3"
                          className="animate-spin opacity-85"
                          style={{
                            transformOrigin: `${cx}px ${cy}px`,
                            transition: 'cx 750ms cubic-bezier(0.34, 1.4, 0.64, 1), cy 750ms cubic-bezier(0.34, 1.4, 0.64, 1)'
                          }}
                        />
                      )}

                      {/* Core Bubble with fluid CSS transitions on cx, cy, and radius */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={payload.color}
                        fillOpacity={isSelected ? 1 : payload.isHotspot ? 0.94 : 0.82}
                        stroke={isSelected ? '#0f172a' : payload.strokeColor}
                        strokeWidth={isSelected ? 3.5 : payload.isHotspot ? 2.5 : 1.5}
                        style={{
                          transition: 'cx 750ms cubic-bezier(0.34, 1.4, 0.64, 1), cy 750ms cubic-bezier(0.34, 1.4, 0.64, 1), r 750ms cubic-bezier(0.34, 1.4, 0.64, 1), fill 300ms ease, stroke-width 200ms ease',
                          filter: isSelected ? 'drop-shadow(0 6px 16px rgba(0,0,0,0.35))' : 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))'
                        }}
                      />

                      {/* Center Percentage Label inside the bubble */}
                      {radius >= 13 && (
                        <text
                          x={cx}
                          y={cy + 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize={radius >= 21 ? 11 : 9}
                          fontWeight="bold"
                          pointerEvents="none"
                          style={{
                            transition: 'x 750ms cubic-bezier(0.34, 1.4, 0.64, 1), y 750ms cubic-bezier(0.34, 1.4, 0.64, 1)',
                            textShadow: '0 1px 3px rgba(0,0,0,0.85)'
                          }}
                        >
                          {toPersianDigits(payload.activePct)}٪
                        </text>
                      )}

                      {/* Floating Delta Badge showing live change amount from Dashboard */}
                      {change && delta !== undefined && Math.abs(delta) >= 0.05 && (
                        <g
                          style={{
                            transform: `translate(${cx}px, ${cy - radius - 12}px)`,
                            transition: 'transform 750ms cubic-bezier(0.34, 1.4, 0.64, 1)'
                          }}
                          pointerEvents="none"
                        >
                          <rect
                            x={-20}
                            y={-14}
                            width={40}
                            height={18}
                            rx={9}
                            fill={isPositive ? '#059669' : '#e11d48'}
                            stroke="#ffffff"
                            strokeWidth={1.5}
                            className="drop-shadow-md"
                          />
                          <text
                            x={0}
                            y={-1.5}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize={9.5}
                            fontWeight="bold"
                            direction="ltr"
                          >
                            {isPositive ? `+${toPersianDigits(delta)}` : toPersianDigits(delta)}٪
                          </text>
                        </g>
                      )}
                    </g>
                  );
                }}
                cursor="pointer"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Visual Map Legend & Notes */}
        <div id="charts-view-visual-map-legend-notes" className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
          <div id="charts-view-visual-map-legend-notes-2" className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-slate-700">راهنمای بصری حباب‌ها:</span>
            <div id="charts-view-visual-map-legend-notes-3" className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-600 inline-block shadow-xs" />
              <span>کانون بحران محلی پیرامونی</span>
            </div>
            <div id="charts-view-visual-map-legend-notes-4" className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-600 inline-block shadow-xs" />
              <span>فراگیری بحرانی همه‌جانبه</span>
            </div>
            <div id="charts-view-visual-map-legend-notes-5" className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
              <span className="w-4 h-4 rounded-full bg-slate-400 inline-block" />
              <span>قطر حباب = حجم ریالی بودجه مصوب</span>
            </div>
          </div>

          <span className="text-[10px] text-indigo-600 font-bold">
            💡 با کلیک روی هر حباب، تحلیل تفصیلی و راهکار رفع انحراف را در کادر زیر مشاهده کنید.
          </span>
        </div>

        {/* Drill-down Detail Inspector Box */}
        {activeSelectedBubble && (
          <div id="charts-view-drill-down-detail-inspector-box" className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-indigo-200 text-right text-xs dir-rtl space-y-3 animate-in fade-in duration-200">
            <div id="charts-view-drill-down-detail-inspector-box-2" className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <div id="charts-view-drill-down-detail-inspector-box-3" className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full shadow-xs" style={{ backgroundColor: activeSelectedBubble.color }} />
                <span className="font-black text-slate-900 text-sm">
                  تحلیل تخصصی: کد {toPersianDigits(activeSelectedBubble.code)} - {activeSelectedBubble.title}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                  {activeSelectedBubble.category}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBubbleId(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div id="charts-view-drill-down-detail-inspector-box-4" className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div id="charts-view-drill-down-detail-inspector-box-5" className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 block">شدت آسیب محلی {context.selectedLocation.city}</span>
                <span className="text-base font-black text-rose-700 dir-rtl font-mono mt-0.5 block">
                  {toPersianDigits(activeSelectedBubble.deprivationIndex)}٪
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  کشور: {toPersianDigits(activeSelectedBubble.nationalSeverity)}٪ (ضریب LQ: {toPersianDigits(activeSelectedBubble.locationQuotient)})
                </span>
              </div>

              <div id="charts-view-drill-down-detail-inspector-box-6" className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 block">سهم بودجه و مقایسه</span>
                <div id="charts-view-drill-down-detail-inspector-box-7" className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-base font-black text-indigo-700 dir-rtl font-mono">
                    فعلی: {toPersianDigits(activeSelectedBubble.currentPct)}٪
                  </span>
                  <span className="text-xs font-bold text-purple-700 dir-rtl font-mono">
                    AI: {toPersianDigits(activeSelectedBubble.recommendedPct)}٪
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  مبلغ: {formatCurrency(activeSelectedBubble.activeBudgetToman, 'TOMAN', true)}
                </span>
              </div>

              <div id="charts-view-drill-down-detail-inspector-box-8" className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs md:col-span-2">
                <span className="text-[10px] text-slate-500 block">موقعیت در ماتریس تصمیم‌گیری و توصیه اصلاحی</span>
                <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-md border mt-1 ${activeSelectedBubble.quadrantBadgeClass}`}>
                  {activeSelectedBubble.quadrantLabel}
                </span>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  {activeSelectedBubble.rationale || activeSelectedBubble.primaryDriver}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 2. 4-TIER STATISTICAL PREVALENCE MULTI-BAR CHART                          */}
      {/* ========================================================================= */}
      <div id="charts-view-div-14" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div id="charts-view-div-15" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-100">
          <div id="charts-view-div-16">
            <div id="charts-view-div-17" className="flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                مقایسه تطبیقی فراگیری ۴ سطحی (کشوری vs استانی vs شهرستانی vs کانون محلی)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              مبنای ریاضی نسبت‌سنجی آماری: کانون‌های بحران محلی که شدت آن در منطقه بالاتر از میانگین کشور است دارای اولویت قطعی هستند.
            </p>
          </div>
        </div>

        <div id="charts-view-div-18" className="h-[clamp(300px,50vh,460px)] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={prevalenceData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                interval={0} 
                angle={-25} 
                textAnchor="end" 
              />
              <YAxis 
                tickFormatter={(v) => toPersianDigits(v)} 
                tick={{ fontSize: 10, fill: '#64748b' }} 
              />
              <Tooltip 
                formatter={(val: any) => [`${toPersianDigits(val)}`, '']}
                contentStyle={{ direction: 'rtl', borderRadius: '12px', fontSize: '12px', textAlign: 'right' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="میانگین کشوری" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="میانگین استانی" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="میانگین شهرستانی" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="کانون محلی پیرامونی" fill="#e11d48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SECONDARY CHARTS GRID: PIE, BAR & RADAR                                */}
      {/* ========================================================================= */}
      <div id="charts-view-div-19" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pie Chart: Percentage Distribution */}
        <div id="charts-view-pie-chart-percentage" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div id="charts-view-pie-chart-percentage-2" className="flex items-center justify-between mb-4">
            <div id="charts-view-pie-chart-percentage-3" className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-sm">نمودار دایره‌ای توزیع درصدی اولویت‌ها</h3>
            </div>
          </div>
          <div id="charts-view-pie-chart-percentage-4" className="h-[clamp(280px,45vh,400px)] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${toPersianDigits(value)}٪`, 'سهم درصدی']}
                  labelFormatter={(name) => `اولویت: ${name}`}
                  contentStyle={{ direction: 'rtl', borderRadius: '12px', fontSize: '12px', textAlign: 'right' }}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Financial Allocation in Toman */}
        <div id="charts-view-bar-chart-financial-allocation" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div id="charts-view-bar-chart-financial-allocation-2" className="flex items-center justify-between mb-4">
            <div id="charts-view-bar-chart-financial-allocation-3" className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm">نمودار میله‌ای مبلغ تخصیص یافته (تومان)</h3>
            </div>
          </div>
          <div id="charts-view-bar-chart-financial-allocation-4" className="h-[clamp(280px,45vh,400px)] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  interval={0} 
                  angle={-25} 
                  textAnchor="end" 
                />
                <YAxis 
                  tickFormatter={(v) => toPersianDigits(Math.round(v / 1_000_000_000))} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                />
                <Tooltip 
                  formatter={(val: any) => [formatCurrency(Number(val), 'TOMAN', true), 'مبلغ تخصیص یافته']}
                  contentStyle={{ direction: 'rtl', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="amountToman" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Chart: Manual vs Smart AI Comparison */}
        <div id="charts-view-radar-chart-manual-vs-smart-ai" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs lg:col-span-2">
          <div id="charts-view-radar-chart-manual-vs-smart-ai-2" className="flex items-center justify-between mb-2">
            <div id="charts-view-radar-chart-manual-vs-smart-ai-3" className="flex items-center gap-2">
              <RadarIcon className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-slate-800 text-sm">تطبیق راداری: تخصیص دستی در برابر پیشنهاد هوشمند AI</h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            مقایسه وزن‌های دستی کاربر با پیشنهاد الگوریتمی هوشمند بر اساس نیازسنجی محلی و نسبت‌سنجی آماری
          </p>
          <div id="charts-view-radar-chart-manual-vs-smart-ai-4" className="h-[clamp(300px,50vh,460px)] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#334155' }} />
                <PolarRadiusAxis angle={30} domain={[0, 30]} tick={{ fontSize: 10 }} />
                <Radar name="تخصیص دستی" dataKey="دستی" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
                <Radar name="پیشنهاد هوشمند AI" dataKey="پیشنهاد_هوشمند" stroke="#9333ea" fill="#9333ea" fillOpacity={0.25} />
                <Radar name="وزن پیش‌فرض" dataKey="پیش_فرض" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} />
                <Tooltip contentStyle={{ direction: 'rtl', borderRadius: '12px', fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
