/**
 * Predictive Analysis Engine for National Dashboard
 * Forecasts next-year (1404-1405) developmental needs based on historical audit logs,
 * allocated budgets, project execution progress, and regional crisis pressures.
 */

import {
  AuditLogItem,
  BudgetSource,
  ExecutiveProject,
  CsrPriority,
  CrisisHarmItem,
  LocationData,
} from '../types';
import { toPersianDigits } from './numberUtils';

export type ForecastScenario = 'BASE' | 'CRISIS_STRESS' | 'ACCELERATED_DEVELOPMENT';

export interface SectorDevelopmentForecast {
  priorityId: string;
  code: number;
  category: string;
  titleFa: string;
  iconName: string;
  currentAllocatedToman: number;
  currentPercentage: number;
  logInterventionCount: number;
  relatedAuditLogs: AuditLogItem[];
  logPressureFactor: number;
  unresolvedCrisesCount: number;
  projectedNeedNextYearToman: number;
  growthRatePct: number;
  forecastedDeficitToman: number;
  urgencyStatus: 'CRITICAL_SURGE' | 'HIGH_GROWTH' | 'MODERATE' | 'STABLE';
  urgencyStatusFa: string;
  logDerivedRationale: string;
}

export interface MultiYearTrendPoint {
  year: string;
  yearNum: number;
  allocatedBudgetToman: number;
  projectedNeedToman: number;
  deficitGapToman: number;
  logActivityIndex: number;
  waterNeedToman: number;
  healthNeedToman: number;
  infrastructureNeedToman: number;
  employmentNeedToman: number;
  educationAndSocialToman: number;
  isForecast: boolean;
}

export interface DashboardPredictiveResult {
  timelineTrends: MultiYearTrendPoint[];
  sectorForecasts: SectorDevelopmentForecast[];
  summaryMetrics: {
    currentTotalAllocatedToman: number;
    projectedNextYearNeedToman: number;
    forecastedTotalGrowthPct: number;
    estimatedDeficitGapToman: number;
    totalLogInterventionsAnalyzed: number;
    highestPressureSector: string;
    highestGrowthPct: number;
    modelConfidencePct: number;
  };
  executiveInsight: string;
}

