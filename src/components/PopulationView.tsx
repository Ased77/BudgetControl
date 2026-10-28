import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatNumber, formatPercent, toPersianDigits } from '../utils/numberUtils';
import { Num } from './Num';
import { PageHeader } from './PageHeader';
import { HelpTooltip } from './HelpTooltip';
import {
  Users,
  Baby,
  GraduationCap,
  Briefcase,
  HeartHandshake,
  Building2,
  MapPin,
  TrendingDown,
  AlertTriangle,
  Info,
  Layers,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  PieChart as PieChartIcon,
  Home,
  Scale,
  LayoutDashboard,
  BarChart3,
} from 'lucide-react';
import AnimatedContent from './AnimatedContent/AnimatedContent';

type PopulationSubTabId = 'OVERVIEW' | 'DISTRICTS' | 'VULNERABLE' | 'PYRAMID';

export const PopulationView: React.FC = () => {
  const { locations, selectedLocation, handleSelectLocation } = useAppContext();
  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'DISTRICTS' | 'VULNERABLE' | 'PYRAMID'>('OVERVIEW');
  const [clarificationExpanded, setClarificationExpanded] = useState(false);

  // --- Live demographics derived from the selected county -------------------
  // Population, vulnerable-group counts and deprivation rates are read from the
  // location registry (real census figures and deprivation indicators per
  // county). Only the age structure and average household size are national
  // benchmarks applied on top of that county's real population.
  const NATIONAL_HOUSEHOLD_SIZE = 3.5; // میانگین بعد خانوار (سرشماری کشوری)

  const countyLocations = locations.filter((l) => l.county === selectedLocation.county);
  const countyRow =
    countyLocations.find((l) => l.id.includes('all')) ??
    countyLocations.reduce((max, l) => (l.population > max.population ? l : max), selectedLocation);
  const totalCountyPopulation = countyRow.population || selectedLocation.population;
  // Collect the بخش‌ها/شهرها rows of the selected county (excluding the
  // county-wide aggregate row) to derive the urban/rural split.
  const urbanCandidates = countyLocations.filter(
    (l) => l.id !== countyRow.id && !l.city.includes('کل شهرستان')
  );
  const urbanPopulation = urbanCandidates.length
    ? urbanCandidates.reduce((max, l) => (l.population > max.population ? l : max)).population
    : Math.round(totalCountyPopulation * 0.58);
  const ruralPopulation = Math.max(totalCountyPopulation - urbanPopulation, 0);
  const householdAverageSize = NATIONAL_HOUSEHOLD_SIZE;
  const totalHouseholds = Math.max(Math.round(totalCountyPopulation / householdAverageSize), 1);
  const totalDeprivedVulnerable = countyRow.indicators.vulnerableGroupsPopulation;
  const deprivedPercentage = totalCountyPopulation
    ? ((totalDeprivedVulnerable / totalCountyPopulation) * 100).toFixed(1)
    : '0.0';

  // Age cohorts — national age structure (سرشماری کشوری) applied to the real
  // population of the selected county, so counts follow the location picker.
  const ageCohorts = [
    { label: 'کودکان و نونهالان (۰ تا ۱۴ سال)', tab: 'نونهالان ۰ تا ۱۴', percent: 23.9, color: 'bg-emerald-500', note: 'نیاز به مهدکودک، تغذیه سالم و مدارس استاندارد' },
    { label: 'نوجوانان و جوانان (۱۵ تا ۲۹ سال)', tab: 'جوانان ۱۵ تا ۲۹', percent: 20.6, color: 'bg-blue-500', note: 'سن کلیدی دانشگاه، اشتغال اولیه، تسهیلات ازدواج و مسکن' },
    { label: 'میانسالان و شاغلین (۳۰ تا ۶۴ سال)', tab: 'شاغلین ۳۰ تا ۶۴', percent: 47.2, color: 'bg-indigo-500', note: 'نیروی کار فعال، شاغلین بخش‌های کشاورزی، صنعت و اصناف' },
    { label: 'سالمندان و بازنشستگان (۶۵ سال به بالا)', tab: 'سالمندان ۶۵+', percent: 8.3, color: 'bg-amber-500', note: 'خدمات درمانی تخصصی، مراقبت در منزل و بیمه سلامت' },
  ].map((cohort) => ({ ...cohort, count: Math.round((totalCountyPopulation * cohort.percent) / 100) }));

  // تقسیم جامعه هدف آسیب‌پذیر شهرستان بین نهادهای حمایتی (نسبت‌های اسناد رسمی
  // تجمیعی کمیته امداد/بهزیستی) — مقادیر از جمعیت واقعی شهرستان محاسبه می‌شود.
  const VULNERABLE_GROUP_SHARES = [
    {
      share: 43.2,
      title: 'خانواده‌های تحت پوشش کمیته امداد امام خمینی (ره)',
      supportType: 'مستمری معیشتی، مسکن محرومان، وام اشتغال و درمان',
      icon: HeartHandshake,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      share: 24.1,
      title: 'مددجویان و توانخواهان تحت پوشش اداره بهزیستی',
      supportType: 'توانبخشی معلولین، زنان سرپرست خانوار و ایتام',
      icon: ShieldCheck,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      share: 22.3,
      title: 'ساکنان سکونتگاه‌های غیررسمی و بافت‌های حاشیه‌ای',
      supportType: `بافت‌های حاشیه‌ای و سکونتگاه‌های غیررسمی ${selectedLocation.city}`,
      icon: Home,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      share: 10.4,
      title: 'کارگران فصلی و خانوارهای کم‌درآمد فاقد بیمه',
      supportType: 'بسته‌های معیشتی فصلی، بیمه روستایی و کمک‌هزینه درمان',
      icon: Briefcase,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
    },
  ];

  const vulnerableBreakdown = VULNERABLE_GROUP_SHARES.map((group) => {
    const population = Math.round((totalDeprivedVulnerable * group.share) / 100);
    return {
      ...group,
      coverageShare: group.share,
      population,
      households: Math.max(Math.round(population / householdAverageSize), 1),
    };
  });

  // District Population List
  // Quick sub-navigation tab model (redesigned segment tabs)
  const subNavigationTabs: {
    id: PopulationSubTabId;
    label: string;
    badge: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'OVERVIEW',
      label: 'نمای کلی جمعیت',
      badge: `${toPersianDigits(Math.max(countyLocations.length - 1, 1))} بخش`,
      icon: LayoutDashboard,
    },
    {
      id: 'DISTRICTS',
      label: 'بخش‌ها و آبادی‌ها',
      badge: `${toPersianDigits(Math.max(countyLocations.length, 1))} محدوده`,
      icon: MapPin,
    },
    {
      id: 'VULNERABLE',
      label: 'محرومین و آسیب‌پذیران',
      badge: `${formatNumber(totalDeprivedVulnerable)} نفر`,
      icon: HeartHandshake,
    },
    {
      id: 'PYRAMID',
      label: 'هرم سنی و جوانان',
      badge: '۴ گروه سنی',
      icon: BarChart3,
    },
  ];

  // بخش‌ها و محدوده‌های آبادی همان شهرستان — مستقیماً از رجیستری مکان‌ها.
  const districtRows = countyLocations.filter((l) => l.id !== countyRow.id);
  const districtList = (districtRows.length ? districtRows : countyLocations).map((l) => {
    const ind = l.indicators;
    // چالش اولویت‌دار محدوده از بالاترین شاخص محرومیت واقعی همان رکورد استخراج می‌شود.
    const challengeScores = [
      { score: ind.infrastructureDeficit, text: 'کمبود زیرساخت پایه، آب شرب و راه دسترسی' },
      { score: ind.povertyRate * 2, text: 'فقر و اشتغال ناپایدار خانوارهای کم‌درآمد' },
      { score: ind.marginalizationRate * 2, text: 'حاشیه‌نشینی و بافت فرسوده' },
      { score: ind.healthAccessDeficit, text: 'فاصله از خدمات تخصصی درمانی' },
      { score: ind.educationDropOutRate * 2, text: 'افت تحصیلی و فرسودگی مدارس روستایی' },
      { score: ind.environmentalRiskScore, text: 'آلودگی، ریزگرد و فرسایش بادی' },
      { score: ind.unemploymentRate * 2, text: 'بیکاری جوانان و نبود تنوع اقتصادی' },
      { score: ind.socialHarmsIndex, text: 'آسیب‌های اجتماعی و کمبود خدمات مددکاری' },
    ];
    return {
      id: l.id,
      name: l.city,
      population: l.population,
      riskScore: ind.environmentalRiskScore,
      infraDeficit: ind.infrastructureDeficit,
      deprivedCount: ind.vulnerableGroupsPopulation,
      deprivedRate: ind.povertyRate,
      mainChallenge: challengeScores.reduce((a, b) => (b.score > a.score ? b : a)).text,
    };
  });

  return (
    <AnimatedContent
      id="population-view-root"
      className="space-y-6"
      container="#app-scrollable-main-workspace"
      distance={24}
      duration={0.5}
      ease="power2.out"
      stagger={0.06}
      threshold={0.05}
    >
      {/* Page title block — above the banner, per the page-header reference. */}
      <PageHeader
        id="population-view-page-header"
        icon={Users}
        title={`آمار جمعیت و توزیع محرومیت ${countyRow.county}`}
        subtitle="پایش آمار دموگرافی رسمی - سالنامه ۱۴۰۳"
        tone="text-blue-600"
        adornment={
          <HelpTooltip
            text={`بر پایه آخرین سرشماری رسمی و سالنامه آماری استان ${selectedLocation.province}، ${countyRow.county} دارای ${formatNumber(totalCountyPopulation)} نفر جمعیت کل در ${toPersianDigits(Math.max(countyLocations.length - 1, 1))} بخش است. از این تعداد، دقیقاً ${formatNumber(totalDeprivedVulnerable)} نفر (${toPersianDigits(deprivedPercentage)}٪) به عنوان اقشار آسیب‌پذیر و محروم نیازمند حمایت مستقیم شناسایی شده‌اند.`}
            label="مشاهده توضیحات سرشماری رسمی"
            widthClassName="w-80"
          />
        }
      />

      <div id="population-view-header-banner" className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        {/* 4 Core County KPI Cards */}
        <div id="population-view-4-core-county-kpi-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div id="population-view-4-core-county-kpi-cards-2" className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block mb-1">کل جمعیت {countyRow.county}</span>
            <Num value={formatNumber(totalCountyPopulation)} className="text-2xl md:text-3xl font-black text-slate-900 font-mono block" />
            <span className="text-[11px] text-slate-500 mt-1 block">
              <Num value={formatNumber(totalHouseholds)} unit="خانوار" unitClassName="text-[0.85em] font-bold text-slate-500 ms-0.5" /> (بعد <Num value={formatNumber(householdAverageSize)} />)
            </span>
          </div>

          <div id="population-view-4-core-county-kpi-cards-3" className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200">
            <span className="text-xs text-blue-700 font-semibold block mb-1">جمعیت شهری {selectedLocation.city}</span>
            <Num value={formatNumber(urbanPopulation)} className="text-2xl md:text-3xl font-black text-blue-900 font-mono block" />
            <span className="text-[11px] text-blue-700 mt-1 block">
              <Num value={formatPercent((urbanPopulation / (totalCountyPopulation || 1)) * 100, { fractionDigits: 1 })} /> جمعیت کل
            </span>
          </div>

          <div id="population-view-4-core-county-kpi-cards-4" className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
            <span className="text-xs text-emerald-700 font-semibold block mb-1">جمعیت روستایی {selectedLocation.city}</span>
            <Num value={formatNumber(ruralPopulation)} className="text-2xl md:text-3xl font-black text-emerald-900 font-mono block" />
            <span className="text-[11px] text-emerald-700 mt-1 block">
              <Num value={formatPercent((ruralPopulation / (totalCountyPopulation || 1)) * 100, { fractionDigits: 1 })} /> جمعیت کل
            </span>
          </div>

          <div id="population-view-4-core-county-kpi-cards-5" className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200">
            <div id="population-view-4-core-county-kpi-cards-6" className="flex items-center justify-between">
              <span className="text-xs text-rose-700 font-semibold block mb-1">کل جمعیت محروم و آسیب‌پذیر</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <Num value={formatNumber(totalDeprivedVulnerable)} unit="نفر" className="text-2xl md:text-3xl font-black text-rose-900 font-mono block" />
            <span className="text-[11px] text-rose-700 mt-1 font-bold block">
              <Num value={formatPercent(Number(deprivedPercentage))} /> از جمعیت کل شهرستان
            </span>
          </div>
        </div>
      </div>

      {/* Explanatory Clarification Alert regarding Project Reach vs Deprived Pop */}
      <div
        id="population-view-explanatory-clarification-alert"
        onClick={() => setClarificationExpanded((v) => !v)}
        className="bg-amber-50/90 hover:bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-900 cursor-pointer select-none transition-colors"
      >
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div id="population-view-explanatory-clarification-alert-2" className="text-xs leading-relaxed space-y-1 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-amber-950">
              تفاوت آماری مهم: «جمعیت تحت پوشش زیرساخت‌های کلان» در برابر «جمعیت محروم شناسایی‌شده»
            </p>
            {clarificationExpanded
              ? <ChevronUp className="w-4 h-4 text-amber-600 shrink-0" />
              : <ChevronDown className="w-4 h-4 text-amber-600 shrink-0" />}
          </div>
          {clarificationExpanded && (
            <p className="text-amber-800">
              برخی پروژه‌های عمومی عام‌المنفعه ماهیت فراگیر داشته و به کل جمعیت {formatNumber(totalCountyPopulation)} نفری شهرستان و مسافران خدمات می‌دهند. اما در محاسبات تخصیص محرومیت،{' '}
              <strong>جمعیت محروم {countyRow.county} دقیقاً <Num value={formatNumber(totalDeprivedVulnerable)} unit="نفر" unitClassName="text-[0.85em] font-bold text-amber-800 ms-1" /> (<Num value={`${toPersianDigits(deprivedPercentage)}٪`} />)</strong> است و بودجه‌های حمایتی نظیر جهیزیه، وام اشتغال خرد، آبرسانی روستاهای دارای تنش و درمان ناباروری مستقیماً به این جامعه هدف تخصیص می‌یابد.
            </p>
          )}
        </div>
      </div>

      {/* Quick Sub-navigation — redesigned segment tabs, sits below the clarification alert */}
      <div id="population-view-quick-sub-navigation" className="shrink-0">
        <div
          id="population-view-quick-sub-navigation-2"
          role="tablist"
          aria-label="بخش‌های نمای جمعیت"
          className="flex flex-wrap items-end gap-1 relative z-10"
        >
          {subNavigationTabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`population-view-quick-sub-navigation-3-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSubTab(tab.id)}
                className={`group flex items-center gap-2.5 whitespace-nowrap rounded-t-2xl border border-b-0 px-5 text-right transition-colors duration-150 shrink-0 h-12 ${
                  isActive
                    ? 'relative z-10 -mb-px bg-white border-slate-200 text-blue-800 shadow-[0_-10px_18px_-12px_rgba(30,64,175,0.45)]'
                    : 'bg-slate-100/90 border-slate-200/80 text-slate-500 hover:bg-slate-200/60 hover:text-slate-700'
                }`}
              >
                <TabIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="text-[13px] whitespace-nowrap font-bold">{tab.label}</span>
                <span
                  className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white/80 border-slate-200/80 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Folder body — the active panel renders inside the folder */}
        <div id="population-view-quick-sub-navigation-folder-body" className="bg-white rounded-b-3xl rounded-tl-3xl border border-slate-200 shadow-sm p-3 md:p-4">

      {/* SUB-TAB 1: Overview & Comparative Metrics */}
      {activeSubTab === 'OVERVIEW' && (
        <div id="population-view-sub-tab-1-overview-comparative" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Population Distribution by Bakhsh */}
          <div id="population-view-population-distribution-by" className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div id="population-view-population-distribution-by-2" className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div id="population-view-population-distribution-by-3" className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-base">توزیع جمعیتی بر حسب بخش‌های {countyRow.county}</h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">مجموع: <Num value={formatNumber(totalCountyPopulation)} unit="نفر" unitClassName="text-[0.85em] font-bold text-slate-500 ms-0.5" /></span>
            </div>

            <div id="population-view-population-distribution-by-4" className="space-y-4">
              {districtList.map((district) => {
                const sharePercent = ((district.population / totalCountyPopulation) * 100).toFixed(1);
                return (
                  <div id={`population-view-population-distribution-by-5-${district.id}`} key={district.id} className="space-y-1.5">
                    <div id={`population-view-population-distribution-by-6-${district.id}`} className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{district.name}</span>
                      <div id={`population-view-population-distribution-by-7-${district.id}`} className="flex items-center gap-2 font-mono">
                        <Num value={formatNumber(district.population)} unit="نفر" unitClassName="text-[0.85em] font-bold text-slate-900 ms-0.5" className="font-bold" />
                        <span className="text-slate-400">(<Num value={formatPercent(Number(sharePercent))} className="text-slate-400" />)</span>
                      </div>
                    </div>
                    <div id={`population-view-population-distribution-by-8-${district.id}`} className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        id={`population-view-population-distribution-by-9-${district.id}`}
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${sharePercent}%` }}
                      />
                    </div>
                    <div id={`population-view-population-distribution-by-10-${district.id}`} className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{district.urbanShare}</span>
                      <span className="text-rose-600 font-medium">
                        محرومیت: <Num value={formatNumber(district.deprivedCount)} unit="نفر" unitClassName="text-[0.85em] font-bold text-rose-600 ms-0.5" /> (<Num value={formatPercent(district.deprivedRate)} />)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Urban vs Rural & Vulnerability Stats */}
          <div id="population-view-urban-vs-rural-vulnerability" className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div id="population-view-urban-vs-rural-vulnerability-2">
              <div id="population-view-urban-vs-rural-vulnerability-3" className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div id="population-view-urban-vs-rural-vulnerability-4" className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-black text-slate-900 text-base">شاخص‌های بافت سکونتی و اجتماعی</h3>
                </div>
                <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg">
                  پایش توسعه
                </span>
              </div>

              <div id="population-view-urban-vs-rural-vulnerability-5" className="grid grid-cols-2 gap-3 mb-4">
                <div id="population-view-urban-vs-rural-vulnerability-6" className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">نرخ حاشیه‌نشینی شهری</span>
                  <Num value={formatPercent(countyRow.indicators.marginalizationRate)} className="text-xl font-black text-slate-900 font-mono" />
                  <span className="text-[10px] text-slate-500 block mt-1">سکونتگاه‌های غیررسمی {selectedLocation.city}</span>
                </div>
                <div id="population-view-urban-vs-rural-vulnerability-7" className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">نرخ بیکاری رسمی</span>
                  <Num value={formatPercent(countyRow.indicators.unemploymentRate)} className="text-xl font-black text-slate-900 font-mono" />
                  <span className="text-[10px] text-slate-500 block mt-1">تمرکز در جوانان و فارغ‌التحصیلان</span>
                </div>
                <div id="population-view-urban-vs-rural-vulnerability-8" className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">کمبود زیرساخت پایه</span>
                  <Num value={formatPercent(countyRow.indicators.infrastructureDeficit)} className="text-xl font-black text-amber-700 font-mono" />
                  <span className="text-[10px] text-amber-700 block mt-1">آب شرب، راه و خدمات روستایی</span>
                </div>
                <div id="population-view-urban-vs-rural-vulnerability-9" className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">پوشش زیرساخت پایه (برآورد)</span>
                  <Num value={formatPercent(100 - countyRow.indicators.infrastructureDeficit, { fractionDigits: 1 })} className="text-xl font-black text-emerald-700 font-mono" />
                  <span className="text-[10px] text-emerald-700 block mt-1">مکمل شاخص کمبود زیرساخت منطقه</span>
                </div>
              </div>
            </div>

            <div id="population-view-urban-vs-rural-vulnerability-10" className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs text-blue-900">
              <span className="font-bold block mb-1">📌 نتیجه‌گیری تحلیلی فرمانداری و ستاد:</span>
              نرخ محرومیت شناسایی‌شده در {countyRow.county} معادل <Num value={`${toPersianDigits(deprivedPercentage)}٪`} /> جمعیت است، اما عمق محرومیت در بخش‌های دارای کمبود آب شرب و ریسک بالای زیست‌محیطی، نیازمند مداخله هدفمند و تخصیص اعتبارات متناسب است.
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Detailed Districts Table */}
      {activeSubTab === 'DISTRICTS' && (
        <div id="population-view-sub-tab-2-detailed-districts" className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div id="population-view-sub-tab-2-detailed-districts-2" className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div id="population-view-sub-tab-2-detailed-districts-3">
              <h3 className="font-black text-slate-900 text-lg">جدول تفصیلی بخش‌ها و محدوده‌های {countyRow.county}</h3>
              <p className="text-xs text-slate-500 mt-0.5">آمار جمعیتی و درصد محرومیت تایید شده در کمیته برنامه‌ریزی</p>
            </div>
          </div>

          <div id="population-view-sub-tab-2-detailed-districts-4" className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3.5 font-black">نام بخش و محدوده جغرافیایی</th>
                  <th className="p-3.5 font-black font-mono">جمعیت کل</th>
                  <th className="p-3.5 font-black">ریسک محیط‌زیستی (٪)</th>
                  <th className="p-3.5 font-black font-mono text-rose-700">جمعیت محروم (نفر)</th>
                  <th className="p-3.5 font-black font-mono text-rose-700">درصد محرومیت</th>
                  <th className="p-3.5 font-black">کمبود زیرساخت</th>
                  <th className="p-3.5 font-black">چالش اولویت‌دار بخش</th>
                  <th className="p-3.5 font-black">انتخاب برای رصد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {districtList.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{d.name}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-800"><Num value={formatNumber(d.population)} className="font-mono font-bold text-slate-800" /></td>
                    <td className="p-3.5 text-slate-600"><Num value={formatNumber(d.riskScore)} unit="٪" unitClassName="text-[0.85em] font-bold text-slate-600 ms-0.5" /></td>
                    <td className="p-3.5 font-mono font-bold text-rose-700"><Num value={formatNumber(d.deprivedCount)} className="font-mono font-bold text-rose-700" /></td>
                    <td className="p-3.5 font-mono font-black text-rose-700">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200">
                        <Num value={formatPercent(d.deprivedRate)} />
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600"><Num value={formatPercent(d.infraDeficit)} className="font-mono text-slate-600" /></td>
                    <td className="p-3.5 text-slate-600 max-w-xs">{d.mainChallenge}</td>
                    <td className="p-3.5">
                      <button
                        onClick={() => {
                          const targetLoc = locations.find((l) => l.id === d.id);
                          if (targetLoc) handleSelectLocation(targetLoc);
                        }}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] border border-blue-200 transition-colors"
                      >
                        تنظیم فیلتر
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Vulnerable Groups Breakdown */}
      {activeSubTab === 'VULNERABLE' && (
        <div id="population-view-sub-tab-3-vulnerable-groups" className="space-y-4">
          <div id="population-view-sub-tab-3-vulnerable-groups-2" className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div id="population-view-sub-tab-3-vulnerable-groups-3" className="flex items-center justify-between pb-3 border-b border-slate-100 mb-6">
              <div id="population-view-sub-tab-3-vulnerable-groups-4">
                <h3 className="font-black text-slate-900 text-lg">
                  تفکیک جامعه هدف {formatNumber(totalDeprivedVulnerable)} نفری محروم و آسیب‌پذیر {selectedLocation.city}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  گزارش رسمی تجمیعی کمیته امداد، اداره بهزیستی و فرمانداری {selectedLocation.county}
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                پوشش شفاف نهادهای حمایتی
              </span>
            </div>

            <div id="population-view-sub-tab-3-vulnerable-groups-5" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vulnerableBreakdown.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div id={`population-view-sub-tab-3-vulnerable-groups-6-${idx}`} key={idx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div id={`population-view-sub-tab-3-vulnerable-groups-7-${idx}`} className="flex items-center justify-between">
                      <div id={`population-view-sub-tab-3-vulnerable-groups-8-${idx}`} className="flex items-center gap-2">
                        <span className={`p-2 rounded-xl border ${item.color}`}>
                          <Icon className="w-5 h-5" />
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                      </div>
                      <span className="text-xs font-bold font-mono text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        <Num value={formatPercent(item.coverageShare)} />
                      </span>
                    </div>

                    <div id={`population-view-sub-tab-3-vulnerable-groups-9-${idx}`} className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                      <div id={`population-view-sub-tab-3-vulnerable-groups-10-${idx}`}>
                        <span className="text-slate-500 text-[11px] block">تعداد خانوار:</span>
                        <Num value={formatNumber(item.households)} unit="خانوار" unitClassName="text-[0.85em] font-bold text-slate-800 ms-0.5" className="font-bold font-mono" />
                      </div>
                      <div id={`population-view-sub-tab-3-vulnerable-groups-11-${idx}`}>
                        <span className="text-slate-500 text-[11px] block">جمعیت تحت پوشش:</span>
                        <Num value={formatNumber(item.population)} unit="نفر" unitClassName="text-[0.85em] font-black text-rose-700 ms-0.5" className="font-black font-mono" />
                      </div>
                    </div>

                    <div id={`population-view-sub-tab-3-vulnerable-groups-12-${idx}`} className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="font-semibold text-slate-800">خدمات دریافتی: </span>
                      {item.supportType}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Age Cohorts and Demographic Pyramid */}
      {activeSubTab === 'PYRAMID' && (
        <div id="population-view-sub-tab-4-age-cohorts-and" className="space-y-6 animate-in fade-in duration-200">
          <div id="population-view-sub-tab-4-age-cohorts-and-2" className="flex items-center justify-between pb-3 border-b border-dashed border-slate-200">
            <div id="population-view-sub-tab-4-age-cohorts-and-3">
              <h3 className="font-black text-slate-900 text-lg">ساختار هرم سنی جمعیت {countyRow.county}</h3>
              <p className="text-xs text-slate-500 mt-0.5">توزیع گروه‌های سنی و اولویت‌های متناظر در قانون جوانی جمعیت</p>
            </div>
            <span className="text-xs text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 font-bold">
              پنجره جمعیتی فعال
            </span>
          </div>

          <div id="population-view-sub-tab-4-age-cohorts-and-4" className="space-y-5">
            {ageCohorts.map((cohort, index) => (
              <div id={`population-view-sub-tab-4-age-cohorts-and-5-${index}`} key={index}>
                {/* Mini folder-divider tab for this cohort section */}
                <div className="flex -mb-px relative z-10">
                  <span className="ms-5 inline-flex items-center gap-1.5 rounded-t-xl bg-slate-50 border border-b-0 border-slate-200 px-4 py-1.5 text-[10px] font-black text-slate-600">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cohort.color}`} />
                    {cohort.tab}
                    <Num value={formatPercent(cohort.percent)} className="font-mono text-slate-400" />
                  </span>
                </div>
                <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl rounded-tr-none border border-slate-200">
                <div id={`population-view-sub-tab-4-age-cohorts-and-6-${index}`} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 text-sm">{cohort.label}</span>
                  <Num value={formatNumber(cohort.count)} unit="نفر" unitClassName="text-[0.85em] font-black text-slate-900 ms-0.5" className="font-black font-mono" />
                </div>

                <div id={`population-view-sub-tab-4-age-cohorts-and-8-${index}`} className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div
                    id={`population-view-sub-tab-4-age-cohorts-and-9-${index}`}
                    className={`${cohort.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${cohort.percent}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-600 mt-1">
                  💡 <strong className="text-slate-800">برنامه اقدام:</strong> {cohort.note}
                </p>
                </div>
              </div>
            ))}
          </div>

          <div id="population-view-sub-tab-4-age-cohorts-and-10" className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
            <span className="font-bold block mb-1">🌟 تحلیل پنجره جمعیتی {countyRow.county}:</span>
            بیش از <strong><Num value={`${toPersianDigits(ageCohorts.filter((c) => c.tab.includes('۱۵') || c.tab.includes('۳۰')).reduce((sum, c) => sum + c.percent, 0).toFixed(1))}٪`} /> از جمعیت {selectedLocation.city}</strong> در سنین فعال کار و جوانی (۱۵ تا ۶۴ سال) قرار دارند. این پنجره جمعیتی طلایی نشان می‌دهد که اولویت شماره یک تخصیص منابع CSR و بودجه عمومی باید معطوف به <strong>تسهیلات اشتغال خرد، رفع موانع ازدواج، تامین مسکن و درمان ناباروری</strong> باشد تا از تله جمعیتی و مهاجرت نخبگان جلوگیری به عمل آید.
          </div>
        </div>      )}
        </div>
      </div>
    </AnimatedContent>
  );
};
