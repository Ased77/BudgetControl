import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  FolderTree, 
  Search, 
  Tag, 
  Building2, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X, 
  Sparkles, 
  MapPin, 
  Filter, 
  ListFilter
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { CsrPriority } from '../types';
import { toPersianDigits, formatCurrency } from '../utils/numberUtils';
import { useConfirmDelete } from './ConfirmDeleteModal';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { HelpTooltip } from './HelpTooltip';

export const CsrDomainsCatalogView: React.FC = () => {
  const { 
    priorities, 
    currentPercentages, 
    orgConfig, 
    selectedLocation, 
    handleAddSubItem, 
    handleDeleteSubItem, 
    handleAddPriority, 
    projects,
    handleAddProject,
    setActiveTab
  } = useAppContext();

  // Active selected CSR Domain ID (defaults to 'p1' or first domain)
  const [selectedDomainId, setSelectedDomainId] = useState<string>(priorities[0]?.id || 'p1');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [subItemSearch, setSubItemSearch] = useState('');
  
  // View mode: 'DROPDOWN' (dropdown select + detail view) or 'ACCORDION' (expandable list)
  const [displayMode, setDisplayMode] = useState<'DROPDOWN' | 'ACCORDION'>('DROPDOWN');
  const [expandedAccordionIds, setExpandedAccordionIds] = useState<Record<string, boolean>>({
    [priorities[0]?.id || 'p1']: true
  });

  const { confirmDelete, modal: deleteConfirmModal } = useConfirmDelete();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modals state
  const [showAddSubItemModal, setShowAddSubItemModal] = useState(false);
  const [targetDomainForSubItem, setTargetDomainForSubItem] = useState<CsrPriority | null>(null);
  const [newSubItemText, setNewSubItemText] = useState('');
  
  const [showAddDomainModal, setShowAddDomainModal] = useState(false);
  const [newDomainTitle, setNewDomainTitle] = useState('');
  const [newDomainCategory, setNewDomainCategory] = useState('');
  const [newDomainDesc, setNewDomainDesc] = useState('');
  const [newDomainPct, setNewDomainPct] = useState(5);

  // Quick project conversion modal
  const [projectSubItem, setProjectSubItem] = useState<{ domain: CsrPriority; subItem: string } | null>(null);
  const [projTitle, setProjTitle] = useState('');
  const [projCostToman, setProjCostToman] = useState(2_500_000_000);
  const [projExecutor, setProjExecutor] = useState('');
  const [projBeneficiaries, setProjBeneficiaries] = useState(1500);

  // Modal refs — clicking the dimmed backdrop closes each modal.
  const subItemModalRef = useRef<HTMLDivElement>(null);
  const addDomainModalRef = useRef<HTMLDivElement>(null);
  const convertModalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(subItemModalRef, () => {
    setShowAddSubItemModal(false);
    setTargetDomainForSubItem(null);
  });
  useOutsideClick(addDomainModalRef, () => setShowAddDomainModal(false));
  useOutsideClick(convertModalRef, () => setProjectSubItem(null));

  // Find currently active domain
  const activeDomain = useMemo(() => {
    return priorities.find((p) => p.id === selectedDomainId) || priorities[0];
  }, [priorities, selectedDomainId]);

  // Filtered domains in dropdown search
  const filteredDropdownDomains = useMemo(() => {
    if (!dropdownSearch.trim()) return priorities;
    const q = dropdownSearch.trim().toLowerCase();
    return priorities.filter((p) => 
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.subItems?.some(s => s.toLowerCase().includes(q))
    );
  }, [priorities, dropdownSearch]);

  // Filtered sub-items based on search in active domain
  const filteredSubItems = useMemo(() => {
    if (!activeDomain?.subItems) return [];
    if (!subItemSearch.trim()) return activeDomain.subItems;
    return activeDomain.subItems.filter((item) => 
      item.toLowerCase().includes(subItemSearch.trim().toLowerCase())
    );
  }, [activeDomain, subItemSearch]);

  // Statistics
  const totalSubItemsCount = useMemo(() => {
    return priorities.reduce((acc, p) => acc + (p.subItems?.length || 0), 0);
  }, [priorities]);

  // Count projects mapped to the active priority
  const activeDomainProjects = useMemo(() => {
    if (!activeDomain) return [];
    return projects.filter((proj) => proj.priorityId === activeDomain.id);
  }, [projects, activeDomain]);

  // Toggle accordion item
  const toggleAccordion = (id: string) => {
    setExpandedAccordionIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Handle adding new sub-item
  const onSaveSubItem = (e: React.FormEvent) => {
    e.preventDefault();
    const domain = targetDomainForSubItem || activeDomain;
    if (!newSubItemText.trim() || !domain) return;
    handleAddSubItem(domain.id, newSubItemText.trim());
    setNewSubItemText('');
    setShowAddSubItemModal(false);
    setTargetDomainForSubItem(null);
  };

  // Handle adding new domain
  const onSaveNewDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainTitle.trim()) return;
    handleAddPriority(
      newDomainTitle.trim(),
      newDomainCategory.trim() || 'عمومی و محلی',
      newDomainDesc.trim() || `عنوان مسئولیت اجتماعی جدید برای منطقه ${selectedLocation.province} - ${selectedLocation.county}`,
      newDomainPct
    );
    setNewDomainTitle('');
    setNewDomainCategory('');
    setNewDomainDesc('');
    setShowAddDomainModal(false);
  };

  // Open Project conversion modal
  const handleOpenProjectModal = (domain: CsrPriority, subItem: string) => {
    setProjectSubItem({ domain, subItem });
    setProjTitle(`پروژه ${subItem} در ${selectedLocation.city} و بخش ${selectedLocation.district}`);
    setProjExecutor(`شهرداری / اداره کل مجری در ${selectedLocation.county}`);
  };

  // Save converted executive project
  const handleSaveProjectFromSubItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectSubItem) return;
    handleAddProject({
      priorityId: projectSubItem.domain.id,
      priorityTitle: projectSubItem.domain.title,
      title: projTitle,
      province: selectedLocation.province,
      county: selectedLocation.county,
      district: selectedLocation.district,
      targetArea: `${selectedLocation.city} - ${selectedLocation.district}`,
      estimatedCostToman: Number(projCostToman),
      csrSharePercentage: 100,
      csrFundedAmountToman: Number(projCostToman),
      beneficiariesCount: Number(projBeneficiaries),
      status: 'APPROVED',
      executorAgency: projExecutor || 'پیمانکار ذی‌صلاح محلی',
      startYear: 1403,
      endYear: 1404,
      durationMonths: 12,
      progressPercentage: 0,
      currentYearAllocatedToman: Number(projCostToman),
      futureYearsAllocatedToman: 0,
      description: `تعریف شده از زیرمجموعه «${projectSubItem.subItem}» تحت عنوان کلان «${projectSubItem.domain.title}»`,
    });
    setProjectSubItem(null);
    setActiveTab('PROJECTS');
  };

  return (
    <div id="csr-domains-catalog-view-root" className="space-y-6">
      {/* Top Banner & Header Summary (Light Theme) */}
      <div id="csr-domains-catalog-view-top-banner-header-summary-light" className="bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-indigo-200/80 shadow-2xs relative overflow-hidden">
        <div id="csr-domains-catalog-view-top-banner-header-summary-light-2" className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div id="csr-domains-catalog-view-top-banner-header-summary-light-3" className="space-y-2">
            <div id="csr-domains-catalog-view-top-banner-header-summary-light-4" className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200">
                <FolderTree className="w-6 h-6 text-indigo-600" />
              </span>
              <div id="csr-domains-catalog-view-top-banner-header-summary-light-5">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  مدیریت عناوین و زیرمجموعه‌های مسئولیت اجتماعی (CSR Taxonomy)
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  انتخاب هوشمند از منوی کشویی دراپ‌دان و مشاهده اقدامات اجرایی هر حوزه (عمرانی، فرهنگی، سلامت، اشتغال و...)
                </p>
              </div>
            </div>
          </div>

          <div id="csr-domains-catalog-view-top-banner-header-summary-light-6" className="flex items-center gap-3 flex-wrap">
            <div id="csr-domains-catalog-view-top-banner-header-summary-light-7" className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 flex items-center gap-3 text-xs shadow-2xs">
              <div id="csr-domains-catalog-view-top-banner-header-summary-light-8">
                <span className="text-slate-500 block text-[10px]">عناوین مسئولیت اجتماعی:</span>
                <span className="font-bold text-slate-800 text-sm">{toPersianDigits(priorities.length)} سرفصل</span>
              </div>
              <div id="csr-domains-catalog-view-top-banner-header-summary-light-9" className="w-px h-6 bg-slate-200" />
              <div id="csr-domains-catalog-view-top-banner-header-summary-light-10">
                <span className="text-slate-500 block text-[10px]">مجموع زیرمجموعه‌ها:</span>
                <span className="font-bold text-emerald-700 text-sm">{toPersianDigits(totalSubItemsCount)} اقدام</span>
              </div>
            </div>

            <button
              onClick={() => setShowAddDomainModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-md shadow-indigo-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن سرفصل جدید</span>
            </button>
          </div>
        </div>
      </div>

      {/* DROPDOWN SELECTOR CONTAINER */}
      <div id="csr-domains-catalog-view-dropdown-selector-container" className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div id="csr-domains-catalog-view-dropdown-selector-container-2" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div id="csr-domains-catalog-view-dropdown-selector-container-3" className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <div id="csr-domains-catalog-view-dropdown-selector-container-4">
              <h2 className="text-sm font-bold text-slate-900">
                انتخاب حوزه مسئولیت اجتماعی از دراپ‌دان لیست:
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                با انتخاب هر گزینه (عمرانی، فرهنگی، سلامت و...)، لیست اقدامات همان حوزه باز می‌شود
              </p>
            </div>
          </div>

          {/* Display Mode Switcher (Dropdown vs Accordion) */}
          <div id="csr-domains-catalog-view-display-mode-switcher-dropdown" className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setDisplayMode('DROPDOWN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                displayMode === 'DROPDOWN'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>منوی کشویی (دراپ‌دان)</span>
            </button>
            <button
              onClick={() => setDisplayMode('ACCORDION')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                displayMode === 'ACCORDION'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>فهرست آکاردئونی</span>
            </button>
          </div>
        </div>

        {/* 1. DROPDOWN SELECTION BAR */}
        {displayMode === 'DROPDOWN' && (
          <div id="csr-domains-catalog-view-1-dropdown-selection-bar" className="space-y-3">
            <div id="csr-domains-catalog-view-1-dropdown-selection-bar-2" className="relative" ref={dropdownRef}>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                انتخاب عنوان مسئولیت اجتماعی (عمرانی، فرهنگی، سلامت و...):
              </label>

              {/* Main Interactive Dropdown Button */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 border-2 border-indigo-500/30 hover:border-indigo-500 rounded-xl transition-all text-right shadow-xs group"
              >
                <div id="csr-domains-catalog-view-main-interactive-dropdown-button" className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {toPersianDigits(activeDomain?.code || 1)}
                  </span>
                  <div id="csr-domains-catalog-view-main-interactive-dropdown-button-2">
                    <div id="csr-domains-catalog-view-main-interactive-dropdown-button-3" className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-slate-900 min-w-0 truncate">
                        {activeDomain?.title}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 shrink-0">
                        {activeDomain?.category}
                      </span>
                      <HelpTooltip portal variant="ghost" text={activeDomain?.description} label="مشاهده توضیح عنوان" size="sm" widthClassName="w-72" />
                    </div>
                  </div>
                </div>

                <div id="csr-domains-catalog-view-main-interactive-dropdown-button-4" className="flex items-center gap-3">
                  <div id="csr-domains-catalog-view-main-interactive-dropdown-button-5" className="hidden sm:flex flex-col items-end text-xs">
                    <span className="font-bold text-indigo-700">
                      {toPersianDigits(currentPercentages[activeDomain.id] ?? activeDomain.defaultPercentage)}٪ تخصیص بودجه
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {toPersianDigits(activeDomain?.subItems?.length || 0)} اقدام و زیرمجموعه
                    </span>
                  </div>
                  <div id="csr-domains-catalog-view-main-interactive-dropdown-button-6" className={`p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 transition-transform ${isDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {/* Dropdown Menu Popup */}
              {isDropdownOpen && (
                <div id="csr-domains-catalog-view-dropdown-menu-popup" className="absolute top-full right-0 left-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-40 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150 max-h-96 overflow-y-auto">
                  {/* Search inside dropdown */}
                  <div id="csr-domains-catalog-view-search-inside-dropdown" className="relative pb-2 border-b border-slate-100">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="جستجوی سریع در عناوین (عمرانی، فرهنگی، سلامت، اشتغال، مسجد، جاده...)"
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      autoFocus
                    />
                  </div>

                  {/* Dropdown Options List */}
                  <div id="csr-domains-catalog-view-dropdown-options-list" className="space-y-1">
                    {filteredDropdownDomains.map((p) => {
                      const isSelected = p.id === selectedDomainId;
                      const pct = currentPercentages[p.id] ?? p.defaultPercentage;
                      const subCount = p.subItems?.length || 0;

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedDomainId(p.id);
                            setIsDropdownOpen(false);
                            setDropdownSearch('');
                            setSubItemSearch('');
                          }}
                          className={`w-full p-3 rounded-xl text-right transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-50 text-indigo-900 border border-indigo-300 font-bold'
                              : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                          }`}
                        >
                          <div id={`csr-domains-catalog-view-dropdown-options-list-2-${p.id}`} className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {toPersianDigits(p.code)}
                            </span>
                            <div id={`csr-domains-catalog-view-dropdown-options-list-3-${p.id}`} className="min-w-0">
                              <div id={`csr-domains-catalog-view-dropdown-options-list-4-${p.id}`} className="flex items-center gap-1.5">
                                <span className="text-xs font-bold min-w-0 truncate">{p.title}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                  {p.category}
                                </span>
                                <HelpTooltip portal variant="ghost" text={p.description} label="مشاهده توضیح عنوان" size="sm" widthClassName="w-72" />
                              </div>
                            </div>
                          </div>

                          <div id={`csr-domains-catalog-view-dropdown-options-list-5-${p.id}`} className="flex items-center gap-3">
                            <span className="text-xs text-indigo-600 font-semibold dir-rtl">
                              {toPersianDigits(pct)}٪
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({toPersianDigits(subCount)} زیرمجموعه)
                            </span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-indigo-600" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Category Chips for 1-Click Switching */}
            <div id="csr-domains-catalog-view-quick-category-chips-for-1" className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400" />
                دسترسی مستقیم:
              </span>
              {priorities.map((p) => {
                const isSelected = p.id === selectedDomainId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedDomainId(p.id);
                      setSubItemSearch('');
                    }}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200'
                    }`}
                  >
                    {p.category}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. ACCORDION VIEW (If user switched to Accordion) */}
      {displayMode === 'ACCORDION' && (
        <div id="csr-domains-catalog-view-2-accordion-view-if-user" className="space-y-3">
          {priorities.map((domain) => {
            const isExpanded = !!expandedAccordionIds[domain.id];
            const pct = currentPercentages[domain.id] ?? domain.defaultPercentage;
            const subItems = domain.subItems || [];

            return (
              <div
                id={`csr-domains-catalog-view-2-accordion-view-if-user-2-${domain.id}`}
                key={domain.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
              >
                {/* Accordion Header / Click to expand/collapse */}
                <button
                  type="button"
                  onClick={() => toggleAccordion(domain.id)}
                  className={`w-full p-4 text-right flex items-center justify-between transition-colors ${
                    isExpanded ? 'bg-indigo-50/70 border-b border-indigo-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <div id={`csr-domains-catalog-view-accordion-header-click-to-${domain.id}`} className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {toPersianDigits(domain.code)}
                    </span>
                    <div id={`csr-domains-catalog-view-accordion-header-click-to-2-${domain.id}`} className="min-w-0">
                      <div id={`csr-domains-catalog-view-accordion-header-click-to-3-${domain.id}`} className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-900 min-w-0 truncate">
                          {domain.title}
                        </h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 shrink-0">
                          {domain.category}
                        </span>
                        <HelpTooltip portal variant="ghost" text={domain.description} label="مشاهده توضیح عنوان" size="sm" widthClassName="w-72" />
                      </div>
                    </div>
                  </div>

                  <div id={`csr-domains-catalog-view-accordion-header-click-to-4-${domain.id}`} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-indigo-700 dir-rtl">
                      {toPersianDigits(pct)}٪
                    </span>
                    <span className="text-xs text-slate-500">
                      {toPersianDigits(subItems.length)} اقدام
                    </span>
                    <div id={`csr-domains-catalog-view-accordion-header-click-to-5-${domain.id}`} className="p-1 rounded-md bg-white border border-slate-200 text-slate-600">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {/* Accordion Content (Sub-items for this domain only) */}
                {isExpanded && (
                  <div id={`csr-domains-catalog-view-accordion-content-sub-items-for-${domain.id}`} className="p-4 space-y-3 bg-slate-50/50">
                    <div id={`csr-domains-catalog-view-accordion-content-sub-items-for-2-${domain.id}`} className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <span className="text-xs font-bold text-slate-700">
                        اقدامات و پروژه‌های تعریف شده ذیل «{domain.category}»:
                      </span>
                      <button
                        onClick={() => {
                          setTargetDomainForSubItem(domain);
                          setShowAddSubItemModal(true);
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>افزودن زیرمجموعه به این بخش</span>
                      </button>
                    </div>

                    <div id={`csr-domains-catalog-view-accordion-content-sub-items-for-3-${domain.id}`} className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {subItems.map((sub, sIdx) => (
                        <div
                          id={`csr-domains-catalog-view-accordion-content-sub-items-for-4-${sIdx}`}
                          key={sIdx}
                          className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 hover:border-indigo-300 transition-all shadow-2xs"
                        >
                          <div id={`csr-domains-catalog-view-accordion-content-sub-items-for-5-${sIdx}`} className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {toPersianDigits(sIdx + 1)}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 leading-snug">
                              {sub}
                            </span>
                          </div>

                          <div id={`csr-domains-catalog-view-accordion-content-sub-items-for-6-${sIdx}`} className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleOpenProjectModal(domain, sub)}
                              className="text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200"
                              title="تبدیل به پروژه اجرایی"
                            >
                              تبدیل به پروژه
                            </button>
                            <button
                              onClick={() =>
                                confirmDelete(`آیا از حذف اقدام «${sub}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`, () =>
                                  handleDeleteSubItem(domain.id, sIdx)
                                )
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                              title="حذف"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. ACTIVE DOMAIN SUB-ITEMS (In Dropdown Mode: Shows ONLY the selected category) */}
      {displayMode === 'DROPDOWN' && activeDomain && (
        <div id="csr-domains-catalog-view-3-active-domain-sub-items-in" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Domain Info & Metrics Card */}
          <div id="csr-domains-catalog-view-left-column-domain-info-metrics" className="lg:col-span-1 space-y-4">
            <div id="csr-domains-catalog-view-left-column-domain-info-metrics-2" className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 sticky top-4">
              <div id="csr-domains-catalog-view-left-column-domain-info-metrics-3" className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  <Tag className="w-3.5 h-3.5" />
                  {activeDomain.category}
                </span>
                <span className="text-xs font-bold text-slate-600">
                  کد عنوان: {toPersianDigits(activeDomain.code)}
                </span>
              </div>

              <div id="csr-domains-catalog-view-left-column-domain-info-metrics-4">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {activeDomain.title}
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed text-justify">
                  {activeDomain.description}
                </p>
              </div>

              {/* Financial Allocation Summary */}
              <div id="csr-domains-catalog-view-financial-allocation-summary" className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2.5 text-xs">
                <div id="csr-domains-catalog-view-financial-allocation-summary-2" className="flex items-center justify-between">
                  <span className="text-slate-500">سهم تخصیص بودجه سال جاری:</span>
                  <span className="font-bold text-indigo-600 text-sm">
                    {toPersianDigits(currentPercentages[activeDomain.id] ?? activeDomain.defaultPercentage)}٪
                  </span>
                </div>
                <div id="csr-domains-catalog-view-financial-allocation-summary-3" className="flex items-center justify-between">
                  <span className="text-slate-500">معادل ریالی/تومانی:</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(
                      (orgConfig.totalBudget * (currentPercentages[activeDomain.id] ?? activeDomain.defaultPercentage)) / 100,
                      orgConfig.currencyUnit
                    )}
                  </span>
                </div>
                <div id="csr-domains-catalog-view-financial-allocation-summary-4" className="flex items-center justify-between">
                  <span className="text-slate-500">پروژه‌های اجرایی فعال:</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {toPersianDigits(activeDomainProjects.length)} پروژه
                  </span>
                </div>
              </div>

              {/* Quick Jump Buttons */}
              <div id="csr-domains-catalog-view-quick-jump-buttons" className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => setActiveTab('PRIORITY_TABLE')}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>تنظیم درصد در جدول تخصیص بودجه</span>
                </button>

                <button
                  onClick={() => setActiveTab('PROJECTS')}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>مشاهده پروژه‌های اجرایی این حوزه</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Sub-Responsibilities Grid for ONLY Selected Category */}
          <div id="csr-domains-catalog-view-right-column-sub" className="lg:col-span-2 space-y-4">
            <div id="csr-domains-catalog-view-right-column-sub-2" className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              {/* Header with Search & Add Sub-item Button */}
              <div id="csr-domains-catalog-view-header-with-search-add-sub-item" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div id="csr-domains-catalog-view-header-with-search-add-sub-item-2">
                  <div id="csr-domains-catalog-view-header-with-search-add-sub-item-3" className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      زیرمجموعه‌ها و اقدامات اجرایی «{activeDomain.title}»
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                      {toPersianDigits(activeDomain.subItems?.length || 0)} اقدام
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    لیست دقیق فعالیت‌های ذیل این سرفصل (قابل اضافه کردن، حذف و تبدیل مستقیم به پروژه اجرایی)
                  </p>
                </div>

                <div id="csr-domains-catalog-view-header-with-search-add-sub-item-4" className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTargetDomainForSubItem(activeDomain);
                      setShowAddSubItemModal(true);
                    }}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>افزودن اقدام جدید به این سرفصل</span>
                  </button>
                </div>
              </div>

              {/* Search filter for sub-items in active domain */}
              <div id="csr-domains-catalog-view-search-filter-for-sub-items-in" className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder={`جستجو در اقدامات «${activeDomain.category}» (مثلاً: جاده‌سازی، مسجد، آبرسانی، وام، درمانگاه...)`}
                  value={subItemSearch}
                  onChange={(e) => setSubItemSearch(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Sub-Items Cards List */}
              <div id="csr-domains-catalog-view-sub-items-cards-list" className="space-y-2.5">
                {filteredSubItems.length === 0 ? (
                  <div id="csr-domains-catalog-view-sub-items-cards-list-2" className="text-center py-10 bg-slate-50/80 rounded-xl border border-dashed border-slate-200">
                    <FolderTree className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium">هیچ زیرمجموعه‌ای مطابق با جستجو یافت نشد.</p>
                    <button
                      onClick={() => {
                        setTargetDomainForSubItem(activeDomain);
                        setShowAddSubItemModal(true);
                      }}
                      className="mt-3 text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      افزودن اقدام جدید برای این حوزه
                    </button>
                  </div>
                ) : (
                  filteredSubItems.map((subItem, index) => {
                    const originalIndex = activeDomain.subItems?.indexOf(subItem) ?? index;
                    return (
                      <div
                        id={`csr-domains-catalog-view-sub-items-cards-list-3-${index}`}
                        key={index}
                        className="group p-3.5 rounded-xl bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div id={`csr-domains-catalog-view-sub-items-cards-list-4-${index}`} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {toPersianDigits(index + 1)}
                          </span>
                          <div id={`csr-domains-catalog-view-sub-items-cards-list-5-${index}`}>
                            <h4 className="text-xs font-bold text-slate-800 leading-relaxed">
                              {subItem}
                            </h4>
                            <div id={`csr-domains-catalog-view-sub-items-cards-list-6-${index}`} className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1 text-slate-500">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                هدف: {selectedLocation.province} - {selectedLocation.city}
                              </span>
                              <span>•</span>
                              <span className="text-indigo-600 font-medium">
                                سرفصل: {activeDomain.category}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons on sub-item */}
                        <div id={`csr-domains-catalog-view-action-buttons-on-sub-item-${index}`} className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleOpenProjectModal(activeDomain, subItem)}
                            className="flex items-center gap-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
                            title="تعریف و تبدیل به پروژه اجرایی در بانک پروژه‌ها"
                          >
                            <Building2 className="w-3 h-3 text-indigo-600" />
                            <span>تبدیل به پروژه اجرایی</span>
                          </button>

                          <button
                            onClick={() =>
                              confirmDelete(`آیا از حذف اقدام «${subItem}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`, () =>
                                handleDeleteSubItem(activeDomain.id, originalIndex)
                              )
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف این اقدام"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Sub-Item */}
      {showAddSubItemModal && (
        <div id="csr-domains-catalog-view-modal-add-sub-item" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div id="csr-domains-catalog-view-modal-add-sub-item-2" ref={subItemModalRef} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div id="csr-domains-catalog-view-modal-add-sub-item-3" className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div id="csr-domains-catalog-view-modal-add-sub-item-4" className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Plus className="w-4 h-4" />
                </span>
                <div id="csr-domains-catalog-view-modal-add-sub-item-5">
                  <h3 className="text-sm font-bold text-slate-900">
                    افزودن اقدام جدید به «{(targetDomainForSubItem || activeDomain)?.title}»
                  </h3>
                  <p className="text-xs text-slate-500">
                    تعریف زیرمجموعه یا اقدام اجرایی خرد ذیل این عنوان کلان مسئولیت اجتماعی
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddSubItemModal(false);
                  setTargetDomainForSubItem(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSaveSubItem} className="mt-4 space-y-4">
              <div id="csr-domains-catalog-view-modal-add-sub-item-6">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  عنوان اقدام / زیرمجموعه مسئولیت اجتماعی:
                </label>
                <textarea
                  rows={3}
                  placeholder="مثال: جاده‌سازی و روکش آسفالت جاده روستایی، احداث مسجد یا حسینیه، تجهیز بخش دیالیز درمانگاه..."
                  value={newSubItemText}
                  onChange={(e) => setNewSubItemText(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              <div id="csr-domains-catalog-view-modal-add-sub-item-7" className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  راهنمای ثبت اقدام:
                </p>
                <p className="text-[11px] leading-relaxed text-amber-700">
                  اقدام ثبت شده مستقیماً ذیل حوزه {(targetDomainForSubItem || activeDomain)?.category} قرار گرفته و در بانک پروژه‌ها و گزارشات قابل بهره‌برداری خواهد بود.
                </p>
              </div>

              <div id="csr-domains-catalog-view-modal-add-sub-item-8" className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSubItemModal(false);
                    setTargetDomainForSubItem(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  ثبت و ذخیره اقدام
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Main CSR Domain */}
      {showAddDomainModal && (
        <div id="csr-domains-catalog-view-modal-add-new-main-csr-domain" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div id="csr-domains-catalog-view-modal-add-new-main-csr-domain-2" ref={addDomainModalRef} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div id="csr-domains-catalog-view-modal-add-new-main-csr-domain-3" className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div id="csr-domains-catalog-view-modal-add-new-main-csr-domain-4" className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <FolderTree className="w-4 h-4" />
                </span>
                <div id="csr-domains-catalog-view-modal-add-new-main-csr-domain-5">
                  <h3 className="text-sm font-bold text-slate-900">
                    افزودن سرفصل جدید مسئولیت اجتماعی
                  </h3>
                  <p className="text-xs text-slate-500">
                    ایجاد سرفصل و دسته جدید برای مسئولیت‌های اجتماعی شرکت
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddDomainModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSaveNewDomain} className="mt-4 space-y-4">
              <div id="csr-domains-catalog-view-modal-add-new-main-csr-domain-6">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  عنوان کلان مسئولیت اجتماعی:
                </label>
                <input
                  type="text"
                  placeholder="مثال: توسعه گردشگری بومی و صنایع دستی"
                  value={newDomainTitle}
                  onChange={(e) => setNewDomainTitle(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div id="csr-domains-catalog-view-modal-add-new-main-csr-domain-7" className="grid grid-cols-2 gap-3">
                <div id="csr-domains-catalog-view-modal-add-new-main-csr-domain-8">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    دسته‌بندی موضوعی:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: فرهنگی و گردشگری"
                    value={newDomainCategory}
                    onChange={(e) => setNewDomainCategory(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div id="csr-domains-catalog-view-modal-add-new-main-csr-domain-9">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    درصد پیشنهادی بودجه:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newDomainPct}
                    onChange={(e) => setNewDomainPct(Number(e.target.value))}
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div id="csr-domains-catalog-view-modal-add-new-main-csr-domain-10">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  شرح و دامنه شمول:
                </label>
                <textarea
                  rows={2}
                  placeholder="توضیحات تکمیلی درباره اهداف این سرفصل مسئولیت اجتماعی..."
                  value={newDomainDesc}
                  onChange={(e) => setNewDomainDesc(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div id="csr-domains-catalog-view-modal-add-new-main-csr-domain-11" className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDomainModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  ثبت عنوان جدید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Convert Sub-Item directly to Executive Project */}
      {projectSubItem && (
        <div id="csr-domains-catalog-view-modal-convert-sub-item-directly" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div id="csr-domains-catalog-view-modal-convert-sub-item-directly-2" ref={convertModalRef} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div id="csr-domains-catalog-view-modal-convert-sub-item-directly-3" className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div id="csr-domains-catalog-view-modal-convert-sub-item-directly-4" className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Building2 className="w-4 h-4" />
                </span>
                <div id="csr-domains-catalog-view-modal-convert-sub-item-directly-5">
                  <h3 className="text-sm font-bold text-slate-900">
                    تبدیل زیرمجموعه به پروژه اجرایی
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-xs">
                    از زیرمجموعه: {projectSubItem.subItem}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProjectSubItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProjectFromSubItem} className="mt-4 space-y-3.5">
              <div id="csr-domains-catalog-view-modal-convert-sub-item-directly-6">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  عنوان پروژه اجرایی:
                </label>
                <input
                  type="text"
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div id="csr-domains-catalog-view-modal-convert-sub-item-directly-7" className="grid grid-cols-2 gap-3">
                <div id="csr-domains-catalog-view-modal-convert-sub-item-directly-8">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    برآورد اعتبار (تومان):
                  </label>
                  <input
                    type="number"
                    step={100_000_000}
                    value={projCostToman}
                    onChange={(e) => setProjCostToman(Number(e.target.value))}
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                  <span className="text-[10px] text-indigo-600 mt-1 block">
                    {formatCurrency(projCostToman, 'TOMAN')}
                  </span>
                </div>

                <div id="csr-domains-catalog-view-modal-convert-sub-item-directly-9">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    تعداد ذی‌نفعان مستقیم:
                  </label>
                  <input
                    type="number"
                    value={projBeneficiaries}
                    onChange={(e) => setProjBeneficiaries(Number(e.target.value))}
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {toPersianDigits(projBeneficiaries)} نفر
                  </span>
                </div>
              </div>

              <div id="csr-domains-catalog-view-modal-convert-sub-item-directly-10">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  دستگاه مجری / همکار محلی:
                </label>
                <input
                  type="text"
                  value={projExecutor}
                  onChange={(e) => setProjExecutor(e.target.value)}
                  placeholder={`مثال: شهرداری ${selectedLocation.city} / دانشگاه علوم پزشکی / اداره راهداری`}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div id="csr-domains-catalog-view-modal-convert-sub-item-directly-11" className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <div id="csr-domains-catalog-view-modal-convert-sub-item-directly-12" className="flex items-center justify-between text-[11px]">
                  <span>موقعیت مکانی هدف:</span>
                  <span className="font-semibold text-slate-800">{selectedLocation.province} - {selectedLocation.county} ({selectedLocation.city})</span>
                </div>
                <div id="csr-domains-catalog-view-modal-convert-sub-item-directly-13" className="flex items-center justify-between text-[11px]">
                  <span>سرفصل مسئولیت اجتماعی:</span>
                  <span className="font-semibold text-indigo-700">{projectSubItem.domain.title}</span>
                </div>
              </div>

              <div id="csr-domains-catalog-view-modal-convert-sub-item-directly-14" className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProjectSubItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  ایجاد و انتقال به بانک پروژه‌ها
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteConfirmModal}
    </div>
  );
};
