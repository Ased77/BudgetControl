import React, { useState, useMemo } from 'react';
import { LocationData, LocalIndicators } from '../types';
import { toPersianDigits } from '../utils/numberUtils';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Flame,
  Globe2,
  MapPin,
  Building2,
  Info,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Scale
} from 'lucide-react';

export interface SocialHarmIndicatorDef {
  key: keyof LocalIndicators;
  title: string;
  category: 'HARMS_CRIMES' | 'POVERTY_FAMILY' | 'INFRA_HEALTH' | 'ENVIRONMENT_RISK';
  categoryTitle: string;
  unit: string;
  nationalAvg: number; // میانگین رسمی کشوری (مرکز آمار و سازمان بهزیستی ۱۴۰۲-۱۴۰۳)
  provinceAvgs: Record<string, number>; // میانگین‌های استانی
  criticalThreshold: number;
  source: string;
  description: string;
  harmDetails: {
    harmsCovered: string[];
    riskImpact: string;
    csrTarget: string;
  };
}

export const SOCIAL_HARM_BENCHMARKS: SocialHarmIndicatorDef[] = [
  {
    key: 'socialHarmsIndex',
    title: 'شاخص ترکیبی آسیب‌های اجتماعی و جرایم خرد',
    category: 'HARMS_CRIMES',
    categoryTitle: 'آسیب‌های اجتماعی و امنیت',
    unit: 'نمره از ۱۰۰',
    nationalAvg: 38.0,
    provinceAvgs: {
      'کرمان': 48.5,
      'آذربایجان شرقی': 39.0,
      'اصفهان': 36.5,
      'خوزستان': 58.0,
      'سیستان و بلوچستان': 66.0,
    },
    criticalThreshold: 50.0,
    source: 'شورای اجتماعی کشور، سازمان بهزیستی و فراجا ۱۴۰۲',
    description: 'شیوع مصرف مواد صنعتی (شیشه/گل)، الکل، سرقت‌های خرد اموال عمومی و خشونت‌های کلامی/فیزیکی',
    harmDetails: {
      harmsCovered: ['سوءمصرف الکل و مسمومیت متانول', 'اعتیاد به مواد صنعتی', 'سرقت خرد اموال عمومی و شهروندان', 'نزاع‌های خیابانی'],
      riskImpact: 'ایجاد ناامنی روانی، فرار سرمایه‌گذاران، افت بهره‌وری نیروی کار و افزایش هزینه‌های انتظامی',
      csrTarget: 'تجهیز اورژانس مسمومیت و دیالیز، کمپ‌های بازپروری ماده ۱۶، وام خوداشتغالی زندانیان آزادشده',
    },
  },
  {
    key: 'unemploymentRate',
    title: 'نرخ بیکاری جوانان و اقشار آسیب‌پذیر',
    category: 'POVERTY_FAMILY',
    categoryTitle: 'اشتغال و فقر',
    unit: 'درصد',
    nationalAvg: 8.8,
    provinceAvgs: {
      'کرمان': 11.2,
      'آذربایجان شرقی': 9.1,
      'اصفهان': 9.8,
      'خوزستان': 15.6,
      'سیستان و بلوچستان': 16.5,
    },
    criticalThreshold: 14.0,
    source: 'مرکز آمار ایران (طرح آمارگیری نیروی کار سال ۱۴۰۲)',
    description: 'درصد جوانان ۱۵ تا ۲۹ ساله فاقد شغل پایدار در مناطق پیرامونی صنایع و شهرها',
    harmDetails: {
      harmsCovered: ['جذب جوانان به قاچاق سوخت/مواد', 'بیکاری بهبودیافتگان از اعتیاد', 'تکدی‌گری و مشاغل کاذب'],
      riskImpact: 'انباشت نارضایتی اجتماعی، بازگشت مجدد افراد به چرخه جرم و ناپایداری خانوار',
      csrTarget: 'اعطای وام‌های خرد خوداشتغالی، صندوق‌های قرض‌الحسنه و الزام پیمانکاران به جذب بومیان',
    },
  },
  {
    key: 'povertyRate',
    title: 'نرخ فقر و محرومیت معیشتی خانوارها',
    category: 'POVERTY_FAMILY',
    categoryTitle: 'اشتغال و فقر',
    unit: 'درصد',
    nationalAvg: 30.0,
    provinceAvgs: {
      'کرمان': 35.5,
      'آذربایجان شرقی': 28.0,
      'اصفهان': 24.5,
      'خوزستان': 42.0,
      'سیستان و بلوچستان': 58.0,
    },
    criticalThreshold: 40.0,
    source: 'پایگاه اطلاعات رفاه ایرانیان (وزارت تعاون، کار و رفاه اجتماعی)',
    description: 'نسبت خانوارهای واقع در دهک‌های ۱ تا ۳ درآمدی با عدم تکافوی هزینه خوراک و مسکن',
    harmDetails: {
      harmsCovered: ['بحران موالید و ناباروری ناشی از فقر', 'تاخیر در ازدواج', 'سوءتغذیه کودکان و مادران'],
      riskImpact: 'فروپاشی کانون خانواده، ناتوانی در درمان بیماری‌ها و افت تاب‌آوری اجتماعی',
      csrTarget: 'بسته‌های جوانی جمعیت، پوشش هزینه‌های IVF، تامین جهیزیه و بسته‌های معیشتی مددجویان',
    },
  },
  {
    key: 'marginalizationRate',
    title: 'نرخ حاشیه‌نشینی و سکونتگاه‌های غیررسمی',
    category: 'POVERTY_FAMILY',
    categoryTitle: 'اشتغال و فقر',
    unit: 'درصد جمعیت',
    nationalAvg: 22.0,
    provinceAvgs: {
      'کرمان': 28.0,
      'آذربایجان شرقی': 21.0,
      'اصفهان': 19.5,
      'خوزستان': 36.0,
      'سیستان و بلوچستان': 45.0,
    },
    criticalThreshold: 30.0,
    source: 'شرکت بازآفرینی شهری ایران و وزارت راه و شهرسازی',
    description: 'نسبت جمعیت ساکن در بافت‌های ناکارآمد، حاشیه‌ای و بدون سند رسمی شهری',
    harmDetails: {
      harmsCovered: ['تشکیل کلونی‌های جرم‌خیز و فروش مواد', 'عدم انشعاب قانونی آب و برق', 'فقدان ایمنی کالبدی'],
      riskImpact: 'تبعیض زیرساختی، تجمع بزهکاران و گسست هویتی حاشیه‌نشینان از بدنه شهر',
      csrTarget: 'روشنایی معابر، بهسازی آسفالت، احداث خانه‌های امید و خدمات بهداشتی در بافت‌های فرسوده',
    },
  },
  {
    key: 'healthAccessDeficit',
    title: 'کمبود دسترسی درمانی، بهداشت و سلامت روان',
    category: 'INFRA_HEALTH',
    categoryTitle: 'زیرساخت، درمان و آموزش',
    unit: 'شاخص محرومیت از ۱۰۰',
    nationalAvg: 34.0,
    provinceAvgs: {
      'کرمان': 42.0,
      'آذربایجان شرقی': 35.0,
      'اصفهان': 28.0,
      'خوزستان': 46.0,
      'سیستان و بلوچستان': 62.0,
    },
    criticalThreshold: 45.0,
    source: 'معاونت درمان وزارت بهداشت و سازمان نظام پزشکی ۱۴۰۲',
    description: 'کمبود تخت بیمارستانی تخصصی، دستگاه‌های دیالیز، MRI و مراکز روانپزشکی و اورژانس اجتماعی',
    harmDetails: {
      harmsCovered: ['مرگ ناشی از مسمومیت متانول به علت نبود دیالیز سریع', 'خودکشی به دلیل کمبود روانپزشک', 'عوارض بیماری‌های خاص'],
      riskImpact: 'افزایش نرخ مرگ‌ومیر قابل پیشگیری، تحمیل هزینه‌های سنگین درمانی بر دوش خانواده‌ها',
      csrTarget: 'خرید دستگاه‌های دیالیز اضطراری، تجهیز اورژانس و راه‌اندازی خط ۲۴ ساعته مداخله در خودکشی',
    },
  },
  {
    key: 'educationDropOutRate',
    title: 'نرخ ترک تحصیل و آسیب‌های دانش‌آموزی',
    category: 'INFRA_HEALTH',
    categoryTitle: 'زیرساخت، درمان و آموزش',
    unit: 'درصد بازماندگی',
    nationalAvg: 14.2,
    provinceAvgs: {
      'کرمان': 19.5,
      'آذربایجان شرقی': 13.5,
      'اصفهان': 11.0,
      'خوزستان': 24.0,
      'سیستان و بلوچستان': 34.0,
    },
    criticalThreshold: 20.0,
    source: 'شورای عالی آموزش و پرورش و سامانه سناد ۱۴۰۲',
    description: 'درصد دانش‌آموزان دوره متوسطه که به دلایل اقتصادی، اعتیاد والدین یا عدم امکانات ترک تحصیل کرده‌اند',
    harmDetails: {
      harmsCovered: ['کودکان کار و خیابان', 'اغفال نوجوانان در مصرف گل و الکل', 'ازدواج زودهنگام و ناخواسته'],
      riskImpact: 'تولید نسل جدید افراد کم‌سواد و آسیب‌پذیر در برابر باندهای تبهکاری',
      csrTarget: 'طرح مدارس عاری از دخانیات، بورسیه ماهانه دانش‌آموزان نیازمند و هوشمندسازی کلاس‌ها',
    },
  },
  {
    key: 'infrastructureDeficit',
    title: 'کاستی زیرساخت‌های عمرانی، راه‌ها و تنش آبی',
    category: 'INFRA_HEALTH',
    categoryTitle: 'زیرساخت، درمان و آموزش',
    unit: 'شاخص محرومیت از ۱۰۰',
    nationalAvg: 36.0,
    provinceAvgs: {
      'کرمان': 46.0,
      'آذربایجان شرقی': 38.0,
      'اصفهان': 30.0,
      'خوزستان': 55.0,
      'سیستان و بلوچستان': 68.0,
    },
    criticalThreshold: 50.0,
    source: 'شرکت مهندسی آب و فاضلاب کشور و سازمان راهداری ۱۴۰۲',
    description: 'وجود نقاط حادثه‌خیز در راه‌های مواصلاتی، فرسودگی شبکه آبرسانی و ناامنی جاده‌ها',
    harmDetails: {
      harmsCovered: ['تصادفات فوتی جاده‌ای ناشی از نبود روشنایی', 'قطعی و آلودگی آب شرب روستایی', 'مهاجرت اجباری'],
      riskImpact: 'خسارات جانی و مالی سنگین تصادفات، تنش‌های اجتماعی ناشی از کمبود آب',
      csrTarget: 'روشنایی محورهای حادثه‌خیز، حفر چاه و ساخت مخازن بتنی ذخیره آب شرب پایدار',
    },
  },
  {
    key: 'environmentalRiskScore',
    title: 'ریسک آلایندگی صنعتی، پساب و سلامت محیط',
    category: 'ENVIRONMENT_RISK',
    categoryTitle: 'محیط‌زیست و سلامت عمومی',
    unit: 'نمره از ۱۰۰',
    nationalAvg: 40.0,
    provinceAvgs: {
      'کرمان': 65.0,
      'آذربایجان شرقی': 52.0,
      'اصفهان': 68.0,
      'خوزستان': 78.0,
      'سیستان و بلوچستان': 55.0,
    },
    criticalThreshold: 60.0,
    source: 'سازمان حفاظت محیط زیست و سامانه پایش کیفی هوا',
    description: 'میزان انتشار گازهای آلاینده، پساب صنعتی، فرسایش خاک پیرامون صنایع و معادن و گردوغبار',
    harmDetails: {
      harmsCovered: ['بیماری‌های تنفسی و ریوی ساکنان', 'آلودگی سفره‌های آب زیرزمینی', 'تخریب مراتع و پوشش گیاهی'],
      riskImpact: 'کاهش شاخص سلامت همگانی، نارضایتی شدید بومیان نسبت به فعالیت کارخانجات',
      csrTarget: 'ایجاد کمربند سبز حفاظتی، سیستم‌های بازچرخانی پساب و پایش آنلاین آلاینده‌ها',
    },
  },
  {
    key: 'culturalDeficitScore',
    title: 'کمبود نشاط اجتماعی، ورزش و مراکز خانواده',
    category: 'POVERTY_FAMILY',
    categoryTitle: 'اشتغال و فقر',
    unit: 'شاخص کمبود از ۱۰۰',
    nationalAvg: 35.0,
    provinceAvgs: {
      'کرمان': 41.0,
      'آذربایجان شرقی': 34.0,
      'اصفهان': 29.0,
      'خوزستان': 48.0,
      'سیستان و بلوچستان': 59.0,
    },
    criticalThreshold: 45.0,
    source: 'وزارت ورزش و جوانان و سازمان امور اجتماعی کشور',
    description: 'کمبود فضاهای ورزشی استاندارد بانوان، فرهنگسراها، سینما و مراکز مشاوره خانواده و صلح و سازش',
    harmDetails: {
      harmsCovered: ['افزایش نرخ طلاق و اختلافات زناشویی', 'گرایش جوانان به الکل به دلیل فقدان تفریح سالم', 'افسردگی عمومی'],
      riskImpact: 'تزلزل ارکان خانواده، پرخاشگری در جامعه و اتلاف اوقات فراغت جوانان',
      csrTarget: 'مراکز داوری و مشاوره پیش از طلاق با دادگستری، زمین‌های چمن مصنوعی و سالن‌های ورزشی بانوان',
    },
  },
  {
    key: 'crisisVulnerabilityScore',
    title: 'آسیب‌پذیری در برابر بحران‌ها و حوادث طبیعی',
    category: 'ENVIRONMENT_RISK',
    categoryTitle: 'محیط‌زیست و سلامت عمومی',
    unit: 'شاخص ریسک از ۱۰۰',
    nationalAvg: 42.0,
    provinceAvgs: {
      'کرمان': 58.0,
      'آذربایجان شرقی': 48.0,
      'اصفهان': 44.0,
      'خوزستان': 60.0,
      'سیستان و بلوچستان': 65.0,
    },
    criticalThreshold: 55.0,
    source: 'سازمان مدیریت بحران کشور و جمعیت هلال‌احمر',
    description: 'ریسک زلزله، فرونشست زمین، سیلاب‌های فصلی و عدم آمادگی زیرساخت‌های اسکان اضطراری',
    harmDetails: {
      harmsCovered: ['تخریب منازل غیرمقاوم در زلزله', 'نبود پایگاه‌های امداد و نجات جاده‌ای', 'کمبود انبارهای اقلام زیستی'],
      riskImpact: 'آسیب‌پذیری شدید در سوانح و افزایش ابعاد تلفات انسانی',
      csrTarget: 'احداث سوله چندمنظوره بحران، تجهیز پایگاه‌های هلال‌احمر و ذخیره‌سازی اقلام اضطراری',
    },
  },
];

