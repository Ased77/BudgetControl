import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CsrPriority, SmartRecommendationResult, UserRole } from '../types';
import { formatCurrency, formatNumber, formatLargeBudgetPersian, roundPercentage, toPersianDigits } from '../utils/numberUtils';
import { 
  Lock, Unlock, Sparkles, RefreshCw, RotateCcw, Plus, ShieldAlert, Home, GraduationCap, 
  HeartPulse, Briefcase, Trees, Trophy, AlertTriangle, Users, HelpCircle, Check, AlertCircle, Trash2, Edit2,
  ListChecks, ChevronDown, ChevronUp, FolderTree, Layers, Filter, Search, CheckCircle2, ArrowRight,
  Flame, Globe2, MapPin, ArrowDownUp, Zap, SlidersHorizontal, ShieldCheck, X, Scale,
  Coins, BarChart3, PieChart, FolderKanban, CircleDot
} from 'lucide-react';
import { TableTopicFilters, HARM_TOPIC_FILTERS, HarmTopicFilter } from './TableTopicFilters';

interface PriorityAllocationTableProps {
  priorities: CsrPriority[];
  currentPercentages: Record<string, number>;
  lockedIds: Set<string>;
  totalBudgetToman: number;
  recommendations: SmartRecommendationResult;
  userRole: UserRole;
  onPercentageChange: (priorityId: string, val: number) => void;
  onToggleLock: (priorityId: string) => void;
  onApplySmartRecommendations: () => void;
  onResetToDefault: () => void;
  onAutoRebalance: () => void;
  onAddPriority: (title: string, category: string, description: string, defaultPct: number) => void;
  onDeletePriority: (priorityId: string) => void;
  onOpenCsrDomains?: () => void;
  onOpenComparison?: () => void;
  onOpenCharts?: () => void;
  onOpenProjects?: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldAlert,
  Home,
  GraduationCap,
  HeartPulse,
  Briefcase,
  Trees,
  Trophy,
  AlertTriangle,
  Users,
};

type SmartSortOption = 'DAMAGE_SEVERITY' | 'RECOMMENDED_AI' | 'CURRENT_ALLOCATION' | 'CODE_ASC';
type SmartFilterTier = 'ALL' | 'HOTSPOTS' | 'UNIVERSAL' | 'HIGH_DAMAGE';

