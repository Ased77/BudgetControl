import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CsrPriority, SmartRecommendationResult } from '../types';
import { useAppContext } from '../context/AppContext';
import { PageHeader } from './PageHeader';
import { Num } from './Num';
import {
  ChartCard,
  TooltipHeading,
  TooltipRow,
  TooltipShell,
  shortLabel,
} from './ChartCard';
import {
  formatHemmat,
  formatMoneyParts,
  formatPercent,
  toPersianDigits,
} from '../utils/numberUtils';
import {
  PieChart as PieIcon,
  BarChart3,
  Radar as RadarIcon,
  Globe2,
  CircleDot,
  Flame,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  X,
  RefreshCw,
  RotateCcw,
  Sliders,
  Play,
  Zap,
  MapPin,
  Gauge,
  Wallet,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Label,
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

/**
 * Palette for the allocation series. A hotspot/universal priority keeps its
 * semantic rose/purple hue instead (see `bubbleItems`), so colour on this page
 * always answers "how severe is this, locally?" before "which row is it?".
 */
const COLORS = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#4f46e5',
  '#f43f5e',
  '#0d9488',
  '#9333ea',
  '#ea580c',
  '#0284c7',
];

/** Quadrant rules of the allocation matrix, declared once for chips and tooltips. */
const SEVERITY_THRESHOLD = 45;
const BALANCED_ALLOCATION_PCT = 8.5;

