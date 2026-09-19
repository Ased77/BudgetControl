import React, { useState, useRef, useEffect } from 'react';
import { toPersianDigits } from '../utils/numberUtils';
import { Filter, X, ChevronDown, ChevronUp, Sparkles, Check, Search, Layers } from 'lucide-react';

export interface HarmTopicFilter {
  id: string;
  label: string;
  emoji: string;
  category: string;
  codes: number[];
  keywords: string[];
  description: string;
}

export const HARM_TOPIC_FILTERS: HarmTopicFilter[] = [
  {
    id: 'ALCOHOL_METHANOL',
    label: 'مسمومیت الکل و متانول',
    emoji: '🍷',
    category: 'سلامت و فوریت‌ها',
    codes: [4],
    keywords: ['الکل', 'متانول', 'مسمومیت', 'دیالیز'],
    description: 'تجهیز بخش اورژانس، دیالیز و درمان فوری مسمومیت‌های حاد متانول',
  },
  {
    id: 'DIVORCE_FAMILY',
    label: 'طلاق و تحکیم خانواده',
    emoji: '💔',
    category: 'خانواده و نشاط',
    codes: [6],
    keywords: ['طلاق', 'داوری', 'مشاوره', 'خانواده', 'همسر'],
    description: 'مراکز تخصصی داوری و مشاوره پیش از طلاق و دوره‌های مهارت زندگی',
  },
  {
    id: 'POPULATION_YOUTH',
    label: 'جوانی جمعیت و ناباروری',
    emoji: '👶',
    category: 'جمعیت و خانواده',
    codes: [3],
    keywords: ['ناباروری', 'IVF', 'جمعیت', 'فرزندآوری', 'ازدواج', 'جهیزیه'],
    description: 'پوشش کامل هزینه‌های درمان ناباروری IVF، وام فرزندآوری و جهیزیه',
  },
  {
    id: 'ADDICTION_DETOX',
    label: 'ترک اعتیاد و مواد صنعتی',
    emoji: '💊',
    category: 'سلامت و آسیب‌ها',
    codes: [4, 3],
    keywords: ['اعتیاد', 'شیشه', 'گل', 'سم‌زدایی', 'ماده ۱۶', 'کمپ'],
    description: 'کلینیک‌های سم‌زدایی مواد صنعتی (شیشه/گل) و کمپ‌های بازپروری ماده ۱۶',
  },
  {
    id: 'CRIME_REHAB',
    label: 'بزهکاری، سرقت خرد و زندانیان',
    emoji: '🛡️',
    category: 'امنیت و توانمندسازی',
    codes: [2, 3],
    keywords: ['زندانیان', 'سرقت', 'بزهکاری', 'بهبودیافتگان', 'خوداشتغالی'],
    description: 'اشتغال و وام‌های خوداشتغالی به بهبودیافتگان برای قطع چرخه جرم و سرقت',
  },
  {
    id: 'MENTAL_HEALTH_SUICIDE',
    label: 'سلامت روان و خودکشی',
    emoji: '🧠',
    category: 'سلامت روان',
    codes: [4],
    keywords: ['خودکشی', 'روانشناختی', 'افسردگی', 'بحران', 'خط مداخله'],
    description: 'مرکز جامع سلامت روان و خط شبانه‌روزی مداخله فوری در بحران خودکشی',
  },
  {
    id: 'ROADS_ACCIDENTS',
    label: 'تصادفات و نقاط حادثه‌خیز',
    emoji: '🚗',
    category: 'زیرساخت و ایمنی',
    codes: [1],
    keywords: ['جاده', 'نقاط حادثه‌خیز', 'روشنایی', 'تصادفات', 'مواصلاتی'],
    description: 'اصلاح نقاط حادثه‌خیز، روشنایی محورها و بهسازی راه‌های مواصلاتی',
  },
  {
    id: 'WATER_STRESS',
    label: 'تنش آب شرب پایدار',
    emoji: '💧',
    category: 'عمران و آب',
    codes: [1],
    keywords: ['آب', 'تنش آبی', 'چاه', 'مخزن', 'آبرسانی'],
    description: 'آبرسانی شرب پایدار، حفر چاه و مخازن ذخیره روستاهای همجوار',
  },
  {
    id: 'SCHOOLS_PREVENTION',
    label: 'پیشگیری در مدارس و ترک تحصیل',
    emoji: '🏫',
    category: 'آموزش و توانمندسازی',
    codes: [7],
    keywords: ['مدارس', 'ترک تحصیل', 'دانش‌آموزان', 'سواد رسانه‌ای', 'بورسیه'],
    description: 'طرح مدارس عاری از دخانیات و الکل، آموزش نه گفتن و بورسیه تحصیلی',
  },
  {
    id: 'INFORMAL_SETTLEMENTS',
    label: 'سکونتگاه‌های غیررسمی و حاشیه',
    emoji: '🏘️',
    category: 'عدالت اجتماعی',
    codes: [10],
    keywords: ['حاشیه‌نشینی', 'سکونتگاه', 'بافت فرسوده', 'خانه‌های امید'],
    description: 'بهسازی معابر، روشنایی و ساماندهی بافت‌های ناکارآمد و جرم‌خیز',
  },
  {
    id: 'ENVIRONMENT_POLLUTION',
    label: 'محیط‌زیست و آلایندگی',
    emoji: '🌳',
    category: 'محیط زیست',
    codes: [5],
    keywords: ['آلایندگی', 'کمربند سبز', 'پسماند', 'پساب', 'ریزگرد'],
    description: 'تصفیه پساب صنعتی، کاشت کمربند سبز و پایش برخط هوا و ریزگردها',
  },
  {
    id: 'CRISIS_RESILIENCE',
    label: 'مدیریت بحران و امداد',
    emoji: '🆘',
    category: 'ایمنی و امداد',
    codes: [9],
    keywords: ['بحران', 'سوله', 'هلال‌احمر', 'آتش‌نشانی', 'اسکان اضطراری'],
    description: 'احداث سوله مدیریت بحران و تجهیز پایگاه‌های امداد و نجات',
  },
  {
    id: 'LOCAL_GOVERNANCE',
    label: 'شفافیت و نظارت محلی',
    emoji: '🏛️',
    category: 'حکمرانی',
    codes: [8],
    keywords: ['شفافیت', 'شورا', 'نظارت', 'کارگروه', 'معتمدان'],
    description: 'کارگروه‌های تخصصی رصد آسیب‌ها و سامانه شفافیت هزینه‌کرد CSR',
  },
  {
    id: 'INNOVATION_TECH',
    label: 'فناوری و دانش‌بنیان',
    emoji: '💡',
    category: 'فناوری',
    codes: [11],
    keywords: ['دانش‌بنیان', 'نوآوری', 'استارتاپ', 'پایش هوشمند'],
    description: 'حمایت از فناوری‌های بومی و اپلیکیشن‌های پیشگیری از آسیب‌های اجتماعی',
  },
];

