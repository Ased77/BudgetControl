import React, { useState, useMemo } from 'react';
import { CsrPriority, LocalIndicators, LocationData, OrganizationConfig } from '../types';
import { calculatePredictiveForecast } from '../utils/predictiveEngine';
import { toPersianDigits, formatCurrency, formatLargeBudgetPersian } from '../utils/numberUtils';
import {
  TrendingUp,
  Sparkles,
  Target,
  Users,
  Briefcase,
  Sliders,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  HelpCircle,
  BarChart3,
  RefreshCw,
  Zap,
  ShieldAlert,
  Building,
  HeartPulse,
  Award
} from 'lucide-react';

interface PredictiveModelViewProps {
  indicators: LocalIndicators;
  priorities: CsrPriority[];
  currentPercentages: Record<string, number>;
  orgConfig: OrganizationConfig;
  selectedLocation: LocationData;
}

export const PredictiveModelView: React.FC<PredictiveModelViewProps> = ({
  indicators,
  priorities,
  currentPercentages,
  orgConfig,
  selectedLocation,
}) => {
  // Budget multiplier state for "What-if" scenario testing
  const [budgetMultiplier, setBudgetMultiplier] = useState<number>(1.0);
  const [activeScenario, setActiveScenario] = useState<'CURRENT' | 'SMART_AI' | 'HIGH_GROWTH'>('CURRENT');

  // Compute percentages based on scenario
  const effectivePercentages = useMemo(() => {
    if (activeScenario === 'CURRENT') {
      return currentPercentages;
    } else if (activeScenario === 'SMART_AI') {
      const map: Record<string, number> = {};
      priorities.forEach((p) => {
        map[p.id] = p.recommendedPercentage ?? p.defaultPercentage;
      });
      return map;
    } else {
      // HIGH_GROWTH focus on Employment, Infrastructure, Vulnerable
      const map: Record<string, number> = {};
      priorities.forEach((p) => {
        if (p.code === 1) map[p.id] = 20; // Infrastructure
        else if (p.code === 2) map[p.id] = 20; // Employment
        else if (p.code === 3) map[p.id] = 15; // Vulnerable
        else map[p.id] = 5;
      });
      return map;
    }
  }, [activeScenario, currentPercentages, priorities]);

  // Calculate prediction results
  const predictionResult = useMemo(() => {
    return calculatePredictiveForecast(
      indicators,
      priorities,
      effectivePercentages,
      orgConfig.totalBudget,
      selectedLocation.population || 320000,
      budgetMultiplier
    );
  }, [indicators, priorities, effectivePercentages, orgConfig.totalBudget, selectedLocation, budgetMultiplier]);

  const simulatedTotalBudgetToman = orgConfig.totalBudget * budgetMultiplier;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Scenario Controller (Light Theme) */}
      <div className="bg-gradient-to-r from-indigo-50/90 via-slate-50 to-blue-50/80 text-slate-900 rounded-2xl p-6 shadow-2xs border border-indigo-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              مدل الگوریتمی پیش‌بینی اثرات سرمایه‌گذاری CSR
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              تخمین بهبود شاخص‌های محلی سال آینده ({selectedLocation.province} - {selectedLocation.county})
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              این مدل بر اساس مبالغ تخصیص‌یافته به هر اولویت مسئولیت اجتماعی، نرخ بازدهی اجتماعی (Social ROI)، منحنی‌های اشباع محلی و سرانه جمعیت {selectedLocation.district}، وضعیت شاخص‌های آسیب‌پذیری و محرومیت را برای سال ۱۴۰۴ پیش‌بینی می‌کند.
            </p>
          </div>

          {/* Scenario Buttons */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs shrink-0 space-y-2">
            <span className="text-[11px] text-slate-600 block font-bold text-center">سناریوی پیش‌بینی بودجه:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setActiveScenario('CURRENT'); setBudgetMultiplier(1.0); }}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeScenario === 'CURRENT' && budgetMultiplier === 1.0
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                تخصیص فعلی (۱۰۰٪)
              </button>
              <button
                onClick={() => { setActiveScenario('SMART_AI'); setBudgetMultiplier(1.0); }}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeScenario === 'SMART_AI'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                پیشنهاد هوشمند AI
              </button>
              <button
                onClick={() => { setActiveScenario('HIGH_GROWTH'); setBudgetMultiplier(1.3); }}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeScenario === 'HIGH_GROWTH'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                رشد ۳۰٪ بودجه
              </button>
            </div>
          </div>
        </div>

        {/* Budget Multiplier Interactive Range Slider */}
        <div className="mt-6 pt-5 border-t border-indigo-200/60 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-800">شبیه‌ساز ضریب بودجه (تست چه-می‌شود اگر؟):</span>
              <div className="text-[11px] text-slate-500">
                بودجه کل شبیه‌سازی‌شده: <strong className="text-indigo-700 font-bold">{formatLargeBudgetPersian(simulatedTotalBudgetToman)}</strong>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 flex items-center gap-4">
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={budgetMultiplier}
              onChange={(e) => setBudgetMultiplier(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-extrabold px-3 py-1.5 rounded-lg shrink-0 font-mono">
              {toPersianDigits(Math.round(budgetMultiplier * 100))}٪ (ضریب {toPersianDigits(budgetMultiplier)}x)
            </span>
          </div>
        </div>
      </div>

      {/* KPI Prediction Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">نرخ بهبود کلی منطقه</span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              +{toPersianDigits(predictionResult.overallRegionalImprovementPct)}٪
            </span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              ارتقای شاخص‌ها
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            میانگین کاهش محرومیت و فقر در سال ۱۴۰۴
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">بازدهی سرمایه‌گذاری اجتماعی (Social ROI)</span>
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {toPersianDigits(predictionResult.roiSocialRatio)}x
            </span>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              خلق ارزش اجتماعی
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {toPersianDigits(predictionResult.roiSocialRatio)} برابر هزینه اولیه ارزش‌افزوده رفاهی
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-purple-500"></div>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">جمعیت مستقیم ذی‌نفع</span>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {toPersianDigits(predictionResult.totalBeneficiariesProjected.toLocaleString('fa-IR'))}
            </span>
            <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
              نفر
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            حدود {toPersianDigits(Math.round((predictionResult.totalBeneficiariesProjected / (selectedLocation.population || 320000)) * 100))}٪ کل جمعیت شهرستان
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">اشتغال‌زایی بومی پیش‌بینی‌شده</span>
            <Briefcase className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {toPersianDigits(predictionResult.jobsCreatedProjected.toLocaleString('fa-IR'))}
            </span>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              شغل پایدار
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            از طریق وام خرد، آموزش و پروژه‌های پیمانکاری
          </p>
        </div>

      </div>

      {/* Executive Narrative Callout */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-800 shadow-md flex items-start gap-3">
        <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs leading-relaxed">
          <span className="font-bold text-amber-300 block">جمع‌بندی پیش‌بینی الگوریتمی برای هیئت مدیره:</span>
          <p className="text-slate-300">{predictionResult.executiveForecastNarrative}</p>
        </div>
      </div>

      {/* Detailed Indicator Forecast Grid */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              جدول مقایسه‌ای: شاخص‌های فعلی در برابر تخمین بهبود سال ۱۴۰۴
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              هرچه میزان بهبود درصد بالاتر باشد، اثرگذاری بودجه تخصیص داده شده ملموس‌تر خواهد بود.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="w-3 h-3 bg-red-400 rounded-full inline-block"></span> وضعیت فعلی
            <span className="w-3 h-3 bg-emerald-500 rounded-full inline-block ms-3"></span> پیش‌بینی سال آینده
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {predictionResult.forecasts.map((item) => {
            const isHighImpact = item.improvementPercentage >= 15;
            const formatUnit = (val: number) => {
              if (item.unit === 'PERCENT') return `${toPersianDigits(val)}٪`;
              if (item.unit === 'POPULATION') return `${toPersianDigits(val.toLocaleString('fa-IR'))} نفر`;
              return `${toPersianDigits(val)} از ۱۰۰`;
            };

            return (
              <div
                key={item.key}
                className={`p-4 rounded-xl border transition-all ${
                  isHighImpact
                    ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      {item.titleFa}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-medium">
                      بودجه مرتبط: {formatLargeBudgetPersian(item.impactBudgetToman)}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      item.impactLevel === 'EXCELLENT'
                        ? 'bg-emerald-600 text-white'
                        : item.impactLevel === 'HIGH'
                        ? 'bg-blue-600 text-white'
                        : item.impactLevel === 'MODERATE'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-600 text-white'
                    }`}
                  >
                    بهبود +{toPersianDigits(item.improvementPercentage)}٪
                  </span>
                </div>

                {/* Progress Visualizer Bar */}
                <div className="space-y-1.5 my-3">
                  <div className="flex justify-between text-[11px] font-extrabold">
                    <span className="text-slate-600 flex items-center gap-1">
                      فعلی: <strong className="text-slate-900">{formatUnit(item.currentValue)}</strong>
                    </span>
                    <span className="text-emerald-700 flex items-center gap-1">
                      سال آینده: <strong className="text-emerald-800">{formatUnit(item.predictedValueNextYear)}</strong>
                      <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 inline" />
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${Math.min(100, (item.currentValue / 100) * 100)}%` }}
                      className="bg-red-400 h-full transition-all duration-500"
                      title="وضعیت فعلی"
                    ></div>
                    <div
                      style={{ width: `${Math.min(100, (item.predictedValueNextYear / 100) * 100)}%` }}
                      className="bg-emerald-500 h-full transition-all duration-500 -ms-[100%]"
                      title="پیش‌بینی بهبود سال آینده"
                    ></div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-200/60 pt-2 mt-2">
                  {item.explanation}
                </p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
