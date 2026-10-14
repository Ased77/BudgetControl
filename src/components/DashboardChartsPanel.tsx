import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Num } from './Num';
import {
  ChartCard,
  ChartEmptyState,
  OneLineCategoryTick,
  TooltipRow,
  TooltipShell,
  shortLabel,
} from './ChartCard';
import {
  formatHemmat,
  formatMoney,
  formatMoneyParts,
  formatNumber,
  formatPercent,
  toPersianDigits,
} from '../utils/numberUtils';
import { PROJECT_STATUS_META } from '../utils/projectStatusMeta';
import { LocalIndicators, ProjectStatus, UrgencyLevel } from '../types';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CircleDollarSign,
  Flame,
  Layers,
  PieChart as PieIcon,
  Radar as RadarIcon,
  ShieldAlert,
  Wallet,
} from 'lucide-react';

/**
 * Dashboard analytics panel — the dashboard's own answer to the «نمودارها» page.
 *
 * The charts page visualises the *allocation decision* (deprivation vs. budget,
 * manual vs. smart weights). This panel instead visualises the dashboard's own
 * macro picture: what the county's deprivation profile looks like, where the
 * money comes from and how much of it is still unspent, how the project
 * portfolio is distributed, which crises are acute, how the departments are
 * absorbing their budgets, and what the anti-duplication engine is flagging.
 *
 * Every series is derived at render time from the scoped context data (the
 * provider already narrows each list to the active county), so nothing here can
 * drift from the tables and KPIs elsewhere in the app.
 */

/** Palette shared with the charts page, so the same subject keeps the same hue. */
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

/**
 * The nine deprivation axes the dashboard scores for the active area. Kept in
 * one list so the chart, its tooltip and the "worst indicator" footer all read
 * the same labels.
 */
const INDICATOR_AXES: { key: keyof LocalIndicators; label: string }[] = [
  { key: 'povertyRate', label: 'نرخ فقر' },
  { key: 'marginalizationRate', label: 'حاشیه‌نشینی' },
  { key: 'unemploymentRate', label: 'بیکاری' },
  { key: 'socialHarmsIndex', label: 'آسیب‌های اجتماعی' },
  { key: 'infrastructureDeficit', label: 'کسری زیرساخت' },
  { key: 'crisisVulnerabilityScore', label: 'آسیب‌پذیری بحران' },
  { key: 'healthAccessDeficit', label: 'کسری دسترسی سلامت' },
  { key: 'educationDropOutRate', label: 'ترک تحصیل' },
  { key: 'culturalDeficitScore', label: 'کسری فرهنگی' },
  { key: 'environmentalRiskScore', label: 'ریسک زیست‌محیطی' },
];

/**
 * Management threshold drawn on the deprivation radar. This is a declared
 * policy line (scores are computed on a 0–100 scale), NOT measured data — it is
 * labelled «آستانه هشدار» everywhere it appears so it can never be mistaken for
 * a national average.
 */
const INDICATOR_ALERT_THRESHOLD = 50;

/** Project statuses in workflow order, each with the hue the chart draws. */
const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  'PROPOSED',
  'APPROVED',
  'IN_PROGRESS',
  'COMPLETED',
  'SUSPENDED',
];

const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  PROPOSED: '#94a3b8',
  APPROVED: '#4f46e5',
  IN_PROGRESS: '#2563eb',
  COMPLETED: '#059669',
  SUSPENDED: '#d97706',
};

/** Crisis urgency hues — the same semantic scale the status tokens encode. */
const URGENCY_META: Record<UrgencyLevel, { label: string; color: string }> = {
  CRITICAL: { label: 'بحرانی', color: '#dc2626' },
  HIGH: { label: 'بالا', color: '#d97706' },
  MEDIUM: { label: 'متوسط', color: '#2563eb' },
  LOW: { label: 'پایین', color: '#94a3b8' },
};

const CRISIS_STATUS_LABELS: Record<string, string> = {
  UNRESOLVED: 'حل‌نشده',
  UNDER_INTERVENTION: 'در دست مداخله',
  CONTROLLED: 'کنترل‌شده',
};

/** Anti-duplication alert families, in the order the engine reports them. */
const ALERT_TYPE_META: Record<
  string,
  { label: string; color: string; description: string }
> = {
  DUPLICATE_SCOPE: {
    label: 'تداخل محدوده اجرا',
    color: '#dc2626',
    description: 'دو یا چند پروژه با دامنه و موضوع یکسان',
  },
  EXCESSIVE_PER_CAPITA: {
    label: 'سرانه بالاتر از متعارف',
    color: '#d97706',
    description: 'هزینه به ازای هر ذی‌نفع از الگوی منطقه بیشتر است',
  },
  MISALIGNED_PRIORITY: {
    label: 'ناهم‌خوانی با اولویت‌ها',
    color: '#4f46e5',
    description: 'پروژه با سرفصل اولویت‌دار منطقه هم‌راستا نیست',
  },
  BUDGET_OVER_ALLOCATED: {
    label: 'تخصیص بیش از سقف منبع',
    color: '#9333ea',
    description: 'تعهدات از سقف منبع مالی فراتر رفته است',
  },
};