interface TableTopicFiltersProps {
  selectedTopicId: string | null;
  onSelectTopic: (topicId: string | null) => void;
  activeCount: number;
}

export const TableTopicFilters: React.FC<TableTopicFiltersProps> = ({
  selectedTopicId,
  onSelectTopic,
  activeCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTopic = HARM_TOPIC_FILTERS.find((t) => t.id === selectedTopicId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter topics by search term
  const filteredTopics = HARM_TOPIC_FILTERS.filter((topic) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return (
      topic.label.toLowerCase().includes(term) ||
      topic.category.toLowerCase().includes(term) ||
      topic.description.toLowerCase().includes(term) ||
      topic.keywords.some((kw) => kw.toLowerCase().includes(term))
    );
  });

  return (
    <div id="table-topic-filters-root" className="relative w-full" ref={dropdownRef}>
      {/* Dropdown Header Trigger */}
      <div id="table-topic-filters-dropdown-header-trigger" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-md">
        
        {/* Left side label & Trigger Button */}
        <div id="table-topic-filters-left-side-label-trigger-button" className="flex items-center gap-2.5 flex-1">
          <div id="table-topic-filters-left-side-label-trigger-button-2" className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center text-xs shrink-0">
            <Filter className="w-4 h-4" />
          </div>
          
          <div id="table-topic-filters-left-side-label-trigger-button-3" className="flex-1">
            <div id="table-topic-filters-left-side-label-trigger-button-4" className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-100">
                فیلتر موضوعی آسیب‌ها و نیازهای منطقه:
              </span>
              <span className="text-[10px] text-slate-400">
                (۱۴ محور تخصصی آسیب‌های اجتماعی، سلامت و عمران)
              </span>
            </div>
            
            {/* Active selection summary */}
            <div id="table-topic-filters-active-selection-summary" className="text-xs mt-1 flex items-center gap-2">
              {activeTopic ? (
                <div id="table-topic-filters-active-selection-summary-2" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-600/60 to-blue-600/60 border border-indigo-400/40 text-indigo-100 font-bold text-[11px]">
                  <span>{activeTopic.emoji}</span>
                  <span>{activeTopic.label}</span>
                  <span className="text-[10px] text-indigo-300 font-mono">
                    ({toPersianDigits(activeCount)} سرفصل تطبیقی)
                  </span>
                </div>
              ) : (
                <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  همه موارد فعال هستند ({toPersianDigits(activeCount)} سرفصل)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dropdown Action Buttons */}
        <div id="table-topic-filters-dropdown-action-buttons" className="flex items-center gap-2 self-end sm:self-auto">
          {selectedTopicId && (
            <button
              type="button"
              onClick={() => onSelectTopic(null)}
              className="text-[11px] font-bold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>حذف فیلتر</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`text-xs font-black px-3.5 py-1.5 rounded-lg border transition-all flex items-center gap-2 shadow-sm ${
              isOpen
                ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/40'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-300" />
            <span>{isOpen ? 'بستن منوی کشویی' : 'انتخاب از لیست کشویی آسیب‌ها'}</span>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-indigo-200" />
            ) : (
              <ChevronDown className="w-4 h-4 text-indigo-300" />
            )}
          </button>
        </div>

      </div>

      {/* Active Filter Operational Description Banner (when closed but filter selected) */}
      {!isOpen && activeTopic && (
        <div id="table-topic-filters-active-filter-operational" className="mt-1.5 p-2.5 rounded-lg bg-indigo-950/70 border border-indigo-800/60 text-[11px] text-indigo-200 flex items-center justify-between shadow-xs">
          <div id="table-topic-filters-active-filter-operational-2" className="flex items-center gap-2">
            <span className="text-base">{activeTopic.emoji}</span>
            <span><strong>تمرکز عملیاتی فیلتر فعال:</strong> {activeTopic.description}</span>
          </div>
          <span className="text-[10px] text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700/50">
            حوزه: {activeTopic.category}
          </span>
        </div>
      )}

      {/* Collapsible / Dropdown Menu Container */}
      {isOpen && (
        <div id="table-topic-filters-collapsible-dropdown-menu" className="absolute top-full left-0 right-0 mt-2 bg-slate-900 text-white rounded-xl border border-slate-700 shadow-2xl z-50 p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Dropdown Header with Search */}
          <div id="table-topic-filters-dropdown-header-with-search" className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div id="table-topic-filters-dropdown-header-with-search-2" className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">
                انتخاب سرفصل آسیب برای فیلتر جدول:
              </span>
              <span className="text-[10px] text-slate-400">
                ({toPersianDigits(filteredTopics.length)} موضوع)
              </span>
            </div>

            <div id="table-topic-filters-dropdown-header-with-search-3" className="relative flex-1 max-w-xs">
              <input
                type="text"
                placeholder="جستجو در موضوعات و آسیب‌ها..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                onClick={(e) => e.stopPropagation()}
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>
          </div>

          {/* Quick "All Items" Option */}
          <div id="table-topic-filters-quick-all-items-option">
            <button
              type="button"
              onClick={() => {
                onSelectTopic(null);
                setIsOpen(false);
              }}
              className={`w-full text-right p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                selectedTopicId === null
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md font-black'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div id="table-topic-filters-quick-all-items-option-2" className="flex items-center gap-2">
                <span className="text-base">🌐</span>
                <div id="table-topic-filters-quick-all-items-option-3">
                  <div id="table-topic-filters-quick-all-items-option-4" className="text-xs font-extrabold">نمایش همه سرفصل‌ها و پروژه‌ها (بدون فیلتر)</div>
                  <div id="table-topic-filters-quick-all-items-option-5" className="text-[10px] text-slate-300 mt-0.5">
                    نمایش کامل تمامی کدهای تخصیص بودجه و اولویت‌های مصوب
                  </div>
                </div>
              </div>
              {selectedTopicId === null && <Check className="w-4 h-4 text-white" />}
            </button>
          </div>

          {/* Grid List of Topics in the Dropdown */}
          <div id="table-topic-filters-grid-list-of-topics-in-the" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
            {filteredTopics.map((topic) => {
              const isSelected = selectedTopicId === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => {
                    onSelectTopic(isSelected ? null : topic.id);
                    setIsOpen(false);
                  }}
                  className={`text-right p-2.5 rounded-lg border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-300 shadow-md font-black ring-2 ring-indigo-400/40'
                      : 'bg-slate-800/90 text-slate-200 border-slate-700/80 hover:bg-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div id={`table-topic-filters-grid-list-of-topics-in-the-2-${topic.id}`} className="flex items-start justify-between gap-1.5 w-full">
                    <div id={`table-topic-filters-grid-list-of-topics-in-the-3-${topic.id}`} className="flex items-center gap-2">
                      <span className="text-base shrink-0">{topic.emoji}</span>
                      <span className="text-xs font-bold leading-tight">{topic.label}</span>
                    </div>
                    {isSelected ? (
                      <Check className="w-4 h-4 text-white shrink-0" />
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-400 font-mono shrink-0">
                        کد {topic.codes.map((c) => toPersianDigits(c)).join('، ')}
                      </span>
                    )}
                  </div>

                  <p className={`text-[10px] mt-1.5 line-clamp-2 leading-relaxed ${
                    isSelected ? 'text-indigo-100' : 'text-slate-400'
                  }`}>
                    {topic.description}
                  </p>

                  <div id={`table-topic-filters-grid-list-of-topics-in-the-4-${topic.id}`} className="mt-2 pt-1 border-t border-slate-700/50 flex items-center justify-between text-[9px]">
                    <span className={isSelected ? 'text-indigo-200' : 'text-slate-400'}>
                      حوزه: {topic.category}
                    </span>
                    <span className="text-amber-300/90 font-medium">
                      کلیک جهت فیلتر
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer note inside dropdown */}
          <div id="table-topic-filters-footer-note-inside-dropdown" className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-400">
            <span>با انتخاب هر گزینه، جدول بر اساس سرفصل‌ها و کلمات کلیدی آن آسیب فیلتر می‌شود.</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-indigo-400 hover:text-indigo-200 font-bold px-2 py-0.5"
            >
              بستن منو ✕
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
