import React, { useState } from 'react';
import { CsrPriority, LocalIndicators, OrganizationConfig, SmartRecommendationResult } from '../types';
import { toPersianDigits, formatCurrency } from '../utils/numberUtils';
import { Sparkles, BrainCircuit, Check, HelpCircle, ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, Flame, Globe2, MapPin, Building2 } from 'lucide-react';

interface SmartRecommendationViewProps {
  priorities: CsrPriority[];
  orgConfig: OrganizationConfig;
  indicators: LocalIndicators;
  recommendations: SmartRecommendationResult;
  onApplyRecommendations: () => void;
  onGenerateAiReport: () => void;
}

export const SmartRecommendationView: React.FC<SmartRecommendationViewProps> = ({
  priorities,
  orgConfig,
  indicators,
  recommendations,
  onApplyRecommendations,
  onGenerateAiReport,
}) => {
  const [expandedPriorityId, setExpandedPriorityId] = useState<string | null>(priorities[0]?.id || null);
  const [filterTier, setFilterTier] = useState<'ALL' | 'HOTSPOT' | 'UNIVERSAL'>('ALL');

  const filteredPriorities = priorities.filter((p) => {
    const exp = recommendations.explainability[p.id];
    if (filterTier === 'HOTSPOT') return exp?.isLocalHotspot;
    if (filterTier === 'UNIVERSAL') return exp?.isUniversalSevere;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Banner & Trigger Button (Light Theme) */}
      <div className="bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-slate-50 text-slate-900 rounded-2xl p-6 shadow-2xs border border-indigo-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full text-xs font-semibold">
              <BrainCircuit className="w-4 h-4 text-indigo-600" />
              موتور نسبت‌سنجی آماری ۴ سطحی (کشوری / استانی / شهرستانی / منطقه‌ای)
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              ارزیابی فراگیری آسیب‌ها و تعیین وزن‌های بودجه CSR در {orgConfig.county} - {orgConfig.city}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {recommendations.summaryRationale}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={onApplyRecommendations}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-md shadow-indigo-600/25 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>اعمال درصدهای پیشنهادی به جدول اصلی</span>
            </button>
            <button
              onClick={onGenerateAiReport}
              className="flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-4 py-3 rounded-xl shadow-2xs transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>تولید گزارش تحلیلی هیئت‌مدیره</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Tier Statistical Prevalence Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Local Hotspots */}
        <div 
          onClick={() => setFilterTier(filterTier === 'HOTSPOT' ? 'ALL' : 'HOTSPOT')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterTier === 'HOTSPOT' 
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200' 
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-rose-100 text-rose-700">
                <Flame className="w-4 h-4" />
              </span>
              <div>
                <div className="text-xs font-bold text-slate-800">کانون‌های بحران محلی (Hotspots)</div>
                <div className="text-[10px] text-slate-500">شدت در منطقه {'>'} میانگین کشور (ضریب ۱.۶x)</div>
              </div>
            </div>
            <span className="text-lg font-black text-rose-700">
              {toPersianDigits(recommendations.localHotspotCount || 0)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-600 leading-snug">
            آسیب‌هایی که حتی با نرمال بودن در سطح ملی، در سطح شهرستان رفسنجان و بخش‌های تابعه حاد بوده و اولویت قطعی تخصیص دارند.
          </p>
        </div>

        {/* Card 2: Universal Critical */}
        <div 
          onClick={() => setFilterTier(filterTier === 'UNIVERSAL' ? 'ALL' : 'UNIVERSAL')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterTier === 'UNIVERSAL' 
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200' 
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-purple-100 text-purple-700">
                <Globe2 className="w-4 h-4" />
              </span>
              <div>
                <div className="text-xs font-bold text-slate-800">فراگیری بحرانی همه‌جانبه</div>
                <div className="text-[10px] text-slate-500">حاد در کشوری، استانی، شهرستانی و محلی</div>
              </div>
            </div>
            <span className="text-lg font-black text-purple-700">
              {toPersianDigits(recommendations.universalCriticalCount || 0)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-600 leading-snug">
            چالش‌های ساختاری که هم در اسناد آماری ملی و هم در وضعیت میدانی استان و شهرستان در رتبه بحرانی ۱ قرار دارند.
          </p>
        </div>

        {/* Card 3: Overall Vulnerability Index */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <Building2 className="w-4 h-4" />
              </span>
              <div>
                <div className="text-xs font-bold text-slate-800">شاخص کل آسیب‌پذیری منطقه</div>
                <div className="text-[10px] text-slate-500">میانگین وزنی ۱۱ متغیر آماری</div>
              </div>
            </div>
            <span className="text-lg font-black text-blue-700">
              {toPersianDigits(recommendations.overallVulnerabilityIndex)} <span className="text-xs text-slate-400 font-normal">از ۱۰۰</span>
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-600 leading-snug">
            مستخرج از داده‌های رسمی مرکز آمار ایران، سازمان ثبت احوال و پایگاه‌های رفاه ایرانیان در سراسر شهرستان رفسنجان.
          </p>
        </div>

      </div>

      {/* Filter Chips */}
      <div className="flex items-center justify-between gap-3 bg-slate-100/80 p-2 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <span>فیلتر سرفصل‌ها بر اساس سطح فراگیری:</span>
          <button
            onClick={() => setFilterTier('ALL')}
            className={`px-3 py-1 rounded-lg text-xs transition-colors ${
              filterTier === 'ALL' ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            همه سرفصل‌ها ({toPersianDigits(priorities.length)})
          </button>
          <button
            onClick={() => setFilterTier('HOTSPOT')}
            className={`px-3 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${
              filterTier === 'HOTSPOT' ? 'bg-rose-600 text-white font-bold' : 'bg-white text-rose-700 hover:bg-rose-50'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>کانون‌های بحران محلی ({toPersianDigits(recommendations.localHotspotCount || 0)})</span>
          </button>
          <button
            onClick={() => setFilterTier('UNIVERSAL')}
            className={`px-3 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${
              filterTier === 'UNIVERSAL' ? 'bg-purple-600 text-white font-bold' : 'bg-white text-purple-700 hover:bg-purple-50'
            }`}
          >
            <Globe2 className="w-3 h-3" />
            <span>فراگیری همه‌جانبه ({toPersianDigits(recommendations.universalCriticalCount || 0)})</span>
          </button>
        </div>
      </div>

      {/* Detailed Priority Score Explainability Cards */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
        <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          تحلیل نسبت‌سنجی آماری، فراگیری ۴ سطحی و استدلال وزن‌دهی
        </h3>

        <div className="space-y-4">
          {filteredPriorities.map((p) => {
            const exp = recommendations.explainability[p.id];
            const prev = exp?.prevalence;
            const scorePct = recommendations.scores[p.id] || p.defaultPercentage;
            const amountToman = Math.round((orgConfig.totalBudget * scorePct) / 100);
            const isExpanded = expandedPriorityId === p.id;

            return (
              <div
                key={p.id}
                className={`border rounded-xl overflow-hidden transition-all ${
                  exp?.isLocalHotspot 
                    ? 'border-rose-300 bg-rose-50/20' 
                    : exp?.isUniversalSevere 
                    ? 'border-purple-300 bg-purple-50/20' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div
                  onClick={() => setExpandedPriorityId(isExpanded ? null : p.id)}
                  className="p-4 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs shrink-0">
                      {toPersianDigits(p.code)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-800 text-sm">{p.title}</h4>
                        {exp?.isLocalHotspot && (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                            <Flame className="w-3 h-3 text-rose-600" />
                            کانون بحران محلی (اولویت ۱ پیرامونی)
                          </span>
                        )}
                        {exp?.isUniversalSevere && (
                          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                            <Globe2 className="w-3 h-3 text-purple-600" />
                            فراگیری بحرانی همه‌جانبه
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{exp?.primaryDriver}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                    <div className="text-left">
                      <div className="text-sm font-extrabold text-blue-700 dir-rtl">
                        {toPersianDigits(scorePct)}٪
                      </div>
                      <div className="text-[11px] text-slate-500 dir-rtl">
                        {formatCurrency(amountToman, 'TOMAN', true)}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && exp && (
                  <div className="p-5 bg-white border-t border-slate-200 text-xs text-slate-700 space-y-4">
                    
                    {/* Multi-Level Prevalence Benchmark Grid */}
                    {prev && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                            نسبت‌سنجی آماری ۴ سطحی: {prev.metricName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            منبع داده: {prev.benchmarkSource}
                          </span>
                        </div>

                        {/* 4-Tier Comparison Bars */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          
                          {/* Level 1: National */}
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                            <div className="text-[10px] text-slate-500 font-semibold mb-1">۱. میانگین کشوری</div>
                            <div className="text-base font-black text-slate-800">
                              {toPersianDigits(prev.national)} <span className="text-[10px] font-normal text-slate-500">{prev.unit}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                              <div className="bg-slate-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, prev.national)}%` }}></div>
                            </div>
                          </div>

                          {/* Level 2: Provincial */}
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                            <div className="text-[10px] text-slate-500 font-semibold mb-1">۲. میانگین استانی ({orgConfig.province})</div>
                            <div className="text-base font-black text-indigo-700">
                              {toPersianDigits(prev.provincial)} <span className="text-[10px] font-normal text-slate-500">{prev.unit}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                              <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, prev.provincial)}%` }}></div>
                            </div>
                          </div>

                          {/* Level 3: County */}
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                            <div className="text-[10px] text-slate-500 font-semibold mb-1">۳. میانگین شهرستانی ({orgConfig.county})</div>
                            <div className="text-base font-black text-blue-700">
                              {toPersianDigits(prev.county)} <span className="text-[10px] font-normal text-slate-500">{prev.unit}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, prev.county)}%` }}></div>
                            </div>
                          </div>

                          {/* Level 4: Local Hotspot */}
                          <div className={`p-2.5 rounded-lg border ${exp.isLocalHotspot ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'}`}>
                            <div className="text-[10px] text-slate-500 font-semibold mb-1">۴. کانون محلی پیرامون صنعت</div>
                            <div className={`text-base font-black ${exp.isLocalHotspot ? 'text-rose-700' : 'text-emerald-700'}`}>
                              {toPersianDigits(prev.local)} <span className="text-[10px] font-normal text-slate-500">{prev.unit}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                              <div className={`${exp.isLocalHotspot ? 'bg-rose-500' : 'bg-emerald-500'} h-1.5 rounded-full`} style={{ width: `${Math.min(100, prev.local)}%` }}></div>
                            </div>
                          </div>

                        </div>

                        {/* Divergence Evaluation */}
                        <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-lg text-[11px] text-indigo-900 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">تحلیل نسبت‌سنجی (LQ = {toPersianDigits(prev.locationQuotient)} برابر میانگین کشوری): </span>
                            <span>{prev.divergenceDescription}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rationale Box */}
                    <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                      <strong className="text-blue-900 block mb-1">استدلال هوشمند تخصیص بودجه:</strong>
                      <p className="leading-relaxed text-slate-700">{exp.rationale}</p>
                    </div>

                    {/* Sub-Items */}
                    {p.subItems && p.subItems.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <strong className="text-slate-800 block mb-1.5 text-xs">
                          لیست کامل مسئولیت‌های تفکیکی CSR ({toPersianDigits(p.subItems.length)} اقدام اجرایی):
                        </strong>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          {p.subItems.map((sub, i) => (
                            <div key={i} className="flex items-start gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/70 text-slate-700">
                              <span className="text-indigo-600 font-bold shrink-0">•</span>
                              <span className="leading-snug">{sub}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