const ALERT_SEVERITY_META: Record<string, { label: string; className: string }> = {
  CRITICAL: { label: 'بحرانی', className: 'bg-rose-100 text-rose-800 border-rose-200' },
  WARNING: { label: 'هشدار', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  INFO: { label: 'اطلاعی', className: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const DashboardChartsPanel: React.FC = () => {
  const {
    departments,
    budgetSources,
    projects,
    crisesHarms,
    antiDuplicationAlerts,
    optimizationMetrics,
    priorities,
    currentPercentages,
    selectedLocation,
    setActiveTab,
  } = useAppContext();

  // Projects-by-status metric toggle: money tells the portfolio's weight, count
  // tells its shape. Both come from the same rows, so the toggle only swaps the
  // measure, never the data.
  const [projectMetric, setProjectMetric] = useState<'VALUE' | 'COUNT'>('VALUE');
  // Crisis status filter — the three states the registry itself tracks.
  const [crisisFilter, setCrisisFilter] = useState<
    'ALL' | 'UNRESOLVED' | 'UNDER_INTERVENTION' | 'CONTROLLED'
  >('ALL');

  /** 1. Deprivation profile of the active area, one axis per scored indicator. */
  const indicatorRadarData = useMemo(
    () =>
      INDICATOR_AXES.map((axis) => ({
        subject: axis.label,
        محدوده_فعال: Number(selectedLocation.indicators[axis.key] ?? 0),
        آستانه_هشدار: INDICATOR_ALERT_THRESHOLD,
      })),
    [selectedLocation.indicators]
  );

  const worstIndicator = useMemo(() => {
    const scored = INDICATOR_AXES.map((axis) => ({
      label: axis.label,
      value: Number(selectedLocation.indicators[axis.key] ?? 0),
    })).sort((a, b) => b.value - a.value);
    return scored[0];
  }, [selectedLocation.indicators]);

  const aboveThresholdCount = useMemo(
    () =>
      INDICATOR_AXES.filter(
        (axis) => Number(selectedLocation.indicators[axis.key] ?? 0) >= INDICATOR_ALERT_THRESHOLD
      ).length,
    [selectedLocation.indicators]
  );

  /** 2. Funding mix — cap and consumption rolled up per source family. */
  const sourceTypeMix = useMemo(() => {
    const map = new Map<
      string,
      { name: string; totalToman: number; allocatedToman: number; count: number }
    >();
    budgetSources.forEach((source) => {
      const key = source.sourceTypeFa || 'سایر منابع';
      const current = map.get(key) ?? { name: key, totalToman: 0, allocatedToman: 0, count: 0 };
      current.totalToman += source.totalAmountToman;
      current.allocatedToman += source.allocatedAmountToman;
      current.count += 1;
      map.set(key, current);
    });
    // The slice colour travels with the row, so the donut, its tooltip and the
    // list below can never disagree about which hue belongs to which source.
    return [...map.values()]
      .sort((a, b) => b.totalToman - a.totalToman)
      .map((item, index) => ({ ...item, color: COLORS[index % COLORS.length] }));
  }, [budgetSources]);

  const totalSourcesToman = useMemo(
    () => sourceTypeMix.reduce((sum, item) => sum + item.totalToman, 0),
    [sourceTypeMix]
  );
  const totalAllocatedToman = useMemo(
    () => sourceTypeMix.reduce((sum, item) => sum + item.allocatedToman, 0),
    [sourceTypeMix]
  );
  const overallConsumptionPct =
    totalSourcesToman > 0 ? (totalAllocatedToman / totalSourcesToman) * 100 : 0;

  /** 3. Per-source cap, consumption and remainder — the drawdown detail view. */
  const budgetSourceRows = useMemo(
    () =>
      [...budgetSources]
        .sort((a, b) => b.totalAmountToman - a.totalAmountToman)
        .map((source) => ({
          id: source.id,
          name: shortLabel(source.title, 26),
          fullTitle: source.title,
          sponsor: source.sponsorOrganization,
          typeFa: source.sourceTypeFa,
          status: source.status,
          سقف_منبع: source.totalAmountToman,
          تخصیص_یافته: source.allocatedAmountToman,
          مانده: source.remainingAmountToman,
        })),
    [budgetSources]
  );

  /** 4. Project portfolio by status — value in همت and count side by side. */
  const projectStatusData = useMemo(
    () =>
      PROJECT_STATUS_ORDER.map((status) => {
        const rows = projects.filter((project) => project.status === status);
        const valueToman = rows.reduce((sum, project) => sum + project.estimatedCostToman, 0);
        const avgProgress = rows.length
          ? rows.reduce((sum, project) => sum + project.progressPercentage, 0) / rows.length
          : 0;
        return {
          status,
          label: PROJECT_STATUS_META[status].label,
          count: rows.length,
          valueToman,
          avgProgress,
          color: PROJECT_STATUS_COLORS[status],
        };
      }),
    [projects]
  );

  /** 5. Crisis map — severity against the population actually affected. */
  const crisisPoints = useMemo(
    () =>
      crisesHarms.map((crisis, index) => ({
        id: crisis.id,
        title: crisis.title,
        category: crisis.category,
        district: crisis.districtOrVillage,
        urgency: crisis.urgency,
        urgencyLabel: URGENCY_META[crisis.urgency]?.label ?? crisis.urgency,
        statusFa: CRISIS_STATUS_LABELS[crisis.status] ?? crisis.status,
        status: crisis.status,
        primaryCause: crisis.primaryCause,
        intervention: crisis.recommendedIntervention,
        deficitFa: crisis.deficitIndexFa,
        severityScore: crisis.severityScore,
        affectedPopulation: crisis.affectedPopulation,
        activeProjectsCount: crisis.activeProjectsCount,
        bubbleZ: Math.max(1, crisis.activeProjectsCount),
        color: URGENCY_META[crisis.urgency]?.color ?? COLORS[index % COLORS.length],
      })),
    [crisesHarms]
  );

  const filteredCrisisPoints = useMemo(
    () =>
      crisisFilter === 'ALL'
        ? crisisPoints
        : crisisPoints.filter((point) => point.status === crisisFilter),
    [crisisPoints, crisisFilter]
  );

  const crisisCounts = useMemo(
    () => ({
      ALL: crisisPoints.length,
      UNRESOLVED: crisisPoints.filter((c) => c.status === 'UNRESOLVED').length,
      UNDER_INTERVENTION: crisisPoints.filter((c) => c.status === 'UNDER_INTERVENTION').length,
      CONTROLLED: crisisPoints.filter((c) => c.status === 'CONTROLLED').length,
    }),
    [crisisPoints]
  );

  /** 6. Department delivery — absorption rate beside the performance score (both 0–100). */
  const departmentRows = useMemo(
    () =>
      departments
        .map((department) => {
          const absorptionPct =
            department.allocatedBudgetToman > 0
              ? (department.absorbedBudgetToman / department.allocatedBudgetToman) * 100
              : 0;
          return {
            id: department.id,
            name: shortLabel(department.name, 22),
            fullName: department.name,
            categoryFa: department.categoryFa,
            head: department.headPersonName,
            allocatedToman: department.allocatedBudgetToman,
            absorbedToman: department.absorbedBudgetToman,
            activeProjects: department.activeProjectsCount,
            absorptionPct: Number(absorptionPct.toFixed(1)),
            performanceScore: department.performanceScore,
          };
        })
        .sort((a, b) => b.absorptionPct - a.absorptionPct),
    [departments]
  );

  const averageAbsorptionPct = useMemo(
    () =>
      departmentRows.length
        ? departmentRows.reduce((sum, row) => sum + row.absorptionPct, 0) / departmentRows.length
        : 0,
    [departmentRows]
  );

  // The chart shows the departments that carry the money: every row at once
  // would draw 30+ bars into ~380px and become unreadable. Ranking by allocated
  // budget keeps the comparison material, and the footer states how many rows
  // the average covers, so the truncation is never hidden.
  const DEPARTMENT_CHART_LIMIT = 12;
  const departmentChartRows = useMemo(
    () => [...departmentRows].sort((a, b) => b.allocatedToman - a.allocatedToman).slice(0, DEPARTMENT_CHART_LIMIT),
    [departmentRows]
  );

  /** 7. What the anti-duplication engine is currently flagging. */
  const alertMix = useMemo(() => {
    const map = new Map<string, { type: string; label: string; color: string; description: string; count: number }>();
    antiDuplicationAlerts.forEach((alert) => {
      const meta = ALERT_TYPE_META[alert.type] ?? {
        label: alert.type,
        color: '#64748b',
        description: alert.description,
      };
      const current =
        map.get(alert.type) ??
        { type: alert.type, label: meta.label, color: meta.color, description: meta.description, count: 0 };
      current.count += 1;
      map.set(alert.type, current);
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [antiDuplicationAlerts]);

  const alertSeverityCounts = useMemo(
    () => ({
      CRITICAL: antiDuplicationAlerts.filter((a) => a.severity === 'CRITICAL').length,
      WARNING: antiDuplicationAlerts.filter((a) => a.severity === 'WARNING').length,
      INFO: antiDuplicationAlerts.filter((a) => a.severity === 'INFO').length,
    }),
    [antiDuplicationAlerts]
  );

  const totalAlerts = antiDuplicationAlerts.length;
  const preventedWasteToman = optimizationMetrics.preventedWastedBudgetToman ?? 0;

  // Allocation weight of the top priority on the radar panel's footer: keeps the
  // section connected to the live allocation state shown in the charts page.
  const topPriority = useMemo(() => {
    const ranked = priorities
      .map((priority) => ({
        title: priority.title,
        pct: currentPercentages[priority.id] ?? priority.defaultPercentage,
      }))
      .sort((a, b) => b.pct - a.pct);
    return ranked[0];
  }, [priorities, currentPercentages]);

  // --- Chart tooltips --------------------------------------------------------

  const IndicatorTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    const value = Number(point['محدوده_فعال']);
    const over = value >= INDICATOR_ALERT_THRESHOLD;
    return (
      <TooltipShell>
        <div className="font-black text-slate-900 pb-1 border-b border-slate-100">{point.subject}</div>
        <TooltipRow label="مقدار شاخص در محدوده فعال" color="#4f46e5">
          <Num value={formatPercent(value)} />
        </TooltipRow>
        <TooltipRow label="آستانه هشدار مدیریتی" color="#f43f5e">
          <Num value={formatPercent(INDICATOR_ALERT_THRESHOLD)} />
        </TooltipRow>
        <div
          className={`pt-1 text-[11px] font-bold ${over ? 'text-risk-strong' : 'text-emerald-700'}`}
        >
          {over
            ? 'بالای آستانه هشدار — نیازمند مداخله در اولویت بودجه'
            : 'زیر آستانه هشدار — وضعیت قابل مدیریت'}
        </div>
      </TooltipShell>
    );
  };

  const SourceTypeTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    const share = totalSourcesToman > 0 ? (point.totalToman / totalSourcesToman) * 100 : 0;
    const consumption = point.totalToman > 0 ? (point.allocatedToman / point.totalToman) * 100 : 0;
    return (
      <TooltipShell>
        <div className="font-black text-slate-900 pb-1 border-b border-slate-100">{point.name}</div>
        <TooltipRow label="سقف منابع" color={point.color}>
          <Num {...formatMoneyParts(point.totalToman)} />
        </TooltipRow>
        <TooltipRow label="تخصیص‌یافته">
          <Num {...formatMoneyParts(point.allocatedToman)} />
        </TooltipRow>
        <TooltipRow label="سهم از کل منابع">
          <Num value={formatPercent(share)} />
        </TooltipRow>
        <TooltipRow label="درصد مصرف">
          <Num value={formatPercent(consumption)} />
        </TooltipRow>
        <div className="pt-1 text-[11px] text-slate-500">
          شامل {formatNumber(point.count, true, 0)} سرفصل مالی
        </div>
      </TooltipShell>
    );
  };

  const BudgetSourceTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    const consumption = point.سقف_منبع > 0 ? (point.تخصیص_یافته / point.سقف_منبع) * 100 : 0;
    return (
      <TooltipShell>
        <div className="font-black text-slate-900 pb-1 border-b border-slate-100">{point.fullTitle}</div>
        <div className="text-[11px] text-slate-500">{point.sponsor}</div>
        <TooltipRow label="سقف منبع" color="#2563eb">
          <Num {...formatMoneyParts(point.سقف_منبع)} />
        </TooltipRow>
        <TooltipRow label="تخصیص‌یافته" color="#059669">
          <Num {...formatMoneyParts(point.تخصیص_یافته)} />
        </TooltipRow>
        <TooltipRow label="مانده قابل مصرف" color="#d97706">
          <Num {...formatMoneyParts(point.مانده)} />
        </TooltipRow>
        <TooltipRow label="درصد مصرف">
          <Num value={formatPercent(consumption)} />
        </TooltipRow>
        <div className="pt-1 text-[11px] text-slate-500">
          {point.typeFa} • وضعیت: {point.status === 'ACTIVE' ? 'فعال' : point.status === 'RESERVED' ? 'رزرو‌شده' : 'مصرف‌شده'}
        </div>
      </TooltipShell>
    );
  };

  const ProjectStatusTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
      <TooltipShell>
        <div className="font-black text-slate-900 pb-1 border-b border-slate-100">
          پروژه‌های {point.label}
        </div>
        <TooltipRow label="تعداد پروژه" color={point.color}>
          <Num value={formatNumber(point.count, true, 0)} unit="پروژه" />
        </TooltipRow>
        <TooltipRow label="ارزش ریالی">
          <Num {...formatMoneyParts(point.valueToman)} />
        </TooltipRow>
        <TooltipRow label="میانگین پیشرفت">
          <Num value={formatPercent(point.avgProgress)} />
        </TooltipRow>
      </TooltipShell>
    );
  };

  const CrisisTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
      <TooltipShell>
        <div className="font-black text-slate-900 pb-1 border-b border-slate-100">{point.title}</div>
        <div className="text-[11px] text-slate-500">
          {point.category} • {point.district}
        </div>
        <TooltipRow label="شدت بحران" color={point.color}>
          <Num value={formatPercent(point.severityScore)} />
        </TooltipRow>
        <TooltipRow label="جمعیت آسیب‌دیده">
          <Num value={formatNumber(point.affectedPopulation, true, 0)} unit="نفر" />
        </TooltipRow>
        <TooltipRow label="پروژه‌های فعال مرتبط">
          <Num value={formatNumber(point.activeProjectsCount, true, 0)} unit="پروژه" />
        </TooltipRow>
        <div className="flex items-center gap-1.5 pt-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${point.urgency === 'CRITICAL' ? 'bg-rose-50 text-rose-800 border-rose-200' : point.urgency === 'HIGH' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
            فوریت {point.urgencyLabel}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-slate-50 text-slate-700 border-slate-200">
            {point.statusFa}
          </span>
        </div>
        <div className="pt-1 text-[11px] text-slate-600 leading-relaxed">
          <span className="font-bold text-slate-700">علت اصلی: </span>
          {point.primaryCause}
        </div>
        <div className="text-[11px] text-indigo-700 leading-relaxed">
          <span className="font-bold">مداخله پیشنهادی: </span>
          {point.intervention}
        </div>
      </TooltipShell>
    );
  };

  const DepartmentTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
      <TooltipShell>
        <div className="font-black text-slate-900 pb-1 border-b border-slate-100">{point.fullName}</div>
        <div className="text-[11px] text-slate-500">
          {point.categoryFa} • {point.head}
        </div>
        <TooltipRow label="درصد جذب بودجه" color="#059669">
          <Num value={formatPercent(point.absorptionPct)} />
        </TooltipRow>
        <TooltipRow label="امتیاز عملکرد" color="#4f46e5">
          <Num value={formatPercent(point.performanceScore)} />
        </TooltipRow>
        <TooltipRow label="اعتبار تخصیص‌یافته">
          <Num {...formatMoneyParts(point.allocatedToman)} />
        </TooltipRow>
        <TooltipRow label="جذب‌شده">
          <Num {...formatMoneyParts(point.absorbedToman)} />
        </TooltipRow>
        <TooltipRow label="پروژه‌های فعال">
          <Num value={formatNumber(point.activeProjects, true, 0)} unit="پروژه" />
        </TooltipRow>
      </TooltipShell>
    );
  };

  const AlertTypeTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    const share = totalAlerts > 0 ? (point.count / totalAlerts) * 100 : 0;
    return (
      <TooltipShell>
        <div className="font-black text-slate-900 pb-1 border-b border-slate-100">{point.label}</div>
        <p className="text-[11px] text-slate-600 leading-relaxed">{point.description}</p>
        <TooltipRow label="تعداد هشدار" color={point.color}>
          <Num value={formatNumber(point.count, true, 0)} unit="مورد" />
        </TooltipRow>
        <TooltipRow label="سهم از کل هشدارها">
          <Num value={formatPercent(share)} />
        </TooltipRow>
      </TooltipShell>
    );
  };

  return (
    <section id="dashboard-charts-panel" className="space-y-5">
      {/* Section heading — mirrors the charts page title block, one level down:
          the dashboard keeps its own PageHeader, and this row introduces the
          panel and links across to the allocation-focused charts page. */}
      <div
        id="dashboard-charts-panel-heading"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div id="dashboard-charts-panel-heading-text" className="flex items-start gap-3 min-w-0">
          <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 shrink-0">
            <BarChart3 className="w-5 h-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900 leading-snug">
              تحلیل‌های تصویری داشبورد
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              تصویر کلان محدوده فعال: نیمرخ محرومیت، ترکیب و مصرف منابع مالی، سبد پروژه‌ها، نقشه بحران‌ها،
              عملکرد ادارات و هشدارهای موازی‌کاری
            </p>
          </div>
        </div>

        <button
          id="dashboard-charts-panel-heading-link-charts"
          type="button"
          onClick={() => setActiveTab('CHARTS')}
          title="رفتن به صفحه نمودارهای تخصیص بودجه"
          className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto text-xs font-bold px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <span>صفحه نمودارهای تخصیص</span>
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Deprivation radar ------------------------------------------------ */}
        <ChartCard
          id="dashboard-charts-panel-indicator-radar"
          icon={RadarIcon}
          tone="text-indigo-600"
          title="نیمرخ محرومیت محدوده فعال"
          subtitle={`هم‌زمان سنجش ${toPersianDigits(INDICATOR_AXES.length)} شاخص محلی در ${selectedLocation.county} در برابر آستانه هشدار`}
        >
          <div className="h-[clamp(300px,42vh,380px)] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={indicatorRadarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#334155' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="مقدار شاخص در محدوده فعال"
                  dataKey="محدوده_فعال"
                  stroke="#4f46e5"
                  fill="#4f46e5"
                  fillOpacity={0.3}
                />
                <Radar
                  name="آستانه هشدار مدیریتی (۵۰)"
                  dataKey="آستانه_هشدار"
                  stroke="#f43f5e"
                  fill="#f43f5e"
                  fillOpacity={0.08}
                  strokeDasharray="5 4"
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Tooltip content={<IndicatorTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div
            id="dashboard-charts-panel-indicator-radar-footer"
            className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs"
          >
            <span className="flex items-center gap-1.5 text-slate-500">
              <AlertTriangle className="w-3.5 h-3.5 text-risk" aria-hidden="true" />
              <span>
                {toPersianDigits(aboveThresholdCount)} شاخص بالای آستانه هشدار ۵۰ است
              </span>
            </span>
            {worstIndicator ? (
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="font-bold">بحرانی‌ترین شاخص:</span>
                <span className="font-black text-risk-strong">{worstIndicator.label}</span>
                <Num value={formatPercent(worstIndicator.value)} className="font-bold text-risk-strong" />
              </span>
            ) : null}
          </div>
        </ChartCard>

        {/* 2. Funding mix donut ----------------------------------------------- */}
        <ChartCard
          id="dashboard-charts-panel-source-mix"
          icon={CircleDollarSign}
          tone="text-emerald-600"
          title="ترکیب منابع تأمین مالی"
          subtitle="سهم هر خانواده منبع مالی از سقف کل اعتبارات قابل برنامه‌ریزی محدوده فعال"
        >
          {sourceTypeMix.length === 0 ? (
            <ChartEmptyState>هنوز منبع مالی برای این محدوده ثبت نشده است.</ChartEmptyState>
          ) : (
            <>
              <div className="relative h-[clamp(260px,38vh,330px)] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceTypeMix}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="totalToman"
                      nameKey="name"
                    >
                      {sourceTypeMix.map((entry) => (
                        <Cell key={`source-mix-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<SourceTypeTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut centre: the total the slices add up to. */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-slate-500">سقف کل منابع</span>
                  <Num {...formatMoneyParts(totalSourcesToman)} className="text-base font-black text-slate-900" />
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    مصرف‌شده: <Num value={formatPercent(overallConsumptionPct)} className="font-bold text-emerald-700" />
                  </span>
                </div>
              </div>

              {/* Legend as a list: name, share and the exact cap, so the donut is
                  readable without hovering. */}
              <ul id="dashboard-charts-panel-source-mix-list" className="space-y-1.5 pt-3 border-t border-slate-100">
                {sourceTypeMix.map((item) => {
                  const share = totalSourcesToman > 0 ? (item.totalToman / totalSourcesToman) * 100 : 0;
                  return (
                    <li
                      key={`source-mix-row-${item.name}`}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate text-slate-700" title={item.name}>
                          {item.name}
                        </span>
                      </span>
                      <span className="flex items-center gap-3 shrink-0">
                        <Num value={formatPercent(share)} className="font-black text-slate-800" />
                        <Num
                          {...formatMoneyParts(item.totalToman)}
                          className="font-bold text-slate-500 w-24 text-end"
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </ChartCard>

        {/* 3. Per-source drawdown --------------------------------------------- */}
        <ChartCard
          id="dashboard-charts-panel-budget-sources-drawdown"
          icon={Wallet}
          tone="text-blue-600"
          title="سقف، تخصیص و مانده هر منبع مالی"
          subtitle="مقایسه مبلغ مصوب، تخصیص‌یافته و مانده قابل مصرف به تفکیک سرفصل — واحد: همت"
          className="lg:col-span-2"
        >
          {budgetSourceRows.length === 0 ? (
            <ChartEmptyState>سرفصلی برای نمایش وجود ندارد؛ ابتدا منابع بودجه را ثبت کنید.</ChartEmptyState>
          ) : (
            <>
              <div className="h-[clamp(300px,46vh,440px)] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={budgetSourceRows}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => formatHemmat(Number(value), 0)}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={176}
                      tick={<OneLineCategoryTick maxChars={24} />}
                    />
                    <Tooltip content={<BudgetSourceTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="سقف_منبع" name="سقف منبع (همت)" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="تخصیص_یافته" name="تخصیص‌یافته (همت)" fill="#059669" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="مانده" name="مانده قابل مصرف (همت)" fill="#d97706" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div
                id="dashboard-charts-panel-budget-sources-drawdown-footer"
                className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs"
              >
                <span className="text-slate-500">
                  {formatNumber(budgetSourceRows.length, true, 0)} سرفصل مالی در محدوده فعال
                </span>
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="font-bold">نرخ مصرف کل منابع:</span>
                  <Num value={formatPercent(overallConsumptionPct)} className="font-black text-emerald-700" />
                </span>
              </div>
            </>
          )}
        </ChartCard>

        {/* 4. Project portfolio by status ------------------------------------- */}
        <ChartCard
          id="dashboard-charts-panel-project-status"
          icon={Layers}
          tone="text-indigo-600"
          title="سبد پروژه‌ها به تفکیک وضعیت"
          subtitle="ارزش ریالی و تعداد پروژه‌های محدوده فعال در هر مرحله از چرخه اجرا"
          control={
            <div
              role="group"
              aria-label="معیار نمودار وضعیت پروژه‌ها"
              className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200"
            >
              <button
                type="button"
                onClick={() => setProjectMetric('VALUE')}
                aria-pressed={projectMetric === 'VALUE'}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  projectMetric === 'VALUE' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ارزش ریالی
              </button>
              <button
                type="button"
                onClick={() => setProjectMetric('COUNT')}
                aria-pressed={projectMetric === 'COUNT'}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  projectMetric === 'COUNT' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تعداد پروژه
              </button>
            </div>
          }
        >
          {projects.length === 0 ? (
            <ChartEmptyState>پروژه‌ای ثبت نشده است؛ پس از ثبت پروژه، سبد اجرایی اینجا ترسیم می‌شود.</ChartEmptyState>
          ) : (
            <>
              <div className="h-[clamp(280px,40vh,380px)] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectStatusData} margin={{ top: 10, right: 12, left: 8, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        projectMetric === 'VALUE'
                          ? formatHemmat(Number(value), 0)
                          : toPersianDigits(Number(value))
                      }
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <Tooltip content={<ProjectStatusTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar
                      dataKey={projectMetric === 'VALUE' ? 'valueToman' : 'count'}
                      name={projectMetric === 'VALUE' ? 'ارزش پروژه‌ها (همت)' : 'تعداد پروژه'}
                      radius={[6, 6, 0, 0]}
                    >
                      {projectStatusData.map((entry) => (
                        <Cell key={`project-status-${entry.status}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div
                id="dashboard-charts-panel-project-status-footer"
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-600"
              >
                {projectStatusData.map((entry) => (
                  <span key={`project-status-legend-${entry.status}`} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: entry.color }}
                      aria-hidden="true"
                    />
                    {entry.label}
                    <Num value={formatNumber(entry.count, true, 0)} className="text-slate-500" />
                  </span>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        {/* 5. Crisis map ------------------------------------------------------ */}
        <ChartCard
          id="dashboard-charts-panel-crisis-map"
          icon={Flame}
          tone="text-rose-600"
          title="نقشه بحران‌ها: شدت در برابر جمعیت آسیب‌دیده"
          subtitle="هر حباب یک بحران ثبت‌شده است؛ قطر حباب = شمار پروژه‌های فعال مرتبط با آن"
          control={
            <div role="group" aria-label="فیلتر وضعیت بحران" className="flex flex-wrap items-center gap-1">
              {(
                [
                  { key: 'ALL', label: 'همه', count: crisisCounts.ALL },
                  { key: 'UNRESOLVED', label: 'حل‌نشده', count: crisisCounts.UNRESOLVED },
                  { key: 'UNDER_INTERVENTION', label: 'در دست مداخله', count: crisisCounts.UNDER_INTERVENTION },
                  { key: 'CONTROLLED', label: 'کنترل‌شده', count: crisisCounts.CONTROLLED },
                ] as const
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setCrisisFilter(option.key)}
                  aria-pressed={crisisFilter === option.key}
                  className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                    crisisFilter === option.key
                      ? 'bg-slate-800 text-white border-slate-700'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {option.label} ({toPersianDigits(option.count)})
                </button>
              ))}
            </div>
          }
        >
          {crisisPoints.length === 0 ? (
            <ChartEmptyState>بحرانی برای این محدوده ثبت نشده است.</ChartEmptyState>
          ) : filteredCrisisPoints.length === 0 ? (
            <ChartEmptyState>هیچ بحرانی در وضعیت انتخابی وجود ندارد؛ فیلتر را تغییر دهید.</ChartEmptyState>
          ) : (
            <>
              <div className="h-[clamp(300px,42vh,400px)] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 16, right: 24, bottom: 34, left: 14 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      dataKey="severityScore"
                      name="شدت بحران"
                      domain={[0, 100]}
                      tickFormatter={(value) => toPersianDigits(value) + '٪'}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      label={{
                        value: 'شدت بحران (شاخص ۱۰۰)',
                        position: 'bottom',
                        offset: 12,
                        fontSize: 11,
                        fill: '#475569',
                        fontWeight: 'bold',
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="affectedPopulation"
                      name="جمعیت آسیب‌دیده"
                      tickFormatter={(value) => formatNumber(Number(value), true, 0)}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      label={{
                        value: 'جمعیت آسیب‌دیده (نفر)',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 4,
                        fontSize: 11,
                        fill: '#475569',
                        fontWeight: 'bold',
                      }}
                    />
                    <ZAxis type="number" dataKey="bubbleZ" range={[140, 900]} name="پروژه‌های فعال" />
                    <Tooltip content={<CrisisTooltip />} />
                    <Scatter
                      name="بحران‌های ثبت‌شده"
                      data={filteredCrisisPoints}
                      isAnimationActive={false}
                      shape={(pointProps: any) => {
                        const { cx, cy, size, payload } = pointProps;
                        if (typeof cx !== 'number' || typeof cy !== 'number') return null;
                        const rawRadius = Math.sqrt((size || 140) / Math.PI);
                        const radius = Math.max(7, Math.min(24, Math.round(rawRadius * 1.1)));
                        return (
                          <g key={`crisis-node-${payload.id}`}>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={radius}
                              fill={payload.color}
                              fillOpacity={0.78}
                              stroke="#1e293b"
                              strokeWidth={1.4}
                            />
                            {payload.activeProjectsCount > 1 && radius >= 12 ? (
                              <text
                                x={cx}
                                y={cy + 3.5}
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize={9}
                                fontWeight="bold"
                                pointerEvents="none"
                              >
                                {toPersianDigits(payload.activeProjectsCount)}
                              </text>
                            ) : null}
                          </g>
                        );
                      }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div
                id="dashboard-charts-panel-crisis-map-footer"
                className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-[11px]"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-semibold text-slate-600">
                  {(Object.keys(URGENCY_META) as UrgencyLevel[]).map((level) => (
                    <span key={`crisis-legend-${level}`} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: URGENCY_META[level].color }}
                        aria-hidden="true"
                      />
                      فوریت {URGENCY_META[level].label}
                    </span>
                  ))}
                </div>
                <span className="text-slate-500">
                  {toPersianDigits(filteredCrisisPoints.length)} کانون در نمای فعلی
                </span>
              </div>
            </>
          )}
        </ChartCard>

        {/* 6. Department delivery --------------------------------------------- */}
        <ChartCard
          id="dashboard-charts-panel-departments"
          icon={Building2}
          tone="text-blue-600"
          title="جذب بودجه و عملکرد ادارات"
          subtitle={`درصد جذب اعتبار در کنار امتیاز عملکرد هر اداره؛ هر دو معیار روی مقیاس ۰ تا ۱۰۰ — ${toPersianDigits(DEPARTMENT_CHART_LIMIT)} اداره با بیشترین اعتبار`}
        >
          {departmentRows.length === 0 ? (
            <ChartEmptyState>اداره‌ای برای این محدوده ثبت نشده است.</ChartEmptyState>
          ) : (
            <>
              <div className="h-[clamp(300px,42vh,400px)] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={departmentChartRows}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(value) => toPersianDigits(value) + '٪'}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={158}
                      tick={<OneLineCategoryTick maxChars={20} />}
                    />
                    <Tooltip content={<DepartmentTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="absorptionPct" name="درصد جذب بودجه" fill="#059669" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="performanceScore" name="امتیاز عملکرد" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div
                id="dashboard-charts-panel-departments-footer"
                className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600"
              >
                <span className="flex items-center gap-1.5">
                  <span className="font-bold">میانگین جذب اعتبارات:</span>
                  <Num value={formatPercent(averageAbsorptionPct)} className="font-black text-emerald-700" />
                </span>
                <span className="text-slate-500">
                  میانگین بر پایه همه {formatNumber(departmentRows.length, true, 0)} اداره متولی محدوده فعال
                </span>
              </div>
            </>
          )}
        </ChartCard>

        {/* 7. Anti-duplication alerts ------------------------------------------ */}
        <ChartCard
          id="dashboard-charts-panel-anti-duplication"
          icon={ShieldAlert}
          tone="text-amber-600"
          title="هشدارهای موازی‌کاری و اتلاف منابع"
          subtitle="تفکیک هشدارهای فعال موتور پایش موازی‌کاری بر اساس نوع انحراف"
        >
          {totalAlerts === 0 ? (
            <ChartEmptyState>
              موتور پایش موازی‌کاری برای پروژه‌های فعلی هیچ انحرافی شناسایی نکرده است.
            </ChartEmptyState>
          ) : (
            <>
              <div className="relative h-[clamp(220px,32vh,280px)] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={alertMix}
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={88}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="label"
                    >
                      {alertMix.map((entry) => (
                        <Cell key={`alert-mix-${entry.type}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<AlertTypeTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-slate-500">هشدار فعال</span>
                  <Num
                    value={formatNumber(totalAlerts, true, 0)}
                    unit="مورد"
                    className="text-base font-black text-slate-900"
                  />
                </div>
              </div>

              <ul id="dashboard-charts-panel-anti-duplication-list" className="space-y-1.5 pt-3 border-t border-slate-100">
                {alertMix.map((item) => (
                  <li key={`alert-mix-row-${item.type}`} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <span className="truncate text-slate-700" title={item.description}>
                        {item.label}
                      </span>
                    </span>
                    <Num
                      value={formatNumber(item.count, true, 0)}
                      unit="مورد"
                      className="font-black text-slate-800 shrink-0"
                    />
                  </li>
                ))}
              </ul>

              <div
                id="dashboard-charts-panel-anti-duplication-footer"
                className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['CRITICAL', 'WARNING', 'INFO'] as const).map((severity) =>
                    alertSeverityCounts[severity] > 0 ? (
                      <span
                        key={`alert-severity-${severity}`}
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${ALERT_SEVERITY_META[severity].className}`}
                      >
                        {ALERT_SEVERITY_META[severity].label}: {toPersianDigits(alertSeverityCounts[severity])}
                      </span>
                    ) : null
                  )}
                </div>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="font-bold">منابع نجات‌یافته از اتلاف:</span>
                  {preventedWasteToman > 0 ? (
                    <Num
                      {...formatMoneyParts(preventedWasteToman)}
                      className="font-black text-emerald-700"
                      title={formatMoney(preventedWasteToman)}
                    />
                  ) : (
                    <span className="text-slate-500 font-bold">هنوز محاسبه نشده</span>
                  )}
                </span>
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* Closing strip — ties the visual panel back to the live allocation state
          and offers the two next steps (allocation page, project register). */}
      <div
        id="dashboard-charts-panel-closing-strip"
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-slate-200"
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 shrink-0">
            <Activity className="w-4 h-4" aria-hidden="true" />
          </span>
          <p className="text-xs text-slate-600 leading-relaxed min-w-0">
            <span className="font-black text-slate-800">جمع‌بندی داشبورد: </span>
            {worstIndicator ? (
              <>
                بحرانی‌ترین شاخص محلی «{worstIndicator.label}» با{' '}
                <Num value={formatPercent(worstIndicator.value)} className="font-bold text-risk-strong" /> است
              </>
            ) : null}
            {topPriority ? (
              <>
                {' '}و بیشترین سهم بودجه به «{topPriority.title}» با{' '}
                <Num value={formatPercent(topPriority.pct)} className="font-bold text-indigo-700" /> تعلق دارد
              </>
            ) : null}
            ؛ {toPersianDigits(aboveThresholdCount)} شاخص بالای آستانه هشدار و{' '}
            {toPersianDigits(totalAlerts)} هشدار موازی‌کاری در محدوده فعال {selectedLocation.county} در جریان است.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('CHARTS')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <PieIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>تحلیل تخصیص بودجه</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PROJECTS')}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <span>رصد پروژه‌ها</span>
          </button>
        </div>
      </div>
    </section>
  );
};