interface ComparativeHarmsTableProps {
  currentLocation: LocationData;
  allLocations?: LocationData[];
  onSelectLocation?: (loc: LocationData) => void;
}

export const ComparativeHarmsTable: React.FC<ComparativeHarmsTableProps> = ({
  currentLocation,
  allLocations,
  onSelectLocation,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [comparisonTarget, setComparisonTarget] = useState<'BOTH' | 'NATIONAL' | 'PROVINCE'>('BOTH');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Current province
  const currentProvince = currentLocation.province;

  // Filter indicators
  const filteredBenchmarks = useMemo(() => {
    return SOCIAL_HARM_BENCHMARKS.filter((item) => {
      const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchSearch =
        !searchFilter ||
        item.title.includes(searchFilter) ||
        item.description.includes(searchFilter) ||
        item.harmDetails.harmsCovered.some((h) => h.includes(searchFilter));
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchFilter]);

  // Summary statistics for current location
  const locationStats = useMemo(() => {
    let worseThanNationalCount = 0;
    let criticalCount = 0;
    let totalLqSum = 0;

    SOCIAL_HARM_BENCHMARKS.forEach((item) => {
      const localVal = currentLocation.indicators[item.key] ?? 0;
      const natVal = item.nationalAvg;
      if (localVal > natVal) worseThanNationalCount++;
      if (localVal >= item.criticalThreshold) criticalCount++;
      totalLqSum += natVal > 0 ? localVal / natVal : 1;
    });

    const avgLq = (totalLqSum / SOCIAL_HARM_BENCHMARKS.length).toFixed(2);

    return {
      worseThanNationalCount,
      criticalCount,
      avgLq,
      totalIndicators: SOCIAL_HARM_BENCHMARKS.length,
    };
  }, [currentLocation]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-right dir-rtl space-y-4 p-4 sm:p-6">
      
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <span>جدول مقایسه‌ای شاخص‌های آسیب اجتماعی و بزه‌ها</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  تحلیل شکاف منطقه‌ای
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                مقایسه هوشمند آمار منطقه جاری با میانگین‌های رسمی استانی ({currentProvince}) و کشوری برای اولویت‌سنجی مصوبات CSR
              </p>
            </div>
          </div>
        </div>

        {/* Current Active Location Badge & Quick Switcher */}
        <div className="flex items-center gap-2 self-start lg:self-auto bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs">
          <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
          <div>
            <span className="text-slate-500 font-medium ml-1">منطقه مبنای مقایسه:</span>
            <strong className="text-slate-800 font-black">
              استان {currentLocation.province} - شهرستان {currentLocation.county} ({currentLocation.district})
            </strong>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-800">شاخص‌های فراتر از میانگین کشور</span>
            <div className="text-lg font-black text-rose-900 mt-0.5">
              {toPersianDigits(locationStats.worseThanNationalCount)} از {toPersianDigits(locationStats.totalIndicators)} شاخص
            </div>
            <span className="text-[10px] text-rose-600">نیازمند مداخله و حمایت CSR</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-200/60 text-rose-700 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5 text-rose-600 animate-pulse" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-800">شاخص‌های در آستانه بحران حاد</span>
            <div className="text-lg font-black text-amber-900 mt-0.5">
              {toPersianDigits(locationStats.criticalCount)} شاخص حساس
            </div>
            <span className="text-[10px] text-amber-700">بالاتر از حد مجاز استاندارد</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-200/60 text-amber-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-800">ضریب تمرکز تجمیعی آسیب‌ها (LQ)</span>
            <div className="text-lg font-black text-indigo-900 mt-0.5">
              {toPersianDigits(locationStats.avgLq)} برابر کشور
            </div>
            <span className="text-[10px] text-indigo-600">تراکم آسیب نسبت به کل ایران</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-200/60 text-indigo-700 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Filter and Control Bars */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
        
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0 ml-1">
            <Filter className="w-3.5 h-3.5" />
            حوزه آسیب:
          </span>
          {[
            { id: 'ALL', label: 'همه شاخص‌ها (۱۰ معیار)' },
            { id: 'HARMS_CRIMES', label: '🛡️ اعتیاد، الکل و جرایم' },
            { id: 'POVERTY_FAMILY', label: '👨‍👩‍👧 فقر، طلاق و جمعیت' },
            { id: 'INFRA_HEALTH', label: '🏥 درمان، راه‌ها و آموزش' },
            { id: 'ENVIRONMENT_RISK', label: '🌳 محیط‌زیست و بحران' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Compare Scope Buttons */}
        <div className="flex items-center gap-2">
          {/* Comparison target toggle */}
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setComparisonTarget('BOTH')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                comparisonTarget === 'BOTH' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هر دو میانگین
            </button>
            <button
              type="button"
              onClick={() => setComparisonTarget('NATIONAL')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                comparisonTarget === 'NATIONAL' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فقط کشوری
            </button>
            <button
              type="button"
              onClick={() => setComparisonTarget('PROVINCE')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                comparisonTarget === 'PROVINCE' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فقط استانی
            </button>
          </div>

          {/* Quick Search */}
          <input
            type="text"
            placeholder="جستجو در شاخص‌ها و آسیب‌ها..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="px-3 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44 sm:w-52"
          />
        </div>
      </div>

      {/* Main Comparative Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
            <tr>
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-3">عنوان شاخص و قلمرو آسیب</th>
              <th className="py-3 px-3 text-center w-28 bg-blue-50/80 text-blue-900 border-x border-blue-200">
                منطقه جاری ({currentLocation.county})
              </th>
              {(comparisonTarget === 'BOTH' || comparisonTarget === 'PROVINCE') && (
                <th className="py-3 px-3 text-center w-28 bg-indigo-50/60 text-indigo-900 border-l border-indigo-100">
                  میانگین استان ({currentProvince})
                </th>
              )}
              {(comparisonTarget === 'BOTH' || comparisonTarget === 'NATIONAL') && (
                <th className="py-3 px-3 text-center w-28 bg-slate-50 text-slate-800 border-l border-slate-200">
                  میانگین کشور
                </th>
              )}
              <th className="py-3 px-3 text-center w-32">شکاف / ضریب تمرکز (LQ)</th>
              <th className="py-3 px-3 text-center w-28">وضعیت بحران</th>
              <th className="py-3 px-3 text-center w-20">جزئیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredBenchmarks.map((item, idx) => {
              const localVal = currentLocation.indicators[item.key] ?? 0;
              const provVal = item.provinceAvgs[currentProvince] ?? (item.nationalAvg * 1.1);
              const natVal = item.nationalAvg;
              
              // Gap calculations
              const diffNat = localVal - natVal;
              const diffNatPct = natVal > 0 ? ((diffNat / natVal) * 100).toFixed(1) : '0';
              const lq = natVal > 0 ? (localVal / natVal).toFixed(2) : '1.00';

              const isHotspot = localVal >= item.criticalThreshold || parseFloat(lq) >= 1.35;
              const isWorseThanNat = diffNat > 0;
              const isWorseThanProv = localVal > provVal;

              const isExpanded = expandedRow === item.key;

              return (
                <React.Fragment key={item.key}>
                  <tr className={`transition-colors hover:bg-slate-50/80 ${isHotspot ? 'bg-rose-50/30' : ''}`}>
                    
                    {/* Index */}
                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                      {toPersianDigits(idx + 1)}
                    </td>

                    {/* Indicator Title & Description */}
                    <td className="py-3 px-3">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <span>{item.title}</span>
                        {isHotspot && (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-0.5">
                            <Flame className="w-3 h-3 text-rose-600" />
                            کانون بحران
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.description}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        منبع: {item.source}
                      </span>
                    </td>

                    {/* Local Value */}
                    <td className="py-3 px-3 text-center bg-blue-50/40 font-black text-sm text-blue-900 border-x border-blue-200">
                      <div className="flex flex-col items-center">
                        <span className="text-base font-black">
                          {toPersianDigits(localVal)}
                        </span>
                        <span className="text-[10px] text-blue-700 font-medium">
                          {item.unit}
                        </span>
                      </div>
                    </td>

                    {/* Province Average */}
                    {(comparisonTarget === 'BOTH' || comparisonTarget === 'PROVINCE') && (
                      <td className="py-3 px-3 text-center bg-indigo-50/30 font-bold text-xs text-indigo-950 border-l border-indigo-100">
                        <div className="flex flex-col items-center">
                          <span>{toPersianDigits(provVal)}</span>
                          <span className="text-[10px] text-slate-400">{item.unit}</span>
                          {localVal !== provVal && (
                            <span className={`text-[10px] font-bold ${
                              isWorseThanProv ? 'text-rose-600' : 'text-emerald-600'
                            }`}>
                              {isWorseThanProv ? '▲ بالاتر از استان' : '▼ پایین‌تر از استان'}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* National Average */}
                    {(comparisonTarget === 'BOTH' || comparisonTarget === 'NATIONAL') && (
                      <td className="py-3 px-3 text-center bg-slate-50/50 font-bold text-xs text-slate-700 border-l border-slate-200">
                        <div className="flex flex-col items-center">
                          <span>{toPersianDigits(natVal)}</span>
                          <span className="text-[10px] text-slate-400">{item.unit}</span>
                        </div>
                      </td>
                    )}

                    {/* Gap / LQ */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          {isWorseThanNat ? (
                            <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span className={`font-black text-xs ${
                            isWorseThanNat ? 'text-rose-700' : 'text-emerald-700'
                          }`}>
                            {toPersianDigits(lq)} برابر
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          ({isWorseThanNat ? '+' : ''}{toPersianDigits(diffNatPct)}٪ نسبت به کشور)
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 text-center">
                      {isHotspot ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-xs">
                          <Flame className="w-3 h-3 text-amber-300" />
                          بحرانی و فوری
                        </span>
                      ) : isWorseThanNat ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          هشدار آسیب
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          پایدار / عادی
                        </span>
                      )}
                    </td>

                    {/* Action: Expand */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setExpandedRow(isExpanded ? null : item.key)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md border border-indigo-200 transition-colors"
                      >
                        {isExpanded ? 'بستن' : 'تحلیل'}
                      </button>
                    </td>

                  </tr>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <tr className="bg-slate-50/90 border-b border-slate-200">
                      <td colSpan={8} className="p-4">
                        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-indigo-600" />
                              <strong className="text-xs font-black text-slate-800">
                                تحلیل تفصیلی مداخله مسئولیت اجتماعی (CSR) برای «{item.title}»
                              </strong>
                            </div>
                            <span className="text-[11px] font-bold text-slate-500">
                              آستانه هشدار بحران کشوری: {toPersianDigits(item.criticalThreshold)} {item.unit}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
                              <span className="font-bold text-rose-900 block mb-1">
                                آسیب‌ها و بزه‌های تحت پوشش:
                              </span>
                              <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                                {item.harmDetails.harmsCovered.map((h, i) => (
                                  <li key={i}>{h}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                              <span className="font-bold text-amber-900 block mb-1">
                                پیامدها و ریسک عدم مداخله:
                              </span>
                              <p className="text-slate-700 text-[11px] leading-relaxed">
                                {item.harmDetails.riskImpact}
                              </p>
                            </div>

                            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                              <span className="font-bold text-indigo-900 block mb-1">
                                اقدام عملیاتی پیشنهادی به کمیته CSR:
                              </span>
                              <p className="text-slate-700 text-[11px] leading-relaxed">
                                {item.harmDetails.csrTarget}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Comparative Legend and Guidelines */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-slate-800">راهنمای علائم:</span>
          <span className="flex items-center gap-1 text-rose-700 font-bold">
            <Flame className="w-3.5 h-3.5" />
            کانون بحران (LQ &gt; ۱.۳۵ یا عبور از مرز بحرانی)
          </span>
          <span className="flex items-center gap-1 text-amber-700 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            هشدار (بالاتر از میانگین کشور)
          </span>
          <span className="flex items-center gap-1 text-emerald-700 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            عادی / مطلوب
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          داده‌های میانگین کشوری و استانی بر اساس آخرین سرشماری و سالنامه‌های آماری ۱۴۰۲-۱۴۰۳ به‌روزرسانی شده‌اند.
        </span>
      </div>

    </div>
  );
};
