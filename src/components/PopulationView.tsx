import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatNumber, toPersianDigits } from '../utils/numberUtils';
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

type PopulationSubTabId = 'OVERVIEW' | 'DISTRICTS' | 'VULNERABLE' | 'PYRAMID';

export const PopulationView: React.FC = () => {
  const { locations, selectedLocation, handleSelectLocation } = useAppContext();
  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'DISTRICTS' | 'VULNERABLE' | 'PYRAMID'>('OVERVIEW');
  const [clarificationExpanded, setClarificationExpanded] = useState(false);

  // Official demographics data for Rafsanjan County (سالنامه آماری رسمی شهرستان رفسنجان)
  const totalCountyPopulation = 315000;
  const urbanPopulation = 182000; // 57.8%
  const ruralPopulation = 133000; // 42.2%
  const totalHouseholds = 92650;
  const householdAverageSize = 3.4;
  const totalDeprivedVulnerable = 38200; // 12.1% of county
  const deprivedPercentage = ((totalDeprivedVulnerable / totalCountyPopulation) * 100).toFixed(1);

  // Age Cohorts
  const ageCohorts = [
    { label: 'کودکان و نونهالان (۰ تا ۱۴ سال)', tab: 'نونهالان ۰ تا ۱۴', percent: 22.4, count: 70560, color: 'bg-emerald-500', note: 'نیاز به مهدکودک، تغذیه سالم و مدارس استاندارد' },
    { label: 'نوجوانان و جوانان (۱۵ تا ۲۹ سال)', tab: 'جوانان ۱۵ تا ۲۹', percent: 24.1, count: 75915, color: 'bg-blue-500', note: 'سن کلیدی دانشگاه، اشتغال اولیه، تسهیلات ازدواج و مسکن' },
    { label: 'میانسالان و شاغلین (۳۰ تا ۶۴ سال)', tab: 'شاغلین ۳۰ تا ۶۴', percent: 45.2, count: 142380, color: 'bg-indigo-500', note: 'نیروی کار فعال، شاغلین باغات پسته، صنایع مس و اصناف' },
    { label: 'سالمندان و بازنشستگان (۶۵ سال به بالا)', tab: 'سالمندان ۶۵+', percent: 8.3, count: 26145, color: 'bg-amber-500', note: 'خدمات درمانی تخصصی، مراقبت در منزل و بیمه سلامت' },
  ];

  // Vulnerable groups breakdown (تفکیک اقشار نیازمند حمایت در رفسنجان)
  const vulnerableBreakdown = [
    {
      title: 'خانواده‌های تحت پوشش کمیته امداد امام خمینی (ره)',
      households: 6850,
      population: 16500,
      coverageShare: 43.2,
      supportType: 'مستمری معیشتی، مسکن محرومان، وام اشتغال و درمان',
      icon: HeartHandshake,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'مددجویان و توانخواهان تحت پوشش اداره بهزیستی',
      households: 3420,
      population: 9200,
      coverageShare: 24.1,
      supportType: 'توانبخشی معلولین، زنان سرپرست خانوار و ایتام',
      icon: ShieldCheck,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      title: 'ساکنان سکونتگاه‌های غیررسمی و بافت‌های حاشیه‌ای',
      households: 2150,
      population: 8500,
      coverageShare: 22.3,
      supportType: 'بافت‌های حاشیه شهر رفسنجان (رحمت‌آباد، علی‌آباد و کمال‌آباد)',
      icon: Home,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      title: 'کارگران فصلی و خانوارهای کم‌درآمد فاقد بیمه',
      households: 1100,
      population: 4000,
      coverageShare: 10.4,
      supportType: 'بسته‌های معیشتی فصلی، بیمه روستایی و کمک‌هزینه درمان',
      icon: Briefcase,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
    },
  ];

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
      badge: '۴ بخش',
      icon: LayoutDashboard,
    },
    {
      id: 'DISTRICTS',
      label: 'بخش‌ها و آبادی‌ها',
      badge: '۲۲۰ آبادی',
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

  // District Population List
  const districtList = [
    {
      id: 'loc-02-rafsanjan-central',
      name: 'بخش مرکزی و شهر رفسنجان',
      population: 222000,
      urbanShare: '۱۶۴,۰۰۰ شهری / ۵۸,۰۰۰ روستایی',
      deprivedCount: 18500,
      deprivedRate: 8.3,
      villagesCount: 78,
      mainChallenge: 'حاشیه‌نشینی در ۴ محله، آلودگی هوا و تقاضای اشتغال جوانان',
    },
    {
      id: 'loc-03-koshkuiyeh',
      name: 'بخش کشکوئیه (شهر و دهستان راویز)',
      population: 41000,
      urbanShare: '۷,۸۰۰ شهری / ۳۳,۲۰۰ روستایی',
      deprivedCount: 8400,
      deprivedRate: 20.5,
      villagesCount: 52,
      mainChallenge: 'تنش شدید آب شرب در تابستان و افت سفره‌های زیرزمینی',
    },
    {
      id: 'loc-04-nuq',
      name: 'بخش نوق (شهر بهرمان و روستاهای تابعه)',
      population: 29000,
      urbanShare: '۵,۲۰۰ شهری / ۲۳,۸۰۰ روستایی',
      deprivedCount: 6200,
      deprivedRate: 21.3,
      villagesCount: 44,
      mainChallenge: 'محور حادثه‌خیز جاده‌ای و فرسایش خاک و بادزدگی',
    },
    {
      id: 'loc-05-ferdows',
      name: 'بخش فردوس (شهر صفائیه و روستاهای دشت)',
      population: 23000,
      urbanShare: '۲,۵۰۰ شهری / ۲۰,۵۰۰ روستایی',
      deprivedCount: 5100,
      deprivedRate: 22.1,
      villagesCount: 46,
      mainChallenge: 'فاصله از خدمات تخصصی درمانی، فرسودگی مدارس روستایی',
    },
  ];

  return (
    <div id="population-view-root" className="space-y-6">
      {/* Header Banner */}
      <div id="population-view-header-banner" className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div id="population-view-header-banner-2" className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div id="population-view-header-banner-3">
            <div id="population-view-header-banner-4" className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                <Users className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                پایش آمار دموگرافی رسمی - سالنامه ۱۴۰۳
              </span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                آمار جمعیت و توزیع محرومیت شهرستان رفسنجان
              </h1>
              <HelpTooltip
                text="بر پایه آخرین سرشماری رسمی و سالنامه آماری استان کرمان، شهرستان رفسنجان دارای ۳۱۵,۰۰۰ نفر جمعیت کل در ۴ بخش (مرکزی، کشکوئیه، نوق و فردوس) است. از این تعداد، دقیقا ۳۸,۲۰۰ نفر (۱۲.۱٪) به عنوان اقشار آسیب‌پذیر و محروم نیازمند حمایت مستقیم شناسایی شده‌اند."
                label="مشاهده توضیحات سرشماری رسمی"
                widthClassName="w-80"
              />
            </div>
          </div>

        </div>

        {/* 4 Core County KPI Cards */}
        <div id="population-view-4-core-county-kpi-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div id="population-view-4-core-county-kpi-cards-2" className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block mb-1">کل جمعیت شهرستان رفسنجان</span>
            <span className="text-2xl md:text-3xl font-black text-slate-900 font-mono block">
              {formatNumber(totalCountyPopulation)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {formatNumber(totalHouseholds)} خانوار (بعد ۳.۴)
            </span>
          </div>

          <div id="population-view-4-core-county-kpi-cards-3" className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200">
            <span className="text-xs text-blue-700 font-semibold block mb-1">جمعیت شهری رفسنجان</span>
            <span className="text-2xl md:text-3xl font-black text-blue-900 font-mono block">
              {formatNumber(urbanPopulation)}
            </span>
            <span className="text-[11px] text-blue-700 mt-1 block">
              ۵۷.۸٪ جمعیت کل (۵ شهر)
            </span>
          </div>

          <div id="population-view-4-core-county-kpi-cards-4" className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
            <span className="text-xs text-emerald-700 font-semibold block mb-1">جمعیت روستایی رفسنجان</span>
            <span className="text-2xl md:text-3xl font-black text-emerald-900 font-mono block">
              {formatNumber(ruralPopulation)}
            </span>
            <span className="text-[11px] text-emerald-700 mt-1 block">
              ۴۲.۲٪ جمعیت کل (۲۲۰ روستا)
            </span>
          </div>

          <div id="population-view-4-core-county-kpi-cards-5" className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200">
            <div id="population-view-4-core-county-kpi-cards-6" className="flex items-center justify-between">
              <span className="text-xs text-rose-700 font-semibold block mb-1">کل جمعیت محروم و آسیب‌پذیر</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-2xl md:text-3xl font-black text-rose-900 font-mono block">
              {formatNumber(totalDeprivedVulnerable)} نفر
            </span>
            <span className="text-[11px] text-rose-700 mt-1 font-bold block">
              {toPersianDigits(deprivedPercentage)}٪ از جمعیت کل شهرستان
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
              برخی پروژه‌های عمومی نظیر تعریض جاده رفسنجان-نوق یا تجهیز بیمارستان علی‌ابن‌ابیطالب (ع) ماهیت عام‌المنفعه داشته و به کل جمعیت ۳۱۵ هزار نفری شهرستان و مسافران خدمات می‌دهند. اما در محاسبات تخصیص محرومیت،{' '}
              <strong>جمعیت محروم شهرستان رفسنجان دقیقا ۳۸,۲۰۰ نفر (۱۲.۱٪)</strong> است و بودجه‌های حمایتی نظیر جهیزیه، وام اشتغال خرد، آبرسانی روستاهای دارای تنش و درمان ناباروری مستقیماً به این جامعه هدف تخصیص می‌یابد.
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
          className="flex flex-wrap items-end gap-1 px-1 relative z-10"
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
                className={`group flex items-center gap-2.5 whitespace-nowrap rounded-t-2xl border border-b-0 px-4 text-right transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'relative z-10 -mb-px bg-white border-slate-200 py-3 text-blue-800 shadow-[0_-10px_18px_-12px_rgba(30,64,175,0.45)]'
                    : 'bg-slate-100/90 border-slate-200/80 py-2 text-slate-500 hover:bg-slate-200/60 hover:text-slate-700'
                }`}
              >
                <TabIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className={`text-xs whitespace-nowrap ${isActive ? 'font-black' : 'font-bold'}`}>{tab.label}</span>
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0 transition-colors ${
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
                <h3 className="font-black text-slate-900 text-base">توزیع جمعیتی بر حسب بخش‌های چهارگانه</h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">مجموع: ۳۱۵,۰۰۰ نفر</span>
            </div>

            <div id="population-view-population-distribution-by-4" className="space-y-4">
              {districtList.map((district) => {
                const sharePercent = ((district.population / totalCountyPopulation) * 100).toFixed(1);
                return (
                  <div id={`population-view-population-distribution-by-5-${district.id}`} key={district.id} className="space-y-1.5">
                    <div id={`population-view-population-distribution-by-6-${district.id}`} className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{district.name}</span>
                      <div id={`population-view-population-distribution-by-7-${district.id}`} className="flex items-center gap-2 font-mono">
                        <span className="text-slate-900 font-bold">{formatNumber(district.population)} نفر</span>
                        <span className="text-slate-400">({toPersianDigits(sharePercent)}٪)</span>
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
                        محرومیت: {formatNumber(district.deprivedCount)} نفر ({toPersianDigits(district.deprivedRate)}٪)
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
                  <span className="text-xl font-black text-slate-900 font-mono">۹.۵٪</span>
                  <span className="text-[10px] text-slate-500 block mt-1">رحمت‌آباد و علی‌آباد</span>
                </div>
                <div id="population-view-urban-vs-rural-vulnerability-7" className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">نرخ بیکاری رسمی</span>
                  <span className="text-xl font-black text-slate-900 font-mono">۱۳.۸٪</span>
                  <span className="text-[10px] text-slate-500 block mt-1">تمرکز در فارغ‌التحصیلان</span>
                </div>
                <div id="population-view-urban-vs-rural-vulnerability-8" className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">روستاهای دارای تنش آبی</span>
                  <span className="text-xl font-black text-amber-700 font-mono">۳۸ روستا</span>
                  <span className="text-[10px] text-amber-700 block mt-1">کشکوئیه، راویز و نوق</span>
                </div>
                <div id="population-view-urban-vs-rural-vulnerability-9" className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">پوشش آب شرب پایدار</span>
                  <span className="text-xl font-black text-emerald-700 font-mono">۸۸.۲٪</span>
                  <span className="text-[10px] text-emerald-700 block mt-1">طرح جامع آبفا و مس</span>
                </div>
              </div>
            </div>

            <div id="population-view-urban-vs-rural-vulnerability-10" className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs text-blue-900">
              <span className="font-bold block mb-1">📌 نتیجه‌گیری تحلیلی فرمانداری و ستاد:</span>
              نرخ محرومیت واقعی رفسنجان (۱۲.۱٪) نسبت به میانگین جنوب استان کرمان پایین‌تر است، اما عمق محرومیت در بخش‌های کشکوئیه و فردوس به دلیل کمبود آب شرب و آلایندگی اقلیمی، نیازمند مداخله هدفمند با ۵ همت اعتبارات است.
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Detailed Districts Table */}
      {activeSubTab === 'DISTRICTS' && (
        <div id="population-view-sub-tab-2-detailed-districts" className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div id="population-view-sub-tab-2-detailed-districts-2" className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div id="population-view-sub-tab-2-detailed-districts-3">
              <h3 className="font-black text-slate-900 text-lg">جدول تفصیلی بخش‌ها و آبادی‌های شهرستان رفسنجان</h3>
              <p className="text-xs text-slate-500 mt-0.5">آمار جمعیتی و درصد محرومیت تایید شده در کمیته برنامه‌ریزی</p>
            </div>
          </div>

          <div id="population-view-sub-tab-2-detailed-districts-4" className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3.5 font-black">نام بخش و محدوده جغرافیایی</th>
                  <th className="p-3.5 font-black font-mono">جمعیت کل</th>
                  <th className="p-3.5 font-black">ترکیب شهری / روستایی</th>
                  <th className="p-3.5 font-black font-mono text-rose-700">جمعیت محروم (نفر)</th>
                  <th className="p-3.5 font-black font-mono text-rose-700">درصد محرومیت</th>
                  <th className="p-3.5 font-black">تعداد روستاها</th>
                  <th className="p-3.5 font-black">چالش اولویت‌دار بخش</th>
                  <th className="p-3.5 font-black">انتخاب برای رصد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {districtList.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{d.name}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-800">{formatNumber(d.population)}</td>
                    <td className="p-3.5 text-slate-600">{d.urbanShare}</td>
                    <td className="p-3.5 font-mono font-bold text-rose-700">{formatNumber(d.deprivedCount)}</td>
                    <td className="p-3.5 font-mono font-black text-rose-700">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200">
                        {toPersianDigits(d.deprivedRate)}٪
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{toPersianDigits(d.villagesCount)} آبادی</td>
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
                  تفکیک جامعه هدف ۳۸,۲۰۰ نفری محروم و آسیب‌پذیر رفسنجان
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  گزارش رسمی تجمیعی کمیته امداد، اداره بهزیستی و فرمانداری ویژه رفسنجان
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
                        {toPersianDigits(item.coverageShare)}٪
                      </span>
                    </div>

                    <div id={`population-view-sub-tab-3-vulnerable-groups-9-${idx}`} className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                      <div id={`population-view-sub-tab-3-vulnerable-groups-10-${idx}`}>
                        <span className="text-slate-500 text-[11px] block">تعداد خانوار:</span>
                        <span className="font-bold text-slate-800 font-mono">{formatNumber(item.households)} خانوار</span>
                      </div>
                      <div id={`population-view-sub-tab-3-vulnerable-groups-11-${idx}`}>
                        <span className="text-slate-500 text-[11px] block">جمعیت تحت پوشش:</span>
                        <span className="font-black text-rose-700 font-mono">{formatNumber(item.population)} نفر</span>
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
              <h3 className="font-black text-slate-900 text-lg">ساختار هرم سنی جمعیت شهرستان رفسنجان</h3>
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
                    <span className="font-mono text-slate-400">{toPersianDigits(cohort.percent)}٪</span>
                  </span>
                </div>
                <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl rounded-tr-none border border-slate-200">
                <div id={`population-view-sub-tab-4-age-cohorts-and-6-${index}`} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 text-sm">{cohort.label}</span>
                  <span id={`population-view-sub-tab-4-age-cohorts-and-7-${index}`} className="font-black text-slate-900 font-mono">
                    {formatNumber(cohort.count)} نفر
                  </span>
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
            <span className="font-bold block mb-1">🌟 تحلیل پنجره جمعیتی شهرستان رفسنجان:</span>
            بیش از <strong>۶۹.۳٪ از جمعیت رفسنجان</strong> در سنین فعال کار و جوانی (۱۵ تا ۶۴ سال) قرار دارند. این پنجره جمعیتی طلایی نشان می‌دهد که اولویت شماره یک تخصیص منابع CSR و بودجه عمومی باید معطوف به <strong>تسهیلات اشتغال خرد، رفع موانع ازدواج، تامین مسکن و درمان ناباروری</strong> باشد تا از تله جمعیتی و مهاجرت نخبگان جلوگیری به عمل آید.
          </div>
        </div>      )}
        </div>
      </div>
    </div>
  );
};