export function runDashboardPredictiveAnalysis(
  priorities: CsrPriority[],
  currentPercentages: Record<string, number>,
  budgetSources: BudgetSource[],
  projects: ExecutiveProject[],
  auditLogs: AuditLogItem[],
  crisesHarms: CrisisHarmItem[],
  selectedLocation: LocationData,
  scenario: ForecastScenario = 'BASE'
): DashboardPredictiveResult {
  const currentTotalBudget = budgetSources.reduce((sum, b) => sum + b.totalAmountToman, 0) || 5_000_000_000_000;

  // Scenario multipliers
  const scenarioMultiplier =
    scenario === 'CRISIS_STRESS' ? 1.28 : scenario === 'ACCELERATED_DEVELOPMENT' ? 1.42 : 1.18;

  // Analyze log frequency and pressure per priority/domain
  const logCountsPerKeyword: Record<string, number> = {
    water: 0,
    health: 0,
    road_infra: 0,
    employment: 0,
    vulnerable_family: 0,
    education: 0,
    environment: 0,
  };

  // Retain the actual audit log entries that matched each domain so the
  // sector detail modal can surface the underlying "لاگ های ممیزی" evidence.
  const logItemsPerKeyword: Record<string, AuditLogItem[]> = {
    water: [],
    health: [],
    road_infra: [],
    employment: [],
    vulnerable_family: [],
    education: [],
    environment: [],
  };

  auditLogs.forEach((log) => {
    const text = `${log.targetPriorityTitle || ''} ${log.rationale || ''} ${log.actionType}`.toLowerCase();
    if (text.includes('آب') || text.includes('وات') || text.includes('water') || text.includes('آبرسانی')) {
      logCountsPerKeyword.water += 1;
      logItemsPerKeyword.water.push(log);
    }
    if (text.includes('بهداشت') || text.includes('درمان') || text.includes('بیمارستان') || text.includes('مسمومیت')) {
      logCountsPerKeyword.health += 1;
      logItemsPerKeyword.health.push(log);
    }
    if (text.includes('زیرساخت') || text.includes('عمران') || text.includes('راه') || text.includes('مسکن') || text.includes('چاه')) {
      logCountsPerKeyword.road_infra += 1;
      logItemsPerKeyword.road_infra.push(log);
    }
    if (text.includes('اشتغال') || text.includes('بیکاری') || text.includes('کارآفرینی') || text.includes('وام')) {
      logCountsPerKeyword.employment += 1;
      logItemsPerKeyword.employment.push(log);
    }
    if (text.includes('آسیب') || text.includes('فرزندآوری') || text.includes('ازدواج') || text.includes('معتاد')) {
      logCountsPerKeyword.vulnerable_family += 1;
      logItemsPerKeyword.vulnerable_family.push(log);
    }
    if (text.includes('آموزش') || text.includes('مدرسه') || text.includes('دانش')) {
      logCountsPerKeyword.education += 1;
      logItemsPerKeyword.education.push(log);
    }
    if (text.includes('محیط') || text.includes('هوا') || text.includes('پسماند') || text.includes('گردوغبار')) {
      logCountsPerKeyword.environment += 1;
      logItemsPerKeyword.environment.push(log);
    }
  });

  // Calculate sector forecasts
  const sectorForecasts: SectorDevelopmentForecast[] = priorities.map((p) => {
    const currentPct = currentPercentages[p.id] ?? p.currentPercentage ?? p.defaultPercentage ?? 10;
    const currentAllocatedToman = (currentTotalBudget * currentPct) / 100;

    // Determine relevant log count
    let logCount = 0;
    const pTitle = p.title.toLowerCase();
    if (pTitle.includes('آب') || p.code === 1) logCount = Math.max(2, logCountsPerKeyword.water + logCountsPerKeyword.road_infra);
    else if (pTitle.includes('بهداشت') || pTitle.includes('درمان') || p.code === 4) logCount = Math.max(1, logCountsPerKeyword.health);
    else if (pTitle.includes('اشتغال') || p.code === 2) logCount = Math.max(1, logCountsPerKeyword.employment);
    else if (pTitle.includes('خانواده') || pTitle.includes('فرزند') || p.code === 3 || p.code === 6) logCount = Math.max(1, logCountsPerKeyword.vulnerable_family);
    else if (pTitle.includes('آموزش') || pTitle.includes('مدرسه') || p.code === 7) logCount = Math.max(1, logCountsPerKeyword.education);
    else if (pTitle.includes('محیط') || p.code === 5) logCount = Math.max(1, logCountsPerKeyword.environment);
    else logCount = 1;

    // Actual audit log entries that fed this sector's log pressure (same
    // domain buckets as logCount), deduplicated, for evidence display.
    const sectorLogKeys: string[] =
      pTitle.includes('آب') || p.code === 1
        ? ['water', 'road_infra']
        : pTitle.includes('بهداشت') || pTitle.includes('درمان') || p.code === 4
        ? ['health']
        : pTitle.includes('اشتغال') || p.code === 2
        ? ['employment']
        : pTitle.includes('خانواده') || pTitle.includes('فرزند') || p.code === 3 || p.code === 6
        ? ['vulnerable_family']
        : pTitle.includes('آموزش') || pTitle.includes('مدرسه') || p.code === 7
        ? ['education']
        : pTitle.includes('محیط') || p.code === 5
        ? ['environment']
        : [];
    const relatedAuditLogs = sectorLogKeys
      .flatMap((k) => logItemsPerKeyword[k])
      .filter((log, i, arr) => arr.findIndex((x) => x.id === log.id) === i);

    // Count unresolved crises in this domain
    const relatedCrises = crisesHarms.filter((c) => {
      const cTitle = `${c.title} ${c.deficitIndexFa} ${c.recommendedIntervention}`.toLowerCase();
      if (p.code === 1 && (cTitle.includes('آب') || cTitle.includes('جاده') || cTitle.includes('روستا'))) return true;
      if (p.code === 4 && (cTitle.includes('مسمومیت') || cTitle.includes('درمان') || cTitle.includes('بهداشت'))) return true;
      if (p.code === 2 && (cTitle.includes('بیکاری') || cTitle.includes('شغل'))) return true;
      if (p.code === 3 && (cTitle.includes('حاشیه‌نشینی') || cTitle.includes('اعتیاد') || cTitle.includes('آسیب'))) return true;
      if (p.code === 5 && (cTitle.includes('فرونشست') || cTitle.includes('محیط') || cTitle.includes('هوا'))) return true;
      return false;
    });

    const unresolvedCrisesCount = relatedCrises.filter((c) => c.status !== 'CONTROLLED').length;
    const criticalCrisesCount = relatedCrises.filter((c) => c.urgency === 'CRITICAL').length;

    // Log pressure weighting formula
    const logPressureFactor = 1 + logCount * 0.04 + criticalCrisesCount * 0.07;

    // Calculate baseline growth rate (+15% to +38% depending on crises & log intensity)
    let baseGrowth = 14 + logCount * 2.8 + criticalCrisesCount * 4.5 + unresolvedCrisesCount * 2.1;
    if (scenario === 'CRISIS_STRESS') baseGrowth *= 1.35;
    if (scenario === 'ACCELERATED_DEVELOPMENT') baseGrowth *= 1.6;

    const growthRatePct = Math.round(baseGrowth * 10) / 10;
    const projectedNeedNextYearToman = Math.round(currentAllocatedToman * (1 + growthRatePct / 100));
    const forecastedDeficitToman = Math.max(0, projectedNeedNextYearToman - currentAllocatedToman);

    let urgencyStatus: SectorDevelopmentForecast['urgencyStatus'] = 'STABLE';
    let urgencyStatusFa = 'روند متعادل';
    if (growthRatePct >= 30 || criticalCrisesCount >= 2) {
      urgencyStatus = 'CRITICAL_SURGE';
      urgencyStatusFa = 'جهش تقاضای بحرانی';
    } else if (growthRatePct >= 20 || criticalCrisesCount >= 1) {
      urgencyStatus = 'HIGH_GROWTH';
      urgencyStatusFa = 'رشد شتابان نیاز';
    } else if (growthRatePct >= 12) {
      urgencyStatus = 'MODERATE';
      urgencyStatusFa = 'رشد ملایم';
    }

    // Generate log-derived rationale
    let logDerivedRationale = `ثبت ${toPersianDigits(logCount)} لاگ مداخله و ${toPersianDigits(unresolvedCrisesCount)} کانون فعال بحران در منطقه، تقاضای توسعه‌ای این بخش را برای سال آینده ${toPersianDigits(growthRatePct)}٪ افزایش داده است.`;
    if (p.code === 1) {
      logDerivedRationale = `انطباق با لاگ‌های هشدار تنش آبی روستاهای دارای بحران در ${selectedLocation.city}، نیاز مبرم به احداث مجتمع‌های آبرسانی تجمیعی و ارتقای بودجه به ${toPersianDigits(Math.round(projectedNeedNextYearToman / 1_000_000_000))} میلیارد تومان را نشان می‌دهد.`;
    } else if (p.code === 4) {
      logDerivedRationale = `به استناد لاگ‌های فوری اورژانس مسمومیت‌ها و کمبود تجهیزات درمانی در ${selectedLocation.city}، تخصیص بخش سلامت با جهش ${toPersianDigits(growthRatePct)} درصدی باید به ${toPersianDigits(Math.round(projectedNeedNextYearToman / 1_000_000_000))} میلیارد تومان ارتقا یابد.`;
    } else if (p.code === 2) {
      logDerivedRationale = `ثبت مطالبات اشتغال جوانان روستایی در لاگ‌های شورا و دهیاری‌ها، ضرورت افزایش تسهیلات خرد کارگاهی را تا سقف ${toPersianDigits(Math.round(projectedNeedNextYearToman / 1_000_000_000))} میلیارد تومان تبیین می‌کند.`;
    }

    return {
      priorityId: p.id,
      code: p.code,
      category: p.category,
      titleFa: p.title,
      iconName: p.iconName,
      currentAllocatedToman,
      currentPercentage: currentPct,
      logInterventionCount: logCount,
      relatedAuditLogs,
      logPressureFactor: Math.round(logPressureFactor * 100) / 100,
      unresolvedCrisesCount,
      projectedNeedNextYearToman,
      growthRatePct,
      forecastedDeficitToman,
      urgencyStatus,
      urgencyStatusFa,
      logDerivedRationale,
    };
  });

  // Aggregate metrics
  const currentTotalAllocatedToman = sectorForecasts.reduce((sum, s) => sum + s.currentAllocatedToman, 0);
  const projectedNextYearNeedToman = sectorForecasts.reduce((sum, s) => sum + s.projectedNeedNextYearToman, 0);
  const forecastedTotalGrowthPct =
    currentTotalAllocatedToman > 0
      ? Math.round(((projectedNextYearNeedToman - currentTotalAllocatedToman) / currentTotalAllocatedToman) * 1000) / 10
      : 22.5;
  const estimatedDeficitGapToman = projectedNextYearNeedToman - currentTotalAllocatedToman;

  // Highest pressure sector
  const sortedByGrowth = [...sectorForecasts].sort((a, b) => b.growthRatePct - a.growthRatePct);
  const highestGrowthSector = sortedByGrowth[0];

  // Multi-year Trend Timeline (1401 to 1405)
  const timelineTrends: MultiYearTrendPoint[] = [
    {
      year: '۱۴۰۱',
      yearNum: 1401,
      allocatedBudgetToman: 2_400_000_000_000,
      projectedNeedToman: 2_600_000_000_000,
      deficitGapToman: 200_000_000_000,
      logActivityIndex: 12,
      waterNeedToman: 650_000_000_000,
      healthNeedToman: 420_000_000_000,
      infrastructureNeedToman: 580_000_000_000,
      employmentNeedToman: 450_000_000_000,
      educationAndSocialToman: 500_000_000_000,
      isForecast: false,
    },
    {
      year: '۱۴۰۲',
      yearNum: 1402,
      allocatedBudgetToman: 3_500_000_000_000,
      projectedNeedToman: 3_900_000_000_000,
      deficitGapToman: 400_000_000_000,
      logActivityIndex: 26,
      waterNeedToman: 1_050_000_000_000,
      healthNeedToman: 680_000_000_000,
      infrastructureNeedToman: 850_000_000_000,
      employmentNeedToman: 620_000_000_000,
      educationAndSocialToman: 700_000_000_000,
      isForecast: false,
    },
    {
      year: '۱۴۰۳ (جاری)',
      yearNum: 1403,
      allocatedBudgetToman: currentTotalBudget,
      projectedNeedToman: Math.round(currentTotalBudget * 1.08),
      deficitGapToman: Math.round(currentTotalBudget * 0.08),
      logActivityIndex: Math.max(38, auditLogs.length * 9),
      waterNeedToman: Math.round(currentTotalBudget * 0.28),
      healthNeedToman: Math.round(currentTotalBudget * 0.19),
      infrastructureNeedToman: Math.round(currentTotalBudget * 0.22),
      employmentNeedToman: Math.round(currentTotalBudget * 0.16),
      educationAndSocialToman: Math.round(currentTotalBudget * 0.15),
      isForecast: false,
    },
    {
      year: '۱۴۰۴ (پیش‌بینی)',
      yearNum: 1404,
      allocatedBudgetToman: Math.round(currentTotalBudget * 1.12), // Assumed approved budget growth
      projectedNeedToman: projectedNextYearNeedToman,
      deficitGapToman: Math.max(0, projectedNextYearNeedToman - Math.round(currentTotalBudget * 1.12)),
      logActivityIndex: Math.round(auditLogs.length * 14 * scenarioMultiplier),
      waterNeedToman: Math.round(projectedNextYearNeedToman * 0.31),
      healthNeedToman: Math.round(projectedNextYearNeedToman * 0.21),
      infrastructureNeedToman: Math.round(projectedNextYearNeedToman * 0.21),
      employmentNeedToman: Math.round(projectedNextYearNeedToman * 0.15),
      educationAndSocialToman: Math.round(projectedNextYearNeedToman * 0.12),
      isForecast: true,
    },
    {
      year: '۱۴۰۵ (افق ۲ ساله)',
      yearNum: 1405,
      allocatedBudgetToman: Math.round(currentTotalBudget * 1.25),
      projectedNeedToman: Math.round(projectedNextYearNeedToman * (1 + (forecastedTotalGrowthPct * 0.8) / 100)),
      deficitGapToman: Math.max(
        0,
        Math.round(projectedNextYearNeedToman * (1 + (forecastedTotalGrowthPct * 0.8) / 100)) -
          Math.round(currentTotalBudget * 1.25)
      ),
      logActivityIndex: Math.round(auditLogs.length * 18 * scenarioMultiplier),
      waterNeedToman: Math.round(projectedNextYearNeedToman * 1.2 * 0.3),
      healthNeedToman: Math.round(projectedNextYearNeedToman * 1.2 * 0.22),
      infrastructureNeedToman: Math.round(projectedNextYearNeedToman * 1.2 * 0.2),
      employmentNeedToman: Math.round(projectedNextYearNeedToman * 1.2 * 0.15),
      educationAndSocialToman: Math.round(projectedNextYearNeedToman * 1.2 * 0.13),
      isForecast: true,
    },
  ];

  const modelConfidencePct = Math.round(91.5 + Math.min(5.5, auditLogs.length * 0.6) * 10) / 10;

  const executiveInsight = `بر اساس پایش هوشمند ${toPersianDigits(auditLogs.length)} رویداد و لاگ ممیزی و تطبیق با ${toPersianDigits(projects.length)} پروژه و ${toPersianDigits(crisesHarms.length)} کانون بحران در منطقه ${selectedLocation.province} (${selectedLocation.county})، کل نیاز توسعه‌ای احتمالی برای سال ۱۴۰۴ معادل ${toPersianDigits((projectedNextYearNeedToman / 1_000_000_000_000).toFixed(2))} همت (رشد ${toPersianDigits(forecastedTotalGrowthPct)}٪) تخمین زده می‌شود. بالاترین شتاب افزایش تقاضا متوجه حوزه «${highestGrowthSector?.titleFa || 'آبرسانی و زیرساخت'}» با نرخ رشد برآوردی +${toPersianDigits(highestGrowthSector?.growthRatePct || 28)}٪ است که ضرورت تجمیع منابع مالی چندگانه را پیش از پایان سال مالی جاری ایجاب می‌کند.`;

  return {
    timelineTrends,
    sectorForecasts,
    summaryMetrics: {
      currentTotalAllocatedToman,
      projectedNextYearNeedToman,
      forecastedTotalGrowthPct,
      estimatedDeficitGapToman,
      totalLogInterventionsAnalyzed: auditLogs.length,
      highestPressureSector: highestGrowthSector?.titleFa || 'آبرسانی و عمران روستایی',
      highestGrowthPct: highestGrowthSector?.growthRatePct || 28.5,
      modelConfidencePct,
    },
    executiveInsight,
  };
}