/**
 * Page layout of the charts surface, in reading order:
 *
 *   1. Toolbar — the scope and the two live figures that describe the whole
 *      page (share total, distance from the smart recommendation).
 *   2. The allocation matrix — the page's question: is the money where the
 *      harm is? Bubble size carries the ريال amount, so one glance answers both
 *      "which priority is starved" and "how much money is that".
 *   3. The simulation tools, folded away by default: they *change* the
 *      allocation, so they sit after the analysis that reports it.
 *   4. Prevalence (4 tiers) — the evidence the matrix's horizontal axis is
 *      built from.
 *   5. Composition — the same allocation read as shares, as money, and as a
 *      manual-vs-smart profile.
 */
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

  const { selectedLocation } = context;

  // Matrix controls
  const [yAxisMetric, setYAxisMetric] = useState<'CURRENT' | 'RECOMMENDED'>('CURRENT');
  const [bubbleFilter, setBubbleFilter] = useState<'ALL' | 'HOTSPOTS' | 'DEFICITS'>('ALL');
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  // The simulation tools are folded away by default: they are the only controls
  // on the page that write, and the analysis above them is what most visits are
  // here for.
  const [showSimulation, setShowSimulation] = useState(false);

  // Live Synchronization Tracking
  const prevPercentagesRef = useRef<Record<string, number>>(currentPercentages);
  // The provider hydrates the entity payload (and therefore the smart shares)
  // shortly after boot, which rewrites every share at once. That is a data load,
  // not an operator decision, so the moments right after mount are treated as
  // the baseline: the page opens clean instead of lighting up all bubbles with
  // "changed" halos and +/− badges.
  const mountedAtRef = useRef<number>(Date.now());
  const NOTICE_SETTLE_MS = 2500;
  const [recentChanges, setRecentChanges] = useState<Record<string, { delta: number; prevPct: number; newPct: number; timestamp: number }>>({});
  const [lastSyncLog, setLastSyncLog] = useState<{ title: string; prevVal: number; newVal: number; delta: number; time: string } | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Detect live changes arriving from the dashboard, the priorities page or the
  // sliders in the simulation panel.
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
      // Silent re-baseline while the first payload is still landing.
      if (Date.now() - mountedAtRef.current < NOTICE_SETTLE_MS) {
        prevPercentagesRef.current = { ...currentPercentages };
        return;
      }

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
          ? `«${(mostRecentPriority as CsrPriority).title}» از ${toPersianDigits(mostRecentPrev)}٪ به ${toPersianDigits(mostRecentNew)}٪ تغییر کرد (${mostRecentDelta > 0 ? '+' : ''}${toPersianDigits(mostRecentDelta)} واحد درصد).`
          : `${toPersianDigits(changedCount)} سرفصل بودجه به‌روزرسانی شد و حباب‌های متناظر جابه‌جا شدند.`
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

  // Replay the movement animation: every bubble gets a temporary delta halo so
  // the transition can be shown again during a review meeting.
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
    setSyncNotice('انیمیشن جابه‌جایی و تغییر اندازه حباب‌ها بازپخش شد.');
    setTimeout(() => {
      setRecentChanges({});
      setSyncNotice(null);
    }, 3800);
  };

  // Matrix rows: one per priority, carrying severity, both share options and
  // the ريال consequence of each.
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

      // 4-Quadrant policy matrix: severity threshold 45٪, balanced allocation
      // threshold 8.5٪ (both declared above and drawn as reference lines).
      let quadrant: 'HOTSPOT_COVERED' | 'CRITICAL_DEFICIT' | 'PREVENTATIVE' | 'STABLE';
      let quadrantLabel = '';
      let quadrantBadgeClass = '';

      if (localSeverity >= SEVERITY_THRESHOLD && activePct >= BALANCED_ALLOCATION_PCT) {
        quadrant = 'HOTSPOT_COVERED';
        quadrantLabel = 'پوشش بهینه کانون بحران';
        quadrantBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      } else if (localSeverity >= SEVERITY_THRESHOLD && activePct < BALANCED_ALLOCATION_PCT) {
        quadrant = 'CRITICAL_DEFICIT';
        quadrantLabel = 'کسری بودجه در کانون بحران';
        quadrantBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
      } else if (localSeverity < SEVERITY_THRESHOLD && activePct >= BALANCED_ALLOCATION_PCT) {
        quadrant = 'PREVENTATIVE';
        quadrantLabel = 'سرمایه‌گذاری پیشگیرانه و زیربنایی';
        quadrantBadgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
      } else {
        quadrant = 'STABLE';
        quadrantLabel = 'مدیریت متعادل و پایدار';
        quadrantBadgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
      }

      let bubbleColor = COLORS[idx % COLORS.length];
      if (isHotspot) bubbleColor = '#e11d48';
      else if (isUniversal) bubbleColor = '#9333ea';

      return {
        id: p.id,
        code: p.code,
        title: p.title,
        shortTitle: shortLabel(p.title, 22),
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
        // Z axis metric in همت, so bubble diameter reads in the app's money unit.
        bubbleZMetric: Math.max(0.01, activeBudgetToman / 1_000_000_000_000),
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

  const filteredBubbles = useMemo(() => {
    if (bubbleFilter === 'HOTSPOTS') {
      return bubbleItems.filter((b) => b.isHotspot || b.isUniversal || b.deprivationIndex >= SEVERITY_THRESHOLD);
    }
    if (bubbleFilter === 'DEFICITS') {
      return bubbleItems.filter((b) => b.quadrant === 'CRITICAL_DEFICIT');
    }
    return bubbleItems;
  }, [bubbleItems, bubbleFilter]);

  const activeSelectedBubble = useMemo(() => {
    if (!selectedBubbleId) return null;
    return bubbleItems.find((b) => b.id === selectedBubbleId) || null;
  }, [bubbleItems, selectedBubbleId]);

  const quadrantStats = useMemo(() => {
    const covered = bubbleItems.filter((b) => b.quadrant === 'HOTSPOT_COVERED').length;
    const deficit = bubbleItems.filter((b) => b.quadrant === 'CRITICAL_DEFICIT').length;
    const preventative = bubbleItems.filter((b) => b.quadrant === 'PREVENTATIVE').length;
    const stable = bubbleItems.filter((b) => b.quadrant === 'STABLE').length;
    return { covered, deficit, preventative, stable };
  }, [bubbleItems]);

  /** Share total and distance from the smart recommendation — the page's two headline figures. */
  const allocationTotals = useMemo(() => {
    const sumPct = priorities.reduce(
      (sum, p) => sum + (currentPercentages[p.id] ?? p.defaultPercentage),
      0
    );
    const deviations = priorities.map((p) =>
      Math.abs(
        (currentPercentages[p.id] ?? p.defaultPercentage) -
          (recommendations.scores[p.id] ?? p.defaultPercentage)
      )
    );
    const meanAbsDeviation = deviations.length
      ? deviations.reduce((sum, value) => sum + value, 0) / deviations.length
      : 0;
    return {
      sumPct,
      balanced: Math.abs(sumPct - 100) <= 0.5,
      meanAbsDeviation,
    };
  }, [priorities, currentPercentages, recommendations.scores]);

  // Composition rows: share, current money and recommended money per priority.
  const allocationRows = useMemo(
    () =>
      priorities.map((p, idx) => {
        const pct = currentPercentages[p.id] ?? p.defaultPercentage;
        const recPct = recommendations.scores[p.id] ?? p.defaultPercentage;
        return {
          id: p.id,
          code: p.code,
          title: p.title,
          shortTitle: shortLabel(p.title, 13),
          category: p.category,
          color: bubbleItems[idx]?.color ?? COLORS[idx % COLORS.length],
          value: pct,
          recommendedPct: recPct,
          amountToman: Math.round((totalBudgetToman * pct) / 100),
          recommendedAmountToman: Math.round((totalBudgetToman * recPct) / 100),
        };
      }),
    [priorities, currentPercentages, recommendations.scores, totalBudgetToman, bubbleItems]
  );

  // Radar comparison (manual vs smart AI vs default)
  const radarData = useMemo(
    () =>
      priorities.map((p) => ({
        subject: shortLabel(p.title, 18),
        دستی: currentPercentages[p.id] ?? p.defaultPercentage,
        پیشنهاد_هوشمند: recommendations.scores[p.id] ?? p.defaultPercentage,
        پیش_فرض: p.defaultPercentage,
      })),
    [priorities, currentPercentages, recommendations.scores]
  );

  // 4-tier prevalence comparison
  const prevalenceData = useMemo(
    () =>
      priorities.map((p) => {
        const prev = recommendations.explainability[p.id]?.prevalence;
        return {
          name: shortLabel(p.title, 14),
          fullTitle: p.title,
          'میانگین کشوری': prev ? prev.national : 0,
          'میانگین استانی': prev ? prev.provincial : 0,
          'میانگین شهرستانی': prev ? prev.county : 0,
          'کانون محلی پیرامونی': prev ? prev.local : 0,
        };
      }),
    [priorities, recommendations.explainability]
  );

  // --- Tooltips --------------------------------------------------------------

  const BubbleTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <TooltipShell className="max-w-sm space-y-2.5">
        <TooltipHeading title={item.title} meta={item.category} color={item.color} />

        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <div>
            <span className="text-slate-500 block text-[10px]">شدت آسیب محلی</span>
            <Num value={formatPercent(item.deprivationIndex)} className="font-black text-risk-strong" />
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">میانگین کشور / ضریب LQ</span>
            <Num
              value={`${formatPercent(item.nationalSeverity)} / ${toPersianDigits(item.locationQuotient)}`}
              className="font-bold text-slate-700"
            />
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">
              {yAxisMetric === 'CURRENT' ? 'سهم بودجه کنونی' : 'سهم پیشنهادی AI'}
            </span>
            <Num value={formatPercent(item.activePct)} className="font-black text-indigo-700" />
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">مبلغ متناظر</span>
            <Num {...formatMoneyParts(item.activeBudgetToman)} className="font-black text-emerald-700" />
          </div>
        </div>

        <div className="space-y-1 pt-1.5 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500">ماتریس انطباق:</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.quadrantBadgeClass}`}>
              {item.quadrantLabel}
            </span>
          </div>
          {item.isHotspot ? (
            <div className="flex items-center gap-1.5 text-[10px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-1 rounded-md">
              <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" aria-hidden="true" />
              <span>کانون بحران حاد منطقه {selectedLocation.city} — نیازمند اولویت بودجه</span>
            </div>
          ) : null}
          <p className="text-[10px] text-slate-400 text-center pt-0.5">
            برای تحلیل تفصیلی روی حباب کلیک کنید
          </p>
        </div>
      </TooltipShell>
    );
  };

  const PrevalenceTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
      <TooltipShell>
        <TooltipHeading title={point.fullTitle ?? label} meta={point.category} />
        {payload.map((entry: any) => (
          <TooltipRow key={entry.dataKey} label={entry.name} color={entry.color ?? entry.stroke}>
            <Num value={formatPercent(Number(entry.value) || 0)} />
          </TooltipRow>
        ))}
        <div className="pt-1 text-[11px] text-slate-500 leading-relaxed">
          هر ستون یک سطح سنجش است؛ بالاتر بودن «کانون محلی» از «میانگین کشوری» یعنی آسیب در این
          محدوده از الگوی ملی شدیدتر است.
        </div>
      </TooltipShell>
    );
  };

  const AllocationMoneyTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    const deltaToman = point.recommendedAmountToman - point.amountToman;
    return (
      <TooltipShell>
        <TooltipHeading title={point.title} meta={point.category} color={point.color} />
        <TooltipRow label="مبلغ تخصیص فعلی" color="#2563eb">
          <Num {...formatMoneyParts(point.amountToman)} />
        </TooltipRow>
        <TooltipRow label="مبلغ پیشنهاد هوشمند" color="#9333ea">
          <Num {...formatMoneyParts(point.recommendedAmountToman)} />
        </TooltipRow>
        <TooltipRow label="اختلاف">
          <Num
            value={`${deltaToman >= 0 ? '+' : '\u2212'}${formatHemmat(Math.abs(deltaToman), 2)}`}
            unit="همت"
          />
        </TooltipRow>
        <TooltipRow label="سهم فعلی / پیشنهادی">
          <Num value={`${formatPercent(point.value)} / ${formatPercent(point.recommendedPct)}`} />
        </TooltipRow>
      </TooltipShell>
    );
  };

  const AllocationShareTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    const share = allocationRows.reduce((sum, row) => sum + row.value, 0);
    const shareOfTotal = share > 0 ? (point.value / share) * 100 : 0;
    return (
      <TooltipShell>
        <TooltipHeading title={point.title} meta={point.category} color={point.color} />
        <TooltipRow label="سهم مصوب" color={point.color}>
          <Num value={formatPercent(point.value)} />
        </TooltipRow>
        <TooltipRow label="مبلغ مصوب">
          <Num {...formatMoneyParts(point.amountToman)} />
        </TooltipRow>
        <TooltipRow label="سهم از مجموع تخصیص">
          <Num value={formatPercent(shareOfTotal)} />
        </TooltipRow>
      </TooltipShell>
    );
  };

  return (
    <div id="charts-view-root" className="space-y-6">
      <PageHeader
        id="charts-view-page-header"
        icon={BarChart3}
        title="نمودارها و تحلیل تخصیص"
        subtitle="آیا اعتبارات همان‌جایی نشسته که آسیب هست؟ تحلیل ماتریسی محرومیت و سهم بودجه، فراگیری چهارسطحی و ترکیب سرفصل‌ها"
        tone="text-indigo-600"
      >
        <button
          type="button"
          onClick={onApplySmartRecommendations}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span>اعمال پیشنهاد هوشمند AI</span>
        </button>

        <button
          type="button"
          onClick={onNavigateToDashboard}
          title="رفتن به داشبورد ملی"
          className="flex items-center gap-2 bg-transparent hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
        >
          <span>داشبورد</span>
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
        </button>
      </PageHeader>

      {/* ======================================================================= */}
      {/* TOOLBAR — the scope and the two figures that describe the whole page    */}
      {/* ======================================================================= */}
      <div
        id="charts-view-toolbar"
        className="bg-white rounded-2xl px-4 py-3 border border-slate-200 flex flex-wrap items-center gap-x-3 gap-y-2"
      >
        <span
          id="charts-view-toolbar-scope"
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
          محدوده فعال: {selectedLocation.province} — {selectedLocation.county}
        </span>

        <span
          id="charts-view-toolbar-share-total"
          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold ${
            allocationTotals.balanced
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
          title={
            allocationTotals.balanced
              ? 'مجموع سهم سرفصل‌ها تراز است'
              : 'مجموع سهم سرفصل‌ها با ۱۰۰٪ اختلاف دارد؛ از تراز خودکار در ابزار شبیه‌سازی استفاده کنید'
          }
        >
          {allocationTotals.balanced ? (
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          جمع سهم‌ها:
          <Num value={formatPercent(allocationTotals.sumPct, { fractionDigits: 1 })} />
        </span>

        <span
          id="charts-view-toolbar-ai-gap"
          className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-800"
          title="میانگین فاصله سهم مصوب هر سرفصل از پیشنهاد الگوریتم هوشمند"
        >
          <Gauge className="w-3.5 h-3.5" aria-hidden="true" />
          انحراف میانگین از پیشنهاد هوشمند:
          <Num
            value={`${toPersianDigits(allocationTotals.meanAbsDeviation.toFixed(1))} واحد درصد`}
          />
        </span>

        <span
          id="charts-view-toolbar-last-change"
          className="ms-auto flex items-center gap-1.5 text-[11px] text-slate-500"
        >
          {lastSyncLog ? (
            <>
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              آخرین تغییر {lastSyncLog.time} — {shortLabel(lastSyncLog.title, 24)}
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-300" aria-hidden="true" />
              در این نشست تغییری در تخصیص ثبت نشده است
            </>
          )}
        </span>

        {/* Transient confirmation of a live change; disappears on its own. */}
        {syncNotice ? (
          <p
            id="charts-view-toolbar-sync-notice"
            role="status"
            className="w-full text-[11px] text-indigo-700 bg-indigo-50/70 border border-indigo-100 rounded-xl px-2.5 py-1.5"
          >
            {syncNotice}
          </p>
        ) : null}
      </div>

      {/* ======================================================================= */}
      {/* 1. ALLOCATION MATRIX — severity against share of budget                 */}
      {/* ======================================================================= */}
      <ChartCard
        id="charts-view-allocation-matrix"
        icon={CircleDot}
        tone="text-indigo-600"
        title="ماتریس تخصیص: شدت آسیب منطقه در برابر سهم بودجه"
        subtitle="محور افقی شاخص محرومیت محلی، محور عمودی سهم بودجه و قطر حباب حجم اعتبار (همت) — برای تحلیل هر سرفصل روی حباب آن بزنید"
        control={
          <div className="flex flex-wrap items-center gap-2">
            {/* Which share the vertical axis reads */}
            <div
              id="charts-view-matrix-metric-switcher"
              role="group"
              aria-label="معیار محور عمودی"
              className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold"
            >
              <button
                type="button"
                onClick={() => setYAxisMetric('CURRENT')}
                aria-pressed={yAxisMetric === 'CURRENT'}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  yAxisMetric === 'CURRENT'
                    ? 'bg-white text-indigo-700 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تخصیص فعلی
              </button>
              <button
                type="button"
                onClick={() => setYAxisMetric('RECOMMENDED')}
                aria-pressed={yAxisMetric === 'RECOMMENDED'}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  yAxisMetric === 'RECOMMENDED'
                    ? 'bg-white text-purple-700 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-500" aria-hidden="true" />
                <span>پیشنهاد هوشمند AI</span>
              </button>
            </div>

            {/* Which rows the matrix draws */}
            <div
              id="charts-view-matrix-filters"
              role="group"
              aria-label="فیلتر سرفصل‌ها"
              className="flex items-center gap-1 text-xs"
            >
              <button
                type="button"
                onClick={() => setBubbleFilter('ALL')}
                aria-pressed={bubbleFilter === 'ALL'}
                className={`px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
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
                aria-pressed={bubbleFilter === 'HOTSPOTS'}
                title="سرفصل‌هایی با آسیب بالاتر از مرز بحران محلی"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                  bubbleFilter === 'HOTSPOTS'
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                }`}
              >
                <Flame className="w-3 h-3" aria-hidden="true" />
                <span>کانون‌های بحران ({toPersianDigits(bubbleItems.filter((b) => b.deprivationIndex >= SEVERITY_THRESHOLD).length)})</span>
              </button>

              <button
                type="button"
                onClick={() => setBubbleFilter('DEFICITS')}
                aria-pressed={bubbleFilter === 'DEFICITS'}
                title="آسیب بالا ولی سهم بودجه کمتر از مرز تخصیص متعادل"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                  bubbleFilter === 'DEFICITS'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                }`}
              >
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                <span>کسری بودجه ({toPersianDigits(quadrantStats.deficit)})</span>
              </button>
            </div>
          </div>
        }
      >
        {/* Quadrant tally — a compact strip: the chart is the subject, this is its key */}
        <div
          id="charts-view-matrix-quadrant-strip"
          className="flex flex-wrap items-center gap-2 text-[11px]"
        >
          <span
            id="charts-view-matrix-quadrant-covered"
            title="آسیب بالای مرز بحران و بودجه مکفی (≥ ۸.۵٪)"
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2 py-1 font-bold text-emerald-800"
          >
            پوشش کانون بحران
            <Num value={toPersianDigits(quadrantStats.covered)} className="bg-white px-1.5 rounded border border-emerald-200" />
          </span>
          <span
            id="charts-view-matrix-quadrant-deficit"
            title="آسیب بالای مرز بحران و بودجه کمتر از ۸.۵٪"
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-2 py-1 font-bold text-rose-800"
          >
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            کسری بودجه
            <Num value={toPersianDigits(quadrantStats.deficit)} className="bg-white px-1.5 rounded border border-rose-200" />
          </span>
          <span
            id="charts-view-matrix-quadrant-preventative"
            title="آسیب زیر مرز بحران و بودجه مکفی"
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2 py-1 font-bold text-blue-800"
          >
            سرمایه‌گذاری پیشگیرانه
            <Num value={toPersianDigits(quadrantStats.preventative)} className="bg-white px-1.5 rounded border border-blue-200" />
          </span>
          <span
            id="charts-view-matrix-quadrant-stable"
            title="آسیب زیر مرز بحران و بودجه متناسب"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-bold text-slate-700"
          >
            مدیریت پایدار
            <Num value={toPersianDigits(quadrantStats.stable)} className="bg-white px-1.5 rounded border border-slate-200" />
          </span>
          <span className="text-slate-400">
            نمایش {toPersianDigits(filteredBubbles.length)} از {toPersianDigits(bubbleItems.length)} سرفصل
          </span>
        </div>

        {/* Matrix canvas */}
        <div
          id="charts-view-matrix-canvas"
          className="h-[clamp(360px,52vh,520px)] w-full relative"
          dir="ltr"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 25, right: 30, bottom: 40, left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical stroke="#f1f5f9" />

              <XAxis
                type="number"
                dataKey="deprivationIndex"
                name="شاخص محرومیت و آسیب محلی"
                domain={[10, 80]}
                unit="٪"
                tickFormatter={(v) => toPersianDigits(v) + '٪'}
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{
                  value: 'شدت آسیب و محرومیت در منطقه (شاخص ۱۰۰)',
                  position: 'bottom',
                  offset: 20,
                  fontSize: 11,
                  fill: '#475569',
                  fontWeight: 'bold',
                }}
              />

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
                  offset: 4,
                  fontSize: 11,
                  fill: '#475569',
                  fontWeight: 'bold',
                }}
              />

              {/* Bubble diameter carries the ريال amount, in همت */}
              <ZAxis
                type="number"
                dataKey="bubbleZMetric"
                range={[160, 1100]}
                name="مبلغ بودجه"
                unit=" همت"
              />

              <ReferenceLine x={SEVERITY_THRESHOLD} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5}>
                <Label
                  value={`مرز بحران آسیب محلی (${toPersianDigits(SEVERITY_THRESHOLD)}٪)`}
                  position="insideTopRight"
                  fill="#e11d48"
                  fontSize={10}
                  fontWeight="bold"
                />
              </ReferenceLine>

              <ReferenceLine y={BALANCED_ALLOCATION_PCT} stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1.5}>
                <Label
                  value={`مرز تخصیص متعادل (${toPersianDigits(BALANCED_ALLOCATION_PCT)}٪)`}
                  position="insideTopLeft"
                  fill="#4f46e5"
                  fontSize={10}
                  fontWeight="bold"
                />
              </ReferenceLine>

              <Tooltip content={<BubbleTooltip />} />

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
                      {/* Halo marking a recently changed bubble */}
                      {change ? (
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
                      ) : null}

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

                      {radius >= 13 ? (
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
                      ) : null}

                      {change && delta !== undefined && Math.abs(delta) >= 0.05 ? (
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
                      ) : null}
                    </g>
                  );
                }}
                cursor="pointer"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div
          id="charts-view-matrix-legend"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-600"
        >
          <span className="text-slate-700">راهنمای بصری:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600" aria-hidden="true" />
            کانون بحران محلی
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-600" aria-hidden="true" />
            فراگیری بحرانی همه‌جانبه
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400" aria-hidden="true" />
            <span className="w-4 h-4 rounded-full bg-slate-400" aria-hidden="true" />
            قطر حباب = حجم اعتبار مصوب (همت)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-rose-500" aria-hidden="true" />
            مرز بحران آسیب
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-indigo-500" aria-hidden="true" />
            مرز تخصیص متعادل
          </span>
        </div>

        {/* Drill-down inspector */}
        {activeSelectedBubble ? (
          <div
            id="charts-view-matrix-inspector"
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3 animate-in fade-in duration-200"
          >
            <div
              id="charts-view-matrix-inspector-header"
              className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeSelectedBubble.color }}
                  aria-hidden="true"
                />
                <span className="font-black text-slate-900 text-sm truncate">
                  کد {toPersianDigits(activeSelectedBubble.code)} — {activeSelectedBubble.title}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0">
                  {activeSelectedBubble.category}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBubbleId(null)}
                aria-label="بستن تحلیل"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">شدت آسیب محلی {selectedLocation.city}</span>
                <Num
                  value={formatPercent(activeSelectedBubble.deprivationIndex)}
                  className="text-base font-black text-risk-strong mt-0.5 block"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  میانگین کشور: <Num value={formatPercent(activeSelectedBubble.nationalSeverity)} /> — ضریب LQ:{' '}
                  <Num value={toPersianDigits(activeSelectedBubble.locationQuotient)} />
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">سهم بودجه و مقایسه با پیشنهاد هوشمند</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <Num value={formatPercent(activeSelectedBubble.currentPct)} className="text-base font-black text-indigo-700" />
                  <Num
                    value={formatPercent(activeSelectedBubble.recommendedPct)}
                    className="text-xs font-bold text-purple-700"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  مبلغ:{' '}
                  <Num {...formatMoneyParts(activeSelectedBubble.activeBudgetToman)} className="font-bold text-slate-700" />
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 md:col-span-2">
                <span className="text-[10px] text-slate-500 block">موقعیت در ماتریس تصمیم‌گیری و توصیه اصلاحی</span>
                <span
                  className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-md border mt-1 ${activeSelectedBubble.quadrantBadgeClass}`}
                >
                  {activeSelectedBubble.quadrantLabel}
                </span>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  {activeSelectedBubble.rationale || activeSelectedBubble.primaryDriver}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">
            روی هر حباب بزنید تا تحلیل تفصیلی همان سرفصل — شدت محلی، ضریب LQ، سهم پیشنهادی و توصیه
            اصلاحی — در همین کادر باز شود.
          </p>
        )}
      </ChartCard>

      {/* ======================================================================= */}
      {/* 2. SIMULATION TOOLS — folded away; they change the allocation           */}
      {/* ======================================================================= */}
      <div
        id="charts-view-simulation-panel"
        className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
      >
        <button
          type="button"
          id="charts-view-simulation-toggle"
          onClick={() => setShowSimulation(!showSimulation)}
          aria-expanded={showSimulation}
          aria-controls="charts-view-simulation-body"
          className="w-full flex items-center gap-3 px-5 sm:px-6 py-4 text-start hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 shrink-0">
            <Zap className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-sm text-slate-900">ابزار شبیه‌سازی تخصیص</span>
            <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">
              جابه‌جایی زنده سهم‌ها، تراز خودکار، اعمال پیشنهاد هوشمند و بازپخش انیمیشن حباب‌ها
            </span>
          </span>
          {lastSyncLog ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 shrink-0">
              <Play className="w-3 h-3 text-indigo-600" aria-hidden="true" />
              آخرین تغییر {lastSyncLog.time}
            </span>
          ) : null}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${showSimulation ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {showSimulation ? (
          <div
            id="charts-view-simulation-body"
            className="px-5 sm:px-6 pb-5 border-t border-slate-100 pt-4 space-y-4"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleReplayAnimation}
                title="پخش مجدد انیمیشن جابه‌جایی و تغییر اندازه حباب‌ها"
                className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <Play className="w-3 h-3 text-indigo-600 fill-indigo-600" aria-hidden="true" />
                <span>بازپخش انیمیشن</span>
              </button>

              {onAutoRebalance ? (
                <button
                  type="button"
                  onClick={onAutoRebalance}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-indigo-600" aria-hidden="true" />
                  <span>تراز خودکار ۱۰۰٪</span>
                </button>
              ) : null}

              {onApplySmartRecommendations ? (
                <button
                  type="button"
                  onClick={onApplySmartRecommendations}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  <span>اعمال پیشنهاد هوشمند AI</span>
                </button>
              ) : null}

              {onResetToDefault ? (
                <button
                  type="button"
                  onClick={onResetToDefault}
                  title="بازنشانی به وزن‌های پیش‌فرض"
                  className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>بازنشانی پیش‌فرض</span>
                </button>
              ) : null}

              <span className="flex items-center gap-1.5 text-[11px] text-slate-500 ms-auto">
                <Sliders className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                هر تغییر، حباب متناظر را در ماتریس بالا جابه‌جا می‌کند.
              </span>
            </div>

            {onPercentageChange ? (
              <div id="charts-view-simulation-sliders" className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {priorities.map((p) => {
                  const currentVal = currentPercentages[p.id] ?? p.defaultPercentage;
                  const recVal = recommendations.scores[p.id] ?? p.defaultPercentage;
                  const bubbleInfo = bubbleItems.find((b) => b.id === p.id);
                  const isRecentlyChanged = recentChanges[p.id] !== undefined;

                  return (
                    <div
                      key={`adjuster-${p.id}`}
                      className={`p-2.5 rounded-lg border transition-all ${
                        isRecentlyChanged
                          ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/40'
                          : selectedBubbleId === p.id
                          ? 'bg-indigo-50/70 border-indigo-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: bubbleInfo?.color || '#6366f1' }}
                            aria-hidden="true"
                          />
                          <span className="text-[11px] font-bold text-slate-900 truncate" title={p.title}>
                            کد {toPersianDigits(p.code)} — {p.title}
                          </span>
                        </div>
                        <Num
                          value={formatPercent(currentVal)}
                          className="text-[11px] font-black text-indigo-700 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded"
                        />
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="24"
                        step="0.5"
                        value={currentVal}
                        aria-label={`سهم ${p.title}`}
                        onChange={(e) => onPercentageChange(p.id, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />

                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          شدت آسیب:
                          <Num value={formatPercent(bubbleInfo?.deprivationIndex || 0)} className="font-bold" />
                        </span>
                        <span className="flex items-center gap-1">
                          پیشنهاد AI:
                          <Num value={formatPercent(recVal)} className="font-bold text-purple-700" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ======================================================================= */}
      {/* 3. PREVALENCE — the evidence behind the matrix's horizontal axis        */}
      {/* ======================================================================= */}
      <ChartCard
        id="charts-view-prevalence-4tier"
        icon={Globe2}
        tone="text-indigo-600"
        title="فراگیری چهارسطحی: کشوری، استانی، شهرستانی و کانون محلی"
        subtitle="هر سرفصل در چهار سطح سنجیده شده است؛ جایی که «کانون محلی» از «میانگین کشوری» بالاتر می‌زند، همان‌جا اولویت تخصیص است (واحد: درصد فراگیری)"
      >
        <div id="charts-view-prevalence-canvas" className="h-[clamp(300px,50vh,460px)] w-full" dir="ltr">
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
              <Tooltip content={<PrevalenceTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="میانگین کشوری" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="میانگین استانی" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="میانگین شهرستانی" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="کانون محلی پیرامونی" fill="#e11d48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ======================================================================= */}
      {/* 4. COMPOSITION — the same allocation as shares, as money and as shape   */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shares */}
        <ChartCard
          id="charts-view-allocation-shares"
          icon={PieIcon}
          tone="text-blue-600"
          title="ترکیب سرفصل‌ها: سهم درصدی و مبلغ مصوب"
          subtitle="سهم هر سرفصل از اعتبارات مصوب محدوده فعال، به درصد و به مبلغ"
        >
          {allocationRows.length === 0 ? (
            <p className="text-xs text-slate-500">سرفصل اولویتی برای نمایش ثبت نشده است.</p>
          ) : (
            <>
              <div className="relative h-[clamp(240px,34vh,300px)] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationRows}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={94}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="title"
                    >
                      {allocationRows.map((row) => (
                        <Cell key={`share-cell-${row.id}`} fill={row.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<AllocationShareTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut centre: the budget the shares divide up */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-slate-500">کل اعتبارات مصوب</span>
                  <Num {...formatMoneyParts(totalBudgetToman)} className="text-base font-black text-slate-900" />
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    {toPersianDigits(allocationRows.length)} سرفصل فعال
                  </span>
                </div>
              </div>

              <ul id="charts-view-allocation-shares-list" className="space-y-1.5 pt-3 border-t border-slate-100">
                {allocationRows.map((row) => (
                  <li key={`share-row-${row.id}`} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: row.color }}
                        aria-hidden="true"
                      />
                      <span className="truncate text-slate-700" title={row.title}>
                        {row.title}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <Num value={formatPercent(row.value)} className="font-black text-slate-800" />
                      <Num
                        {...formatMoneyParts(row.amountToman)}
                        className="font-bold text-slate-500 w-24 text-end"
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </ChartCard>

        {/* Money */}
        <ChartCard
          id="charts-view-allocation-money"
          icon={Wallet}
          tone="text-emerald-600"
          title="مبلغ تخصیص فعلی در برابر پیشنهاد هوشمند"
          subtitle="مقایسه ریالی دو سناریوی تخصیص به تفکیک سرفصل — واحد: همت"
        >
          <div id="charts-view-allocation-money-canvas" className="h-[clamp(280px,42vh,380px)] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allocationRows} margin={{ top: 10, right: 12, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="shortTitle"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis
                  tickFormatter={(v) => formatHemmat(Number(v), 0)}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <Tooltip content={<AllocationMoneyTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar
                  dataKey="amountToman"
                  name="تخصیص فعلی (همت)"
                  fill="#2563eb"
                  radius={[5, 5, 0, 0]}
                />
                <Bar
                  dataKey="recommendedAmountToman"
                  name="پیشنهاد هوشمند (همت)"
                  fill="#9333ea"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Profile */}
        <ChartCard
          id="charts-view-alignment-radar"
          icon={RadarIcon}
          tone="text-purple-600"
          title="تطبیق راداری: تخصیص دستی، پیشنهاد هوشمند و وزن پیش‌فرض"
          subtitle="پروفایل هر سرفصل در سه سناریو؛ هر چه دو چندضلعی «دستی» و «پیشنهاد هوشمند» به هم نزدیک‌تر باشند، تخصیص متعادل‌تر است"
          className="lg:col-span-2"
        >
          <div id="charts-view-alignment-radar-canvas" className="h-[clamp(300px,50vh,460px)] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#334155' }} />
                <PolarRadiusAxis angle={30} domain={[0, 30]} tick={{ fontSize: 10 }} />
                <Radar name="تخصیص دستی" dataKey="دستی" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
                <Radar
                  name="پیشنهاد هوشمند AI"
                  dataKey="پیشنهاد_هوشمند"
                  stroke="#9333ea"
                  fill="#9333ea"
                  fillOpacity={0.25}
                />
                <Radar name="وزن پیش‌فرض" dataKey="پیش_فرض" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 15 }} />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <TooltipShell>
                        <TooltipHeading title={String(label ?? '')} meta="درصد سهم از اعتبارات" />
                        {payload.map((entry: any) => (
                          <TooltipRow
                            key={entry.dataKey}
                            label={entry.name}
                            color={entry.color ?? entry.stroke}
                          >
                            <Num value={formatPercent(Number(entry.value) || 0)} />
                          </TooltipRow>
                        ))}
                      </TooltipShell>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};