export const PriorityAllocationTable: React.FC<PriorityAllocationTableProps> = ({
  priorities,
  currentPercentages,
  lockedIds,
  totalBudgetToman,
  recommendations,
  userRole,
  onPercentageChange,
  onToggleLock,
  onApplySmartRecommendations,
  onResetToDefault,
  onAutoRebalance,
  onAddPriority,
  onDeletePriority,
  onOpenCsrDomains,
  onOpenComparison,
  onOpenCharts,
  onOpenProjects,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('عمران و خدمات');
  const [newDesc, setNewDesc] = useState('');
  const [newPct, setNewPct] = useState(5);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [expandedSubItems, setExpandedSubItems] = useState<Record<string, boolean>>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [showLiveBubbleDock, setShowLiveBubbleDock] = useState<boolean>(false);

  // Smart Filter and Sort State
  const [sortBy, setSortBy] = useState<SmartSortOption>('DAMAGE_SEVERITY');
  const [filterTier, setFilterTier] = useState<SmartFilterTier>('ALL');
  const [isAutoSortEnabled, setIsAutoSortEnabled] = useState<boolean>(true);
  const [smartFeedback, setSmartFeedback] = useState<string | null>(null);

  // Social Harms & Crimes Topic Filter State
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  // Column Specific Filters
  const [headerCategoryFilter, setHeaderCategoryFilter] = useState<string>('ALL');
  const [headerSeverityFilter, setHeaderSeverityFilter] = useState<string>('ALL');
  const [headerPctRangeFilter, setHeaderPctRangeFilter] = useState<string>('ALL');
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [openHeaderMenu, setOpenHeaderMenu] = useState<'TITLE' | 'CATEGORY' | 'SEVERITY' | 'PERCENTAGE' | null>(null);

  // Dropdown Filter State
  const [selectedFilterId, setSelectedFilterId] = useState<string>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setOpenHeaderMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSubItems = (id: string) => {
    setExpandedSubItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const canEdit = userRole === 'ADMIN' || userRole === 'PLANNING_SPECIALIST';

  // Calculate sum
  const totalPercentageSum = priorities.reduce((sum, p) => sum + (currentPercentages[p.id] || 0), 0);
  const roundedSum = roundPercentage(totalPercentageSum);

  // Calculate statistical damage severity and rank for all priorities
  const priorityStatsMap = useMemo(() => {
    const map: Record<string, {
      localDamage: number; // 0-100%
      locationQuotient: number;
      isHotspot: boolean;
      isUniversal: boolean;
      rank: number;
      damageLabel: string;
      damageColor: string;
    }> = {};

    priorities.forEach((p) => {
      const exp = recommendations.explainability[p.id];
      const prev = exp?.prevalence;
      const localDamage = prev?.local ?? exp?.score ?? 35;
      const locationQuotient = prev?.locationQuotient ?? 1;
      const isHotspot = !!exp?.isLocalHotspot;
      const isUniversal = !!exp?.isUniversalSevere;

      let damageLabel = 'آسیب متوسط';
      let damageColor = 'text-amber-700 bg-amber-50 border-amber-200';
      if (isHotspot || localDamage >= 65 || locationQuotient >= 1.4) {
        damageLabel = 'کانون بحران حاد';
        damageColor = 'text-rose-800 bg-rose-50 border-rose-300';
      } else if (isUniversal || localDamage >= 50 || locationQuotient >= 1.2) {
        damageLabel = 'آسیب شدید';
        damageColor = 'text-purple-800 bg-purple-50 border-purple-300';
      } else if (localDamage < 35) {
        damageLabel = 'وضعیت پایدار';
        damageColor = 'text-emerald-800 bg-emerald-50 border-emerald-200';
      }

      map[p.id] = {
        localDamage,
        locationQuotient,
        isHotspot,
        isUniversal,
        rank: 0,
        damageLabel,
        damageColor,
      };
    });

    // Rank by statistical damage in region
    const sortedByDamage = [...priorities].sort((a, b) => {
      const statA = map[a.id];
      const statB = map[b.id];
      const scoreA = (statA.isHotspot ? statA.localDamage * 1.35 : statA.localDamage) + (statA.locationQuotient * 12);
      const scoreB = (statB.isHotspot ? statB.localDamage * 1.35 : statB.localDamage) + (statB.locationQuotient * 12);
      return scoreB - scoreA;
    });

    sortedByDamage.forEach((p, idx) => {
      if (map[p.id]) {
        map[p.id].rank = idx + 1;
      }
    });

    return map;
  }, [priorities, recommendations]);

  // Count metrics for quick filter badges
  const filterCounts = useMemo(() => {
    let hotspots = 0;
    let universals = 0;
    let highDamages = 0;

    priorities.forEach((p) => {
      const stat = priorityStatsMap[p.id];
      if (stat?.isHotspot) hotspots++;
      if (stat?.isUniversal) universals++;
      if ((stat?.localDamage ?? 0) >= 45 || (stat?.locationQuotient ?? 1) >= 1.2) highDamages++;
    });

    return { hotspots, universals, highDamages };
  }, [priorities, priorityStatsMap]);

  // Filtered & Sorted priorities based on smart options
  const visiblePriorities = useMemo(() => {
    let list = [...priorities];

    // 1. Filter by Social Harms & Crimes Topic Filter
    if (selectedTopicId) {
      const topicObj = HARM_TOPIC_FILTERS.find((t) => t.id === selectedTopicId);
      if (topicObj) {
        list = list.filter((p) => {
          if (topicObj.codes.includes(p.code)) return true;
          const text = `${p.title} ${p.category} ${p.description} ${p.subItems?.join(' ') || ''}`.toLowerCase();
          return topicObj.keywords.some((kw) => text.includes(kw.toLowerCase()));
        });
      }
    }

    // 2. Filter by Category (Header Filter or Main Dropdown)
    if (headerCategoryFilter !== 'ALL') {
      list = list.filter((p) => p.category === headerCategoryFilter);
    } else if (selectedFilterId !== 'ALL') {
      list = list.filter((p) => p.id === selectedFilterId || p.category.includes(selectedFilterId));
    }

    // 3. Filter by Header Search Text
    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.trim().toLowerCase();
      list = list.filter((p) => 
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.subItems?.some(s => s.toLowerCase().includes(q))
      );
    }

    // 4. Filter by Severity / Damage Tier
    if (headerSeverityFilter === 'HOTSPOT') {
      list = list.filter((p) => priorityStatsMap[p.id]?.isHotspot);
    } else if (headerSeverityFilter === 'UNIVERSAL') {
      list = list.filter((p) => priorityStatsMap[p.id]?.isUniversal);
    } else if (headerSeverityFilter === 'HIGH') {
      list = list.filter((p) => (priorityStatsMap[p.id]?.localDamage ?? 0) >= 50);
    } else if (headerSeverityFilter === 'MEDIUM') {
      list = list.filter((p) => (priorityStatsMap[p.id]?.localDamage ?? 0) >= 35 && (priorityStatsMap[p.id]?.localDamage ?? 0) < 50);
    } else if (headerSeverityFilter === 'STABLE') {
      list = list.filter((p) => (priorityStatsMap[p.id]?.localDamage ?? 0) < 35);
    } else if (filterTier === 'HOTSPOTS') {
      list = list.filter((p) => priorityStatsMap[p.id]?.isHotspot);
    } else if (filterTier === 'UNIVERSAL') {
      list = list.filter((p) => priorityStatsMap[p.id]?.isUniversal);
    } else if (filterTier === 'HIGH_DAMAGE') {
      list = list.filter((p) => (priorityStatsMap[p.id]?.localDamage ?? 0) >= 45 || (priorityStatsMap[p.id]?.locationQuotient ?? 1) >= 1.2);
    }

    // 5. Filter by Percentage Range
    if (headerPctRangeFilter === 'GT_12') {
      list = list.filter((p) => (currentPercentages[p.id] || 0) >= 12);
    } else if (headerPctRangeFilter === 'MID_8_12') {
      list = list.filter((p) => (currentPercentages[p.id] || 0) >= 8 && (currentPercentages[p.id] || 0) < 12);
    } else if (headerPctRangeFilter === 'LT_8') {
      list = list.filter((p) => (currentPercentages[p.id] || 0) < 8);
    }

    // 6. Sort list
    const sorted = [...list];
    if (sortBy === 'DAMAGE_SEVERITY' || isAutoSortEnabled) {
      sorted.sort((a, b) => {
        const rankA = priorityStatsMap[a.id]?.rank ?? 99;
        const rankB = priorityStatsMap[b.id]?.rank ?? 99;
        return rankA - rankB;
      });
    } else if (sortBy === 'RECOMMENDED_AI') {
      sorted.sort((a, b) => (recommendations.scores[b.id] || 0) - (recommendations.scores[a.id] || 0));
    } else if (sortBy === 'CURRENT_ALLOCATION') {
      sorted.sort((a, b) => (currentPercentages[b.id] || 0) - (currentPercentages[a.id] || 0));
    } else if (sortBy === 'CODE_ASC') {
      sorted.sort((a, b) => a.code - b.code);
    }

    return sorted;
  }, [
    priorities, 
    selectedTopicId, 
    headerCategoryFilter, 
    tableSearchQuery, 
    headerSeverityFilter, 
    headerPctRangeFilter, 
    selectedFilterId, 
    filterTier, 
    sortBy, 
    isAutoSortEnabled, 
    priorityStatsMap, 
    recommendations, 
    currentPercentages
  ]);

  // Dropdown list options filtered by search text
  const filteredDropdownOptions = useMemo(() => {
    if (!dropdownSearch.trim()) return priorities;
    const q = dropdownSearch.trim().toLowerCase();
    return priorities.filter((p) => 
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.subItems?.some(s => s.toLowerCase().includes(q))
    );
  }, [priorities, dropdownSearch]);

  // Find currently active priority object for dropdown display
  const activeSelectedPriority = useMemo(() => {
    if (selectedFilterId === 'ALL') return null;
    return priorities.find((p) => p.id === selectedFilterId);
  }, [priorities, selectedFilterId]);

  // Distinct categories for column filter
  const allCategories = useMemo(() => {
    return Array.from(new Set(priorities.map((p) => p.category))).filter(Boolean);
  }, [priorities]);

  const activeFiltersCount = (selectedTopicId ? 1 : 0) + 
    (headerCategoryFilter !== 'ALL' ? 1 : 0) + 
    (headerSeverityFilter !== 'ALL' ? 1 : 0) + 
    (headerPctRangeFilter !== 'ALL' ? 1 : 0) + 
    (tableSearchQuery.trim() ? 1 : 0);

  const handleResetAllFilters = () => {
    setSelectedTopicId(null);
    setHeaderCategoryFilter('ALL');
    setHeaderSeverityFilter('ALL');
    setHeaderPctRangeFilter('ALL');
    setTableSearchQuery('');
    setSelectedFilterId('ALL');
    setFilterTier('ALL');
    setOpenHeaderMenu(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddPriority(newTitle, newCategory, newDesc, newPct);
    setShowAddModal(false);
    setNewTitle('');
    setNewDesc('');
  };

  return (
    <div className="space-y-4" ref={headerMenuRef}>
      
      {/* 1. Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Approved CSR Budget */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">بودجه کل مصوب CSR</span>
            <span className="text-base font-black text-slate-900 mt-0.5 block dir-rtl font-mono">
              {formatLargeBudgetPersian(totalBudgetToman)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">سال مالی ۱۴۰۳ - کل شهرستان رفسنجان</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Allocation Balance Status */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">وضعیت توازن بودجه</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-base font-black font-mono ${
                roundedSum === 100 ? 'text-emerald-700' : roundedSum > 100 ? 'text-rose-700' : 'text-amber-700'
              }`}>
                {toPersianDigits(roundedSum)}٪ تخصیص
              </span>
              {roundedSum === 100 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                  متوازن
                </span>
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                  {roundedSum < 100 ? `${toPersianDigits(roundPercentage(100 - roundedSum))}٪ مانده` : 'مازاد'}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              تخصیص‌یافته: {formatCurrency(Math.round((totalBudgetToman * roundedSum) / 100), 'TOMAN', true)}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            roundedSum === 100 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
              : 'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Prioritized CSR Domains */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">سرفصل‌های مسئولیت اجتماعی</span>
            <span className="text-base font-black text-slate-900 mt-0.5 block">
              {toPersianDigits(priorities.length)} حوزه کلان مصوب
            </span>
            <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-500" />
              {toPersianDigits(filterCounts.hotspots)} کانون بحران حاد در رفسنجان
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <FolderTree className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Action Projects */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">پروژه‌های اجرایی عام‌المنفعه</span>
            <span className="text-base font-black text-slate-900 mt-0.5 block">
              ۱۲ پروژه میدانی فعال
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">آب شرب، درمان، حاشیه‌نشینی، اشتغال</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <FolderKanban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Main Table Container */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        
        {/* Executive Header Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-50/70 border-b border-slate-200 space-y-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Title and Active Filter Tag */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-800">جدول تخصیص و اولویت‌بندی بودجه CSR</h2>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  ({toPersianDigits(visiblePriorities.length)} سرفصل)
                </span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleResetAllFilters}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    <span>حذف {toPersianDigits(activeFiltersCount)} فیلتر فعال</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
                تعیین سهم بودجه مسئولیت اجتماعی به تفکیک ۱۱ رسته کلان، کانون‌های آسیب‌پذیری و پروژه‌های رفسنجان
              </p>
            </div>

            {/* Main Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => {
                  onApplySmartRecommendations();
                  setSmartFeedback('پیشنهاد هوشمند الگوریتمی AI بر اساس آمارهای محرومیت منطقه با موفقیت اعمال گردید.');
                  setTimeout(() => setSmartFeedback(null), 3500);
                }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-all"
                title="تخصیص خودکار سهم‌ها با ضریب محرومیت و اولویت‌های منطقه"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>اعمال پیشنهاد هوشمند AI</span>
              </button>

              <button
                onClick={() => {
                  onAutoRebalance();
                  setSmartFeedback('موازنه‌سازی دقیق ۱۰۰٪ مجموع تخصیص‌ها انجام شد.');
                  setTimeout(() => setSmartFeedback(null), 3500);
                }}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                title="تنظیم خودکار سرجمع بودجه بر روی ۱۰۰٪"
              >
                <RefreshCw className="w-3 h-3" />
                <span>موازنه‌سازی ۱۰۰٪</span>
              </button>

              <button
                onClick={() => {
                  onResetToDefault();
                  setSmartFeedback('درصدها به مقادیر اولیه بازنشانی شدند.');
                  setTimeout(() => setSmartFeedback(null), 3500);
                }}
                title="بازنشانی درصدها به مقادیر اولیه"
                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 bg-white border border-slate-200 rounded-lg transition-all flex items-center justify-center group active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 transition-transform group-hover:-rotate-180 duration-300" />
              </button>

              {/* Collapsible Advanced Filters Toggle Button */}
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  showAdvancedFilters || activeFiltersCount > 0
                    ? 'bg-indigo-50 text-indigo-900 border-indigo-300 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                title="مشاهده فیلترهای تفکیکی آسیب‌ها، جرایم و کانون‌های بحران"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span>فیلترهای پیشرفته آسیب‌ها</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {toPersianDigits(activeFiltersCount)}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </button>

              {/* Live Bubble Chart Synchronized Dock Toggle */}
              <button
                type="button"
                onClick={() => setShowLiveBubbleDock(!showLiveBubbleDock)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  showLiveBubbleDock
                    ? 'bg-purple-50 text-purple-900 border-purple-300 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                title="مشاهده همزمان و زنده نمودار حبابی حین تغییر درصدهای بودجه"
              >
                <CircleDot className="w-3.5 h-3.5 text-purple-600" />
                <span>نمودار حبابی زنده</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showLiveBubbleDock ? 'rotate-180' : ''}`} />
              </button>

              {canEdit && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن اولویت</span>
                </button>
              )}
            </div>

          </div>

          {/* Live Synchronized Bubble Chart Dock in Dashboard */}
          {showLiveBubbleDock && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-lg space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-indigo-800/40">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <CircleDot className="w-4 h-4 text-purple-400" />
                      <h4 className="font-black text-sm text-white">
                        پیش‌نمایش زنده نمودار حبابی (ارتباط شاخص محرومیت و تخصیص بودجه)
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        هماهنگ‌سازی بلادرنگ فعال
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      با تغییر اسلایدرها یا درصدهای جدول زیر، حباب‌های متناظر بلافاصله به صورت انیمیشنی جابه‌جا و تغییر سایز می‌دهند.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenCharts && (
                    <button
                      type="button"
                      onClick={onOpenCharts}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm active:scale-95"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>مشاهده تفصیلی در تب نمودارها</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowLiveBubbleDock(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                    title="بستن پیش‌نمایش"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mini Interactive Bubble Chart SVG */}
              <div className="h-64 w-full relative bg-slate-950/60 rounded-xl p-3 border border-indigo-500/20 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 800 240" preserveAspectRatio="none">
                  {/* 4 Quadrants Background Tint */}
                  {/* Top-Right: High Deprivation + High Budget (Optimal) */}
                  <rect x="420" y="20" width="360" height="95" fill="rgba(16, 185, 129, 0.08)" rx="6" />
                  {/* Bottom-Right: High Deprivation + Low Budget (Deficit Warning) */}
                  <rect x="420" y="125" width="360" height="95" fill="rgba(244, 63, 94, 0.08)" rx="6" />
                  {/* Top-Left: Low Deprivation + High Budget (Preventative) */}
                  <rect x="60" y="20" width="350" height="95" fill="rgba(59, 130, 246, 0.06)" rx="6" />
                  {/* Bottom-Left: Low Deprivation + Low Budget (Stable) */}
                  <rect x="60" y="125" width="350" height="95" fill="rgba(148, 163, 184, 0.04)" rx="6" />

                  {/* Benchmark Grid & Axes */}
                  {/* X Benchmark line: Deprivation 45% (x=420) */}
                  <line x1="420" y1="15" x2="420" y2="225" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
                  <text x="425" y="25" fill="#fda4af" fontSize="9" fontWeight="bold">مرز بحران آسیب (۴۵٪)</text>

                  {/* Y Benchmark line: Budget 8.5% (y=120) */}
                  <line x1="55" y1="120" x2="785" y2="120" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
                  <text x="65" y="115" fill="#c7d2fe" fontSize="9" fontWeight="bold">میانگین تخصیص متوازن (۸.۵٪)</text>

                  {/* Quadrant Watermark Labels */}
                  <text x="760" y="35" textAnchor="end" fill="#34d399" fontSize="10" fontWeight="bold" opacity="0.85">پوشش بهینه کانون‌های بحران</text>
                  <text x="760" y="210" textAnchor="end" fill="#f87171" fontSize="10" fontWeight="bold" opacity="0.85">⚠️ هشدار کسری بودجه</text>
                  <text x="70" y="35" fill="#60a5fa" fontSize="10" fontWeight="bold" opacity="0.7">سرمایه‌گذاری زیربنایی</text>
                  <text x="70" y="210" fill="#94a3b8" fontSize="10" fontWeight="bold" opacity="0.7">پایداری متناسب</text>

                  {/* Bubbles with CSS Transition */}
                  {priorities.map((p) => {
                    const currentPct = currentPercentages[p.id] ?? p.defaultPercentage;
                    const prev = recommendations.explainability[p.id]?.prevalence;
                    const deprivation = prev ? prev.local : (p.weightFactor ? p.weightFactor * 10 : 35);
                    const isHotspot = Boolean(recommendations.explainability[p.id]?.isLocalHotspot);
                    const isUniversal = Boolean(recommendations.explainability[p.id]?.isUniversalSevere);

                    // Map X: 10% to 75% -> 80px to 760px
                    const cx = Math.max(80, Math.min(760, 80 + ((deprivation - 10) / 65) * 680));
                    // Map Y: 0% to 22% -> 215px down to 30px (inverted)
                    const cy = Math.max(30, Math.min(215, 215 - (currentPct / 22) * 185));
                    // Map Radius: 10px to 26px
                    const budgetToman = Math.round((totalBudgetToman * currentPct) / 100);
                    const radius = Math.max(10, Math.min(26, Math.round(10 + (budgetToman / totalBudgetToman) * 65)));

                    const bubbleFill = isHotspot ? '#e11d48' : isUniversal ? '#9333ea' : '#3b82f6';

                    return (
                      <g key={`live-dock-bubble-${p.id}`} className="cursor-pointer group">
                        <circle
                          cx={cx}
                          cy={cy}
                          r={radius}
                          fill={bubbleFill}
                          fillOpacity={0.85}
                          stroke="#ffffff"
                          strokeWidth={isHotspot ? 2.5 : 1.5}
                          style={{
                            transition: 'cx 650ms cubic-bezier(0.34, 1.4, 0.64, 1), cy 650ms cubic-bezier(0.34, 1.4, 0.64, 1), r 650ms cubic-bezier(0.34, 1.4, 0.64, 1)',
                            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))'
                          }}
                        />
                        <text
                          x={cx}
                          y={cy + 3.5}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize={radius >= 16 ? 9.5 : 8}
                          fontWeight="bold"
                          pointerEvents="none"
                          style={{
                            transition: 'x 650ms cubic-bezier(0.34, 1.4, 0.64, 1), y 650ms cubic-bezier(0.34, 1.4, 0.64, 1)',
                            textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                          }}
                        >
                          {toPersianDigits(currentPct)}٪
                        </text>
                        {/* Title text hover tooltip tag */}
                        <title>{`کد ${toPersianDigits(p.code)} - ${p.title} | بودجه: ${toPersianDigits(currentPct)}٪ (${formatCurrency(budgetToman, 'TOMAN', true)}) | شدت آسیب: ${toPersianDigits(deprivation)}٪`}</title>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Realtime Feedback Alert */}
          {smartFeedback && (
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center justify-between text-xs animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="font-bold">{smartFeedback}</span>
              </div>
              <button onClick={() => setSmartFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Compact Control Bar: Search + Sorting + Category Select */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                type="text"
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                placeholder="جستجو در نام سرفصل، شرح یا اقدامات..."
                className="w-full pl-7 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium placeholder:text-slate-400"
              />
              {tableSearchQuery && (
                <button
                  onClick={() => setTableSearchQuery('')}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Selectors: Sort & Category */}
            <div className="flex items-center gap-2 flex-wrap">
              
              {/* Category Dropdown */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-500 font-medium hidden md:inline">دسته‌بندی:</span>
                <select
                  value={headerCategoryFilter}
                  onChange={(e) => setHeaderCategoryFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="ALL">همه دسته‌ها ({toPersianDigits(priorities.length)})</option>
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-500 font-medium hidden md:inline">مرتب‌سازی:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SmartSortOption);
                    if (e.target.value === 'DAMAGE_SEVERITY') {
                      setIsAutoSortEnabled(true);
                    } else {
                      setIsAutoSortEnabled(false);
                    }
                  }}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="DAMAGE_SEVERITY">🔴 شدت آسیب در منطقه (بحران در صدر)</option>
                  <option value="RECOMMENDED_AI">🤖 بیشترین سهم پیشنهادی هوشمند AI</option>
                  <option value="CURRENT_ALLOCATION">💰 بیشترین درصد بودجه تخصیصی</option>
                  <option value="CODE_ASC">🔢 ترتیب کد سرفصل‌ها (۱ تا ۱۱)</option>
                </select>
              </div>

            </div>

          </div>

          {/* Slim Multi-Color Allocation Progress Bar */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>نوار توزیع سهم‌ها بر روی ۱۰۰٪ بودجه کل</span>
              <span className={`font-mono font-bold ${roundedSum === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                مجموع: {toPersianDigits(roundedSum)}٪
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
              {priorities.map((p, idx) => {
                const pct = currentPercentages[p.id] || 0;
                if (pct <= 0) return null;
                const colors = [
                  'bg-blue-600', 'bg-emerald-600', 'bg-amber-500', 'bg-indigo-600', 
                  'bg-rose-500', 'bg-teal-600', 'bg-purple-600', 'bg-orange-500', 'bg-cyan-600'
                ];
                return (
                  <div
                    key={p.id}
                    style={{ width: `${(pct / Math.max(100, roundedSum)) * 100}%` }}
                    className={`${colors[idx % colors.length]} transition-all duration-300`}
                    title={`${p.title}: ${toPersianDigits(pct)}٪`}
                  />
                );
              })}
            </div>
          </div>

        </div>

        {/* 3. Collapsible Advanced Filters Drawer (Hidden by default to keep dashboard clean) */}
        {showAdvancedFilters && (
          <div className="p-3.5 bg-slate-100/90 border-b border-slate-200 space-y-3 animate-in fade-in duration-200">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  فیلترهای پیشرفته و کانون‌های بحران رفسنجان
                </span>
                <span className="text-[10px] text-slate-500">
                  (انتخاب بر اساس نرخ آسیب، فراگیری و موضوعات اجتماعی)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(false)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <span>بستن پنل</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Severity Ranking Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterTier('ALL')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  filterTier === 'ALL'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-2xs font-black'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>همه سرفصل‌ها</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 font-mono">
                  {toPersianDigits(priorities.length)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTier('HOTSPOTS')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  filterTier === 'HOTSPOTS'
                    ? 'bg-rose-600 text-white border-rose-400 shadow-2xs font-black'
                    : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                }`}
              >
                <Flame className="w-3 h-3 text-rose-500" />
                <span>فقط کانون‌های بحران محلی</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-rose-100 text-rose-800 font-mono font-bold">
                  {toPersianDigits(filterCounts.hotspots)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTier('UNIVERSAL')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  filterTier === 'UNIVERSAL'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-2xs font-black'
                    : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                }`}
              >
                <Globe2 className="w-3 h-3 text-purple-500" />
                <span>فراگیری بحرانی همه‌جانبه</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-purple-100 text-purple-800 font-mono font-bold">
                  {toPersianDigits(filterCounts.universals)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTier('HIGH_DAMAGE')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  filterTier === 'HIGH_DAMAGE'
                    ? 'bg-amber-600 text-white border-amber-400 shadow-2xs font-black'
                    : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>آسیب‌های حاد منطقه (بالای ۴۵٪)</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-mono font-bold">
                  {toPersianDigits(filterCounts.highDamages)}
                </span>
              </button>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="mr-auto text-[10px] font-bold text-rose-600 hover:underline"
                >
                  پاکسازی همه فیلترها
                </button>
              )}
            </div>

            {/* Social Harms Topic Filter Pills */}
            <div className="pt-2 border-t border-slate-200/80">
              <TableTopicFilters
                selectedTopicId={selectedTopicId}
                onSelectTopic={setSelectedTopicId}
                activeCount={visiblePriorities.length}
              />
            </div>

          </div>
        )}

        {/* 4. Main Priorities Table */}
        <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px] select-none">
            <tr>
              {/* Col 1: Lock */}
              <th className="py-2.5 px-2 text-center w-10">قفل</th>

              {/* Col 2: Title & Actions & Search Filter */}
              <th className="py-2.5 px-3 relative">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span>عنوان سرفصل، رتبه بحران و اقدامات اجرایی</span>
                    {tableSearchQuery && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block animate-ping" />
                    )}
                  </div>
                  <div className="relative inline-flex items-center">
                    <input
                      type="text"
                      placeholder="فیلتر در عناوین..."
                      value={tableSearchQuery}
                      onChange={(e) => setTableSearchQuery(e.target.value)}
                      className="w-28 sm:w-36 px-2 py-0.5 text-[10px] bg-white border border-slate-300 rounded font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {tableSearchQuery && (
                      <button
                        onClick={() => setTableSearchQuery('')}
                        className="absolute left-1 text-slate-400 hover:text-slate-700 p-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              </th>

              {/* Col 3: Category Filter */}
              <th className="py-2.5 px-2 text-center w-28 hidden md:table-cell relative">
                <div className="inline-flex items-center gap-1 justify-center">
                  <span>دسته</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenHeaderMenu(openHeaderMenu === 'CATEGORY' ? null : 'CATEGORY');
                      }}
                      className={`p-1 rounded transition-colors ${
                        headerCategoryFilter !== 'ALL' 
                          ? 'bg-indigo-600 text-white font-bold' 
                          : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-200'
                      }`}
                      title="فیلتر بر اساس دسته‌بندی موضوعی"
                    >
                      <Filter className="w-3 h-3" />
                    </button>

                    {openHeaderMenu === 'CATEGORY' && (
                      <div 
                        className="absolute top-full left-0 sm:right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-1.5 w-44 text-right space-y-1 text-[10px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="font-bold text-slate-800 pb-1 border-b border-slate-100 flex items-center justify-between">
                          <span>فیلتر دسته</span>
                          {headerCategoryFilter !== 'ALL' && (
                            <button
                              onClick={() => setHeaderCategoryFilter('ALL')}
                              className="text-[9px] text-rose-600 hover:underline"
                            >
                              حذف فیلتر
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setHeaderCategoryFilter('ALL');
                            setOpenHeaderMenu(null);
                          }}
                          className={`w-full p-1 rounded text-right flex items-center justify-between ${
                            headerCategoryFilter === 'ALL' ? 'bg-indigo-50 font-bold text-indigo-900' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span>همه دسته‌ها</span>
                          {headerCategoryFilter === 'ALL' && <Check className="w-3 h-3 text-indigo-600" />}
                        </button>
                        {allCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setHeaderCategoryFilter(cat);
                              setOpenHeaderMenu(null);
                            }}
                            className={`w-full p-1 rounded text-right flex items-center justify-between ${
                              headerCategoryFilter === cat ? 'bg-indigo-50 font-bold text-indigo-900' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span className="truncate">{cat}</span>
                            {headerCategoryFilter === cat && <Check className="w-3 h-3 text-indigo-600" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </th>

              {/* Col 4: Severity & Damage Filter */}
              <th className="py-2.5 px-2 text-center w-36 relative">
                <div className="inline-flex items-center gap-1 justify-center">
                  <span>شدت آسیب در منطقه</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenHeaderMenu(openHeaderMenu === 'SEVERITY' ? null : 'SEVERITY');
                      }}
                      className={`p-1 rounded transition-colors ${
                        headerSeverityFilter !== 'ALL' 
                          ? 'bg-rose-600 text-white font-bold' 
                          : 'text-slate-500 hover:text-rose-600 hover:bg-slate-200'
                      }`}
                      title="فیلتر بر اساس درجه آسیب و بحران منطقه"
                    >
                      <Filter className="w-3 h-3" />
                    </button>

                    {openHeaderMenu === 'SEVERITY' && (
                      <div 
                        className="absolute top-full left-0 sm:right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-1.5 w-48 text-right space-y-1 text-[10px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="font-bold text-slate-800 pb-1 border-b border-slate-100 flex items-center justify-between">
                          <span>فیلتر سطح بحران</span>
                          {headerSeverityFilter !== 'ALL' && (
                            <button
                              onClick={() => setHeaderSeverityFilter('ALL')}
                              className="text-[9px] text-rose-600 hover:underline"
                            >
                              حذف فیلتر
                            </button>
                          )}
                        </div>
                        {[
                          { id: 'ALL', label: 'همه سطوح آسیب' },
                          { id: 'HOTSPOT', label: '🔥 فقط کانون‌های بحران محلی' },
                          { id: 'UNIVERSAL', label: '🌐 فراگیری همه‌جانبه کشوری/استانی' },
                          { id: 'HIGH', label: '🔴 آسیب شدید (بالای ۵۰٪)' },
                          { id: 'MEDIUM', label: '🟡 آسیب متوسط (۳۵ تا ۵۰٪)' },
                          { id: 'STABLE', label: '🟢 وضعیت پایدار (زیر ۳۵٪)' },
                        ].map((sev) => (
                          <button
                            key={sev.id}
                            type="button"
                            onClick={() => {
                              setHeaderSeverityFilter(sev.id);
                              setOpenHeaderMenu(null);
                            }}
                            className={`w-full p-1 rounded text-right flex items-center justify-between ${
                              headerSeverityFilter === sev.id ? 'bg-rose-50 font-bold text-rose-950' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span>{sev.label}</span>
                            {headerSeverityFilter === sev.id && <Check className="w-3 h-3 text-rose-600" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </th>

              {/* Col 5: Percentage & Allocation Range Filter */}
              <th className="py-2.5 px-2 text-center w-40 relative">
                <div className="inline-flex items-center gap-1 justify-center">
                  <span>تنظیم سهم (درصد)</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenHeaderMenu(openHeaderMenu === 'PERCENTAGE' ? null : 'PERCENTAGE');
                      }}
                      className={`p-1 rounded transition-colors ${
                        headerPctRangeFilter !== 'ALL' 
                          ? 'bg-blue-600 text-white font-bold' 
                          : 'text-slate-500 hover:text-blue-600 hover:bg-slate-200'
                      }`}
                      title="فیلتر بر اساس بازه درصد تخصیص یافته"
                    >
                      <Filter className="w-3 h-3" />
                    </button>

                    {openHeaderMenu === 'PERCENTAGE' && (
                      <div 
                        className="absolute top-full left-0 sm:right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-1.5 w-44 text-right space-y-1 text-[10px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="font-bold text-slate-800 pb-1 border-b border-slate-100 flex items-center justify-between">
                          <span>فیلتر درصد سهم</span>
                          {headerPctRangeFilter !== 'ALL' && (
                            <button
                              onClick={() => setHeaderPctRangeFilter('ALL')}
                              className="text-[9px] text-rose-600 hover:underline"
                            >
                              حذف فیلتر
                            </button>
                          )}
                        </div>
                        {[
                          { id: 'ALL', label: 'همه مقادیر' },
                          { id: 'GT_12', label: 'سهم عمده (۱۲٪ و بالاتر)' },
                          { id: 'MID_8_12', label: 'سهم متوسط (۸٪ تا ۱۲٪)' },
                          { id: 'LT_8', label: 'سهم خرد (زیر ۸٪)' },
                        ].map((range) => (
                          <button
                            key={range.id}
                            type="button"
                            onClick={() => {
                              setHeaderPctRangeFilter(range.id);
                              setOpenHeaderMenu(null);
                            }}
                            className={`w-full p-1 rounded text-right flex items-center justify-between ${
                              headerPctRangeFilter === range.id ? 'bg-blue-50 font-bold text-blue-950' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span>{range.label}</span>
                            {headerPctRangeFilter === range.id && <Check className="w-3 h-3 text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </th>

              {/* Col 6: Smart AI Recommendation */}
              <th className="py-2.5 px-2 text-center w-28 hidden sm:table-cell">پیشنهاد هوشمند</th>

              {/* Col 7: Amount Toman */}
              <th className="py-2.5 px-3 text-left w-36">مبلغ (تومان)</th>

              {/* Col 8: Amount Rial */}
              <th className="py-2.5 px-2 text-left w-32 hidden xl:table-cell">مبلغ (ریال)</th>

              {/* Col 9: Actions */}
              {canEdit && <th className="py-2.5 px-2 text-center w-10">عملیات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {visiblePriorities.map((p) => {
              const isLocked = lockedIds.has(p.id);
              const currentPct = currentPercentages[p.id] || 0;
              const smartPct = recommendations.scores[p.id] || p.defaultPercentage;
              const delta = roundPercentage(currentPct - smartPct);
              const amountToman = Math.round((totalBudgetToman * currentPct) / 100);
              const amountRial = amountToman * 10;
              const IconComp = ICON_MAP[p.iconName] || HelpCircle;
              const explainInfo = recommendations.explainability[p.id];
              const isSingleFiltered = selectedFilterId === p.id;
              const priorityStat = priorityStatsMap[p.id];
              const isTopDamageRank = priorityStat?.rank <= 3;

              return (
                <tr 
                  key={p.id} 
                  className={`hover:bg-blue-50/40 transition-colors ${
                    isLocked 
                      ? 'bg-slate-50/80' 
                      : isSingleFiltered 
                        ? 'bg-indigo-50/30' 
                        : isTopDamageRank && sortBy === 'DAMAGE_SEVERITY'
                          ? 'bg-rose-50/20'
                          : ''
                  }`}
                >
                  
                  {/* Lock Toggle Button */}
                  <td className="py-2 px-1 text-center">
                    <button
                      onClick={() => onToggleLock(p.id)}
                      title={isLocked ? 'باز کردن قفل' : 'قفل کردن سهم در موازنه‌سازی'}
                      className={`p-1 rounded border transition-colors ${
                        isLocked 
                          ? 'bg-amber-100 text-amber-800 border-amber-300' 
                          : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-600'
                      }`}
                    >
                      {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>
                  </td>

                  {/* Priority Title & Info */}
                  <td className="py-2 px-3">
                    <div className="flex items-start gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        priorityStat?.isHotspot 
                          ? 'bg-rose-100 text-rose-700' 
                          : priorityStat?.isUniversal 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-50 text-blue-700'
                      }`}>
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                          
                          {/* Code number badge */}
                          <span className="w-4 h-4 rounded bg-indigo-100 text-indigo-800 text-[10px] font-black flex items-center justify-center shrink-0">
                            {toPersianDigits(p.code)}
                          </span>

                          <span className="truncate">{p.title}</span>
                          
                          {/* Damage Rank Badge */}
                          {priorityStat && (
                            <span 
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                priorityStat.rank === 1
                                  ? 'bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-400/50'
                                  : priorityStat.rank <= 3
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                              title={`رتبه شدت آسیب در منطقه: ${priorityStat.rank} از ۱۱ سرفصل`}
                            >
                              <span>رتبه بحران:</span>
                              <strong className="font-mono">{toPersianDigits(priorityStat.rank)}</strong>
                            </span>
                          )}

                          {explainInfo?.isLocalHotspot && (
                            <span 
                              className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded text-[9px] font-bold"
                              title="کانون بحران محلی: شدت آسیب در منطقه بالاتر از میانگین کشور است و در اولویت ۱ قرار گرفته است"
                            >
                              <Flame className="w-2.5 h-2.5 text-rose-600" />
                              کانون بحران محلی
                            </span>
                          )}

                          {explainInfo?.isUniversalSevere && (
                            <span 
                              className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded text-[9px] font-bold"
                              title="فراگیری بحرانی همه‌جانبه: کشوری، استانی، شهرستانی و منطقه‌ای"
                            >
                              <Globe2 className="w-2.5 h-2.5 text-purple-600" />
                              فراگیری همه‌جانبه
                            </span>
                          )}

                          <button
                            onClick={() => setActiveTooltip(activeTooltip === p.id ? null : p.id)}
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                            title="مشاهده استدلال و نسبت‌سنجی آماری ۴ سطحی"
                          >
                            <HelpCircle className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {p.description}
                        </p>

                        {/* Sub-Items Badge & Accordion */}
                        {p.subItems && p.subItems.length > 0 && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => toggleSubItems(p.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80 px-2 py-0.5 rounded transition-colors"
                            >
                              <ListChecks className="w-3 h-3 text-indigo-600" />
                              <span>{toPersianDigits(p.subItems.length)} اقدام اجرایی</span>
                              {expandedSubItems[p.id] ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>

                            {/* Sub-Items List */}
                            {expandedSubItems[p.id] && (
                              <div className="mt-2 p-2.5 bg-slate-50 border border-indigo-100 rounded-lg space-y-1.5 shadow-2xs">
                                <div className="flex items-center justify-between pb-1 border-b border-slate-200 text-[10px] font-bold text-slate-700">
                                  <span>اقدامات تفکیکی ذیل «{p.category}»:</span>
                                  <span className="text-slate-400 font-normal">
                                    {toPersianDigits(p.subItems.length)} عنوان اقدام
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                  {p.subItems.map((sub, idx) => (
                                    <div 
                                      key={idx} 
                                      className="p-1.5 rounded bg-white border border-slate-200 text-[10px] text-slate-700 flex items-start gap-1.5"
                                    >
                                      <span className="w-3.5 h-3.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                        {toPersianDigits(idx + 1)}
                                      </span>
                                      <span className="leading-tight">{sub}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Expandable Explanation Popover with 4-Level Diagnostics */}
                        {activeTooltip === p.id && explainInfo && (
                          <div className="mt-1.5 p-3 bg-slate-900 text-slate-100 text-[11px] rounded-xl shadow-xl border border-slate-800 space-y-2 max-w-xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                              <div className="font-bold text-amber-300 flex items-center gap-1 text-xs">
                                <Sparkles className="w-3.5 h-3.5" />
                                نسبت‌سنجی آماری ۴ سطحی و استدلال هوشمند:
                              </div>
                              {explainInfo.prevalence && (
                                <span className="text-[10px] text-slate-400">
                                  LQ: {toPersianDigits(explainInfo.prevalence.locationQuotient)}x
                                </span>
                              )}
                            </div>

                            {explainInfo.prevalence && (
                              <div className="grid grid-cols-4 gap-1.5 text-[9px] bg-slate-800/80 p-2 rounded-lg text-center">
                                <div className="p-1 bg-slate-700/60 rounded">
                                  <div className="text-slate-400">۱. کشوری</div>
                                  <div className="font-bold text-white mt-0.5">{toPersianDigits(explainInfo.prevalence.national)}</div>
                                </div>
                                <div className="p-1 bg-slate-700/60 rounded">
                                  <div className="text-slate-400">۲. استانی</div>
                                  <div className="font-bold text-indigo-300 mt-0.5">{toPersianDigits(explainInfo.prevalence.provincial)}</div>
                                </div>
                                <div className="p-1 bg-slate-700/60 rounded">
                                  <div className="text-slate-400">۳. شهرستانی</div>
                                  <div className="font-bold text-blue-300 mt-0.5">{toPersianDigits(explainInfo.prevalence.county)}</div>
                                </div>
                                <div className={`p-1 rounded ${explainInfo.isLocalHotspot ? 'bg-rose-900/60 text-rose-200 font-bold' : 'bg-slate-700/60 text-emerald-300'}`}>
                                  <div className="text-slate-300">۴. کانون محلی</div>
                                  <div className="font-bold mt-0.5">{toPersianDigits(explainInfo.prevalence.local)}</div>
                                </div>
                              </div>
                            )}

                            <p className="text-slate-300 leading-relaxed text-[10px]">
                              {explainInfo.rationale}
                            </p>
                            
                            {explainInfo.prevalence?.divergenceDescription && (
                              <p className="text-amber-200/90 text-[10px] bg-amber-950/40 p-1.5 rounded border border-amber-900/50">
                                <strong>ارزیابی فراگیری:</strong> {explainInfo.prevalence.divergenceDescription}
                              </p>
                            )}

                            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[9px] text-slate-400">
                              {explainInfo.keyMetrics.map((m, i) => (
                                <span key={i} className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                  {m.label}: <strong className="text-white">{toPersianDigits(m.value)}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-2 px-2 text-center hidden md:table-cell">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
                      {p.category}
                    </span>
                  </td>

                  {/* Real Statistical Damage / Vulnerability Column */}
                  <td className="py-2 px-2 text-center">
                    {priorityStat && (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-between w-full max-w-[120px] text-[10px]">
                          <span className={`px-1.5 py-0.2 rounded border font-extrabold ${priorityStat.damageColor}`}>
                            {priorityStat.damageLabel}
                          </span>
                          <span className="font-mono font-black text-slate-800">
                            {toPersianDigits(priorityStat.localDamage)}٪
                          </span>
                        </div>
                        {/* Mini visual damage progress bar */}
                        <div className="w-full max-w-[120px] bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              priorityStat.isHotspot || priorityStat.localDamage >= 65
                                ? 'bg-rose-600'
                                : priorityStat.isUniversal || priorityStat.localDamage >= 45
                                  ? 'bg-purple-600'
                                  : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(10, priorityStat.localDamage))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Slider & Percentage Input */}
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="0.5"
                        disabled={!canEdit || isLocked}
                        value={currentPct}
                        onChange={(e) => onPercentageChange(p.id, parseFloat(e.target.value))}
                        className="w-16 accent-blue-600 cursor-pointer disabled:opacity-40"
                      />
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          disabled={!canEdit || isLocked}
                          value={currentPct}
                          onChange={(e) => onPercentageChange(p.id, parseFloat(e.target.value) || 0)}
                          className="w-12 text-center font-extrabold bg-slate-50 border border-slate-300 rounded py-0.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 font-mono"
                        />
                        <span className="mr-0.5 text-slate-500 font-bold text-[10px]">٪</span>
                      </div>
                    </div>
                  </td>

                  {/* AI Recommendation Preview */}
                  <td className="py-2 px-2 text-center hidden sm:table-cell">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px] font-mono">
                        {toPersianDigits(smartPct)}٪
                      </span>
                      {delta !== 0 && (
                        <span className={`text-[9px] mt-0.5 font-bold ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {delta > 0 ? `+${toPersianDigits(delta)}٪` : `${toPersianDigits(delta)}٪`}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Allocated Amount Toman */}
                  <td className="py-2 px-3 text-left font-extrabold text-slate-900 dir-rtl text-xs font-mono">
                    {formatCurrency(amountToman, 'TOMAN', true)}
                  </td>

                  {/* Allocated Amount Rial */}
                  <td className="py-2 px-2 text-left hidden xl:table-cell text-slate-400 text-[10px] dir-rtl font-mono">
                    {formatCurrency(amountToman, 'RIAL', true)}
                  </td>

                  {/* Delete Action */}
                  {canEdit && (
                    <td className="py-2 px-1 text-center">
                      <button
                        onClick={() => onDeletePriority(p.id)}
                        title="حذف این اولویت"
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>

      {/* 5. Executive Quick Navigation Cards to Other Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {onOpenCharts && (
          <button
            type="button"
            onClick={onOpenCharts}
            className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-right transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-blue-100">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 block">نمودارها و تحلیل بصری</span>
                <span className="text-[10px] text-slate-400">توزیع بخشی، مقایسه AI، تحلیل بودجه</span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-1 transition-transform rotate-180" />
          </button>
        )}

        {onOpenComparison && (
          <button
            type="button"
            onClick={onOpenComparison}
            className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-right transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-rose-100">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 block">جدول مقایسه‌ای آسیب‌ها</span>
                <span className="text-[10px] text-slate-400">مقایسه نرخ رفسنجان با استان و کشور</span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-1 transition-transform rotate-180" />
          </button>
        )}

        {onOpenProjects && (
          <button
            type="button"
            onClick={onOpenProjects}
            className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-right transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-purple-100">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 block">پروژه‌های اجرایی میدانی</span>
                <span className="text-[10px] text-slate-400">۱۲ پروژه محرومیت‌زدایی و پیشرفت فیزیکی</span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-1 transition-transform rotate-180" />
          </button>
        )}

        {onOpenCsrDomains && (
          <button
            type="button"
            onClick={onOpenCsrDomains}
            className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-right transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-indigo-100">
                <FolderTree className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 block">عناوین و اقدامات CSR</span>
                <span className="text-[10px] text-slate-400">ساختار درختی ۱۱ حوزه و اقدامات تفصیلی</span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-1 transition-transform rotate-180" />
          </button>
        )}
      </div>

      {/* Add Priority Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">افزودن اولویت جدید مسئولیت اجتماعی</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان اولویت محلی</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: توسعه نیروگاه خورشیدی محلی"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">دسته‌بندی موضوعی</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="عمران و خدمات">عمران و خدمات</option>
                  <option value="اجتماعی و روانی">اجتماعی و روانی</option>
                  <option value="آموزش و توانمندسازی">آموزش و توانمندسازی</option>
                  <option value="سلامت و بهداشت">سلامت و بهداشت</option>
                  <option value="محیط زیست">محیط زیست</option>
                  <option value="اشتغال و معیشت">اشتغال و معیشت</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">توضیح مختصر</label>
                <textarea
                  rows={2}
                  placeholder="شرح هدف این اولویت در منطقه..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">درصد اولیه پیشنهادی (٪)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newPct}
                  onChange={(e) => setNewPct(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700"
                >
                  ثبت اولویت جدید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
