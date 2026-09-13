/**
 * Predictive Forecast Engine for CSR Local Allocation
 * Calculates 1-Year Projected Indicator Improvements based on Budget Allocations
 */

import { LocalIndicators, CsrPriority } from '../types';

export interface IndicatorForecastItem {
  key: keyof LocalIndicators;
  titleFa: string;
  unit: 'PERCENT' | 'SCORE_100' | 'POPULATION';
  currentValue: number;
  predictedValueNextYear: number;
  changeDelta: number; // e.g. -4.5
  improvementPercentage: number; // e.g. +15.8%
  impactBudgetToman: number;
  beneficiariesCount: number;
  impactLevel: 'EXCELLENT' | 'HIGH' | 'MODERATE' | 'LOW';
  explanation: string;
}

export interface PredictionResult {
  forecasts: IndicatorForecastItem[];
  overallRegionalImprovementPct: number;
  totalBeneficiariesProjected: number;
  jobsCreatedProjected: number;
  roiSocialRatio: number; // e.g. 3.4x Social ROI
  topImpactAreas: string[];
  executiveForecastNarrative: string;
}

export function calculatePredictiveForecast(
  indicators: LocalIndicators,
  priorities: CsrPriority[],
  percentages: Record<string, number>,
  totalBudgetToman: number,
  population: number = 320000,
  budgetMultiplier: number = 1.0
): PredictionResult {
  const adjustedTotalBudget = totalBudgetToman * budgetMultiplier;

  // Indicator metadata definition
  const indicatorMeta: Array<{
    key: keyof LocalIndicators;
    titleFa: string;
    unit: 'PERCENT' | 'SCORE_100' | 'POPULATION';
    sensitivityBaselineToman: number; // Toman budget needed per capita to reduce deficit by 50%
    priorityCodes: number[]; // Related priority codes
    efficacyFactor: number;
  }> = [
    {
      key: 'povertyRate',
      titleFa: 'نرخ فقر و معیشت خانوارها',
      unit: 'PERCENT',
      sensitivityBaselineToman: 4_500_000, // Toman per person
      priorityCodes: [2, 3, 1, 7],
      efficacyFactor: 0.38,
    },
    {
      key: 'unemploymentRate',
      titleFa: 'نرخ بیکاری بومیان',
      unit: 'PERCENT',
      sensitivityBaselineToman: 3_800_000,
      priorityCodes: [2, 7, 10],
      efficacyFactor: 0.42,
    },
    {
      key: 'infrastructureDeficit',
      titleFa: 'کاستی زیرساخت‌های عمرانی و شهری',
      unit: 'SCORE_100',
      sensitivityBaselineToman: 5_200_000,
      priorityCodes: [1, 5, 9],
      efficacyFactor: 0.45,
    },
    {
      key: 'socialHarmsIndex',
      titleFa: 'شاخص آسیب‌های اجتماعی و اعتیاد',
      unit: 'SCORE_100',
      sensitivityBaselineToman: 2_900_000,
      priorityCodes: [3, 4, 6, 10],
      efficacyFactor: 0.35,
    },
    {
      key: 'healthAccessDeficit',
      titleFa: 'محرومیت خدمات بهداشتی و درمانی',
      unit: 'SCORE_100',
      sensitivityBaselineToman: 3_200_000,
      priorityCodes: [4, 1, 9],
      efficacyFactor: 0.40,
    },
    {
      key: 'educationDropOutRate',
      titleFa: 'نرخ ترک تحصیل و فقر آموزشی',
      unit: 'PERCENT',
      sensitivityBaselineToman: 2_200_000,
      priorityCodes: [7, 3, 6],
      efficacyFactor: 0.44,
    },
    {
      key: 'environmentalRiskScore',
      titleFa: 'مخاطرات زیست‌محیطی و آلودگی صنعتی',
      unit: 'SCORE_100',
      sensitivityBaselineToman: 4_800_000,
      priorityCodes: [5, 1, 9],
      efficacyFactor: 0.36,
    },
    {
      key: 'marginalizationRate',
      titleFa: 'حاشیه‌نشینی و بافت‌های ناکارآمد',
      unit: 'PERCENT',
      sensitivityBaselineToman: 4_000_000,
      priorityCodes: [10, 1, 3],
      efficacyFactor: 0.32,
    },
    {
      key: 'culturalDeficitScore',
      titleFa: 'کمبود امکانات فرهنگی و ورزشی',
      unit: 'SCORE_100',
      sensitivityBaselineToman: 1_800_000,
      priorityCodes: [6, 7],
      efficacyFactor: 0.48,
    },
    {
      key: 'crisisVulnerabilityScore',
      titleFa: 'آسیب‌پذیری در برابر بحران و حوادث',
      unit: 'SCORE_100',
      sensitivityBaselineToman: 3_000_000,
      priorityCodes: [9, 1, 5],
      efficacyFactor: 0.39,
    },
    {
      key: 'vulnerableGroupsPopulation',
      titleFa: 'جمعیت مددجویان نیازمند حمایت',
      unit: 'POPULATION',
      sensitivityBaselineToman: 2_500_000,
      priorityCodes: [3, 2, 4],
      efficacyFactor: 0.30,
    },
  ];

  const forecasts: IndicatorForecastItem[] = [];
  let totalImprovementSum = 0;
  let totalBeneficiaries = 0;

  // Calculate budget for job creation specifically (Priority 2: Employment & Priority 7: Training)
  const p2 = priorities.find((p) => p.code === 2);
  const p7 = priorities.find((p) => p.code === 7);
  const employmentBudget = adjustedTotalBudget * (((p2 ? percentages[p2.id] || 0 : 0) + (p7 ? percentages[p7.id] || 0 : 0)) / 100);
  const jobsCreatedProjected = Math.round(employmentBudget / 420_000_000); // approx 420M Toman per sustainable job created

  indicatorMeta.forEach((meta) => {
    const currentValue = indicators[meta.key] ?? 50;

    // Calculate budget allocated to related priorities
    let impactBudget = 0;
    meta.priorityCodes.forEach((code) => {
      const p = priorities.find((pri) => pri.code === code);
      if (p) {
        const pct = percentages[p.id] || 0;
        impactBudget += (adjustedTotalBudget * pct) / 100;
      }
    });

    // Diminishing returns curve calculation
    const budgetPerCapita = impactBudget / Math.max(10000, population);
    const intensityRatio = budgetPerCapita / meta.sensitivityBaselineToman;
    
    // Saturation curve: 1 - exp(-0.85 * intensityRatio)
    const rawImprovementRatio = (1 - Math.exp(-0.85 * intensityRatio)) * meta.efficacyFactor;

    // Projected Change
    let changeDelta = currentValue * rawImprovementRatio;
    
    // Safety cap
    changeDelta = Math.min(changeDelta, currentValue * 0.45); // Max 45% reduction per year

    let predictedValueNextYear = currentValue - changeDelta;
    if (meta.unit === 'POPULATION') {
      predictedValueNextYear = Math.max(0, Math.round(currentValue - changeDelta));
    } else {
      predictedValueNextYear = Math.max(0, Math.round((currentValue - changeDelta) * 10) / 10);
    }

    const improvementPercentage = currentValue > 0 ? (changeDelta / currentValue) * 100 : 0;
    totalImprovementSum += improvementPercentage;

    // Beneficiaries
    const itemBeneficiaries = Math.round((impactBudget / adjustedTotalBudget) * (population * 0.45));
    totalBeneficiaries += itemBeneficiaries;

    // Impact level
    let impactLevel: IndicatorForecastItem['impactLevel'] = 'LOW';
    if (improvementPercentage >= 20) impactLevel = 'EXCELLENT';
    else if (improvementPercentage >= 12) impactLevel = 'HIGH';
    else if (improvementPercentage >= 6) impactLevel = 'MODERATE';

    // Narrative rationale per indicator
    let explanation = `تخصیص budget قابل توجه موجب تخمین بهبود ${improvementPercentage.toFixed(1)}٪ در این شاخص طی ۱۲ ماه آینده می‌شود.`;
    if (meta.key === 'povertyRate') {
      explanation = `سرمایه‌گذاری روی معیشت و وام‌های خرد، تخمین خروج مستقیم ${Math.round(changeDelta * 120)} خانوار از خط فقر مطلق را نشان می‌دهد.`;
    } else if (meta.key === 'unemploymentRate') {
      explanation = `بر برنامه‌های بومی‌گزینی و مهارت‌آموزی، نرخ بیکاری را از ${currentValue}٪ به ${predictedValueNextYear}٪ کاهش خواهد داد.`;
    } else if (meta.key === 'infrastructureDeficit') {
      explanation = `تکمیل پروژه‌های آبرسانی، بهسازی معابر و مدارس، کمبود زیرساخت را ${changeDelta.toFixed(1)} واحد ارتقا می‌دهد.`;
    }

    forecasts.push({
      key: meta.key,
      titleFa: meta.titleFa,
      unit: meta.unit,
      currentValue,
      predictedValueNextYear,
      changeDelta: Math.round(changeDelta * 10) / 10,
      improvementPercentage: Math.round(improvementPercentage * 10) / 10,
      impactBudgetToman: impactBudget,
      beneficiariesCount: itemBeneficiaries,
      impactLevel,
      explanation,
    });
  });

  const overallRegionalImprovementPct = Math.round((totalImprovementSum / indicatorMeta.length) * 10) / 10;
  
  // Calculate Social ROI ratio (e.g. Total monetized social value created / Total Budget)
  const totalSocialValueCreated = adjustedTotalBudget * (1.8 + (overallRegionalImprovementPct / 10));
  const roiSocialRatio = Math.round((totalSocialValueCreated / adjustedTotalBudget) * 10) / 10;

  // Top impact areas sorted
  const sortedByImprovement = [...forecasts].sort((a, b) => b.improvementPercentage - a.improvementPercentage);
  const topImpactAreas = sortedByImprovement.slice(0, 3).map((f) => f.titleFa);

  const top1 = sortedByImprovement[0];
  const top2 = sortedByImprovement[1];

  const executiveForecastNarrative = `بر اساس مدل پیش‌بینی الگوریتمی سال ۱۴۰۴، اجرای تخصیص فعلی بودجه (معادل ${Math.round(adjustedTotalBudget / 10_000_000_000) / 100} همت) منجر به بهبود میانگین ${overallRegionalImprovementPct} درصدی کل شاخص‌های توسعه محلی منطقه خواهد شد. بیشترین اثرگذاری مثبت متمرکز بر «${top1?.titleFa}» (با ${top1?.improvementPercentage}٪ بهبود) و «${top2?.titleFa}» (با ${top2?.improvementPercentage}٪ بهبود) پیش‌بینی گردیده و حدود ${jobsCreatedProjected.toLocaleString('fa-IR')} شغل پایدار بومی ایجاد خواهد شد.`;

  return {
    forecasts,
    overallRegionalImprovementPct,
    totalBeneficiariesProjected: Math.min(population, Math.round(totalBeneficiaries / 2.2)),
    jobsCreatedProjected,
    roiSocialRatio,
    topImpactAreas,
    executiveForecastNarrative,
  };
}
