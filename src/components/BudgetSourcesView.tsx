import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { BudgetSource, BudgetSourceType } from '../types';
import { useOutsideClick } from '../hooks/useOutsideClick';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  PieChart,
  ShieldCheck,
  TrendingDown,
  AlertTriangle,
  Building,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react';
import { formatToman, toPersianDigits } from '../utils/numberUtils';
import { useConfirmDelete } from './ConfirmDeleteModal';

export const BudgetSourcesView: React.FC = () => {
  const {
    budgetSources,
    projects,
    selectedLocation,
    handleAddBudgetSource,
    handleUpdateBudgetSource,
    handleDeleteBudgetSource,
    currentUser,
    getUserPermissions,
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(modalRef, () => setIsModalOpen(false));
  const [editingSource, setEditingSource] = useState<BudgetSource | null>(null);
  const { confirmDelete, modal: deleteConfirmModal } = useConfirmDelete();

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<BudgetSourceType>('CSR');
  const [formTypeFa, setFormTypeFa] = useState('مسئولیت اجتماعی (CSR)');
  const [formTotal, setFormTotal] = useState<number>(1_000_000_000_000);
  const [formAllocated, setFormAllocated] = useState<number>(0);
  const [formFiscalYear, setFormFiscalYear] = useState('۱۴۰۳-۱۴۰۴');
  const [formSponsor, setFormSponsor] = useState('');
  const [formScope, setFormScope] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formStatus, setFormStatus] = useState<BudgetSource['status']>('ACTIVE');

  const userPerm = getUserPermissions(currentUser);
  const canManage = userPerm ? userPerm.canManageBudget : currentUser.role === 'ADMIN';

  const typeLabels: Record<BudgetSourceType, string> = {
    CSR: 'مسئولیت اجتماعی شرکتی (CSR)',
    GOVERNMENT: 'اعتبارات دولتی و عمرانی',
    DEHYARI_MUNICIPALITY: 'اعتبارات دهیاری‌ها و شهرداری‌ها',
    CHARITY_FOUNDATION: 'خیریه‌ها و بنیادهای حمایتی',
    BANK_FACILITY: 'تسهیلات بانکی و اشتغال',
    PUBLIC_PARTICIPATION: 'مشارکت‌های مردمی و خیرین',
  };

  const handleOpenAdd = () => {
    setEditingSource(null);
    setFormTitle('');
    setFormCode(`SRC-${Math.floor(100 + Math.random() * 900)}`);
    setFormType('CSR');
    setFormTypeFa('مسئولیت اجتماعی (CSR)');
    setFormTotal(1_000_000_000_000);
    setFormAllocated(0);
    setFormFiscalYear('۱۴۰۳-۱۴۰۴');
    setFormSponsor('');
    setFormScope(`مناطق محروم و روستایی ${selectedLocation.county}`);
    setFormNote('');
    setFormStatus('ACTIVE');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (src: BudgetSource) => {
    setEditingSource(src);
    setFormTitle(src.title);
    setFormCode(src.code);
    setFormType(src.sourceType);
    setFormTypeFa(src.sourceTypeFa);
    setFormTotal(src.totalAmountToman);
    setFormAllocated(src.allocatedAmountToman);
    setFormFiscalYear(src.fiscalYear);
    setFormSponsor(src.sponsorOrganization);
    setFormScope(src.targetScope);
    setFormNote(src.restrictionNote || '');
    setFormStatus(src.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const total = Number(formTotal);
    const allocated = Number(formAllocated);
    const remaining = Math.max(0, total - allocated);

    if (editingSource) {
      handleUpdateBudgetSource({
        ...editingSource,
        title: formTitle.trim(),
        code: formCode.trim(),
        sourceType: formType,
        sourceTypeFa: typeLabels[formType] || formTypeFa,
        totalAmountToman: total,
        allocatedAmountToman: allocated,
        remainingAmountToman: remaining,
        fiscalYear: formFiscalYear.trim(),
        sponsorOrganization: formSponsor.trim(),
        targetScope: formScope.trim(),
        restrictionNote: formNote.trim(),
        status: formStatus,
      });
    } else {
      handleAddBudgetSource({
        title: formTitle.trim(),
        code: formCode.trim(),
        sourceType: formType,
        sourceTypeFa: typeLabels[formType] || formTypeFa,
        totalAmountToman: total,
        allocatedAmountToman: allocated,
        remainingAmountToman: remaining,
        fiscalYear: formFiscalYear.trim(),
        sponsorOrganization: formSponsor.trim(),
        targetScope: formScope.trim(),
        restrictionNote: formNote.trim(),
        status: formStatus,
        province: selectedLocation.province,
        county: selectedLocation.county,
      });
    }
    setIsModalOpen(false);
  };

  // Filtered
  const filteredSources = useMemo(() => {
    return budgetSources.filter((s) => {
      const matchQ =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.sponsorOrganization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = selectedType === 'ALL' || s.sourceType === selectedType;
      return matchQ && matchType;
    });
  }, [budgetSources, searchQuery, selectedType]);

  // Aggregate Totals
  const grandTotal = useMemo(() => budgetSources.reduce((s, b) => s + b.totalAmountToman, 0), [budgetSources]);
  const grandAllocated = useMemo(() => budgetSources.reduce((s, b) => s + b.allocatedAmountToman, 0), [budgetSources]);
  const grandRemaining = useMemo(() => budgetSources.reduce((s, b) => s + b.remainingAmountToman, 0), [budgetSources]);
  const allocationRate = grandTotal > 0 ? Math.round((grandAllocated / grandTotal) * 100) : 0;

  return (
    <div id="budget-sources-view-root" className="space-y-6">
      {/* Header Banner (Light Theme) */}
      <div id="budget-sources-view-header-banner-light-theme" className="bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-emerald-200/80 shadow-2xs relative overflow-hidden">
        <div id="budget-sources-view-header-banner-light-theme-2" className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div id="budget-sources-view-header-banner-light-theme-3">
            <div id="budget-sources-view-header-banner-light-theme-4" className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                مدیریت منابع و اعتبارات چندگانه
              </span>
              <span className="text-xs text-slate-500">ترکیب بهینه بودجه دولتی، مسئولیت اجتماعی، دهیاری و خیریه</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <Wallet className="w-7 h-7 text-emerald-600" />
              سرفصل‌ها و منابع تأمین مالی توسعه
            </h1>
            <p className="text-slate-600 text-sm mt-1 max-w-3xl leading-relaxed">
              تعریف و کنترل دقیق انواع منابع بودجه (مسئولیت اجتماعی صنایع، اعتبارات استانی دولت، منابع دهیاری‌ها و شهرداری‌ها،
              تسهیلات بانکی اشتغال و خیریه‌ها). ردیابی لحظه‌ای مانده منابع جهت ممانعت از کسری و هدایت هدفمند نقدینگی.
            </p>
          </div>

          <div id="budget-sources-view-header-banner-light-theme-5" className="flex items-center gap-3 self-start md:self-auto">
            {canManage && (
              <button
                id="btn-add-budget-source"
                onClick={handleOpenAdd}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>تعریف سرفصل بودجه جدید</span>
              </button>
            )}
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div id="budget-sources-view-aggregate-kpi-strip" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-emerald-200/60">
          <div id="budget-sources-view-aggregate-kpi-strip-2" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">کل منابع اعتباری مصوب</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block font-mono">{formatToman(grandTotal)}</span>
          </div>
          <div id="budget-sources-view-aggregate-kpi-strip-3" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">اعتبارات تخصیص‌یافته به پروژه‌ها</span>
            <span className="text-xl font-black text-blue-700 mt-0.5 block font-mono">{formatToman(grandAllocated)}</span>
          </div>
          <div id="budget-sources-view-aggregate-kpi-strip-4" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">مانده آزاد و قابل تخصیص</span>
            <span className="text-xl font-black text-amber-700 mt-0.5 block font-mono">{formatToman(grandRemaining)}</span>
          </div>
          <div id="budget-sources-view-aggregate-kpi-strip-5" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">درصد پوشش تعهدات</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{toPersianDigits(allocationRate)}٪</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div id="budget-sources-view-filter-and-search-bar" className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row flex-wrap gap-4 justify-between items-center">
        <div id="budget-sources-view-filter-and-search-bar-2" className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="جستجوی سرفصل، سازمان حامی یا کد بودجه..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div id="budget-sources-view-filter-and-search-bar-3" className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div id="budget-sources-view-filter-and-search-bar-4" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>نوع منبع:</span>
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">همه انواع منابع ({budgetSources.length})</option>
            <option value="CSR">مسئولیت اجتماعی شرکتی (CSR)</option>
            <option value="GOVERNMENT">اعتبارات دولتی</option>
            <option value="DEHYARI_MUNICIPALITY">دهیاری‌ها و شهرداری‌ها</option>
            <option value="CHARITY_FOUNDATION">خیریه‌ها و بنیادها</option>
            <option value="BANK_FACILITY">تسهیلات بانکی</option>
            <option value="PUBLIC_PARTICIPATION">مشارکت‌های مردمی</option>
          </select>
        </div>

        {/* Sources Grid */}
        <div id="budget-sources-view-sources-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {filteredSources.map((source) => {
          const linkedProjects = projects.filter((p) => p.budgetSourceId === source.id);
          const usagePercent =
            source.totalAmountToman > 0
              ? Math.min(100, Math.round((source.allocatedAmountToman / source.totalAmountToman) * 100))
              : 0;

          return (
            <div
              id="budget-sources-view-sources-grid-card"
              key={source.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div id={`budget-sources-view-sources-grid-3-${source.id}`}>
                <div id={`budget-sources-view-sources-grid-4-${source.id}`} className="flex items-start justify-between gap-2 mb-3">
                  <div id={`budget-sources-view-sources-grid-5-${source.id}`} className="flex items-center gap-2.5">
                    <div id={`budget-sources-view-sources-grid-6-${source.id}`} className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div id={`budget-sources-view-sources-grid-7-${source.id}`}>
                      <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{source.code}</span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">{source.title}</h3>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                      source.status === 'ACTIVE'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {source.status === 'ACTIVE' ? 'فعال و جاری' : 'تکمیل یا مسدود'}
                  </span>
                </div>

                {/* Sponsor & Scope */}
                <div id={`budget-sources-view-sponsor-scope-${source.id}`} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800/80 mb-4">
                  <div id={`budget-sources-view-sponsor-scope-2-${source.id}`} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">دستگاه تأمین‌کننده:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{source.sponsorOrganization}</span>
                  </div>
                  <div id={`budget-sources-view-sponsor-scope-3-${source.id}`} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">نوع منبع:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{source.sourceTypeFa}</span>
                  </div>
                  <div id={`budget-sources-view-sponsor-scope-4-${source.id}`} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">سال مالی:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{source.fiscalYear}</span>
                  </div>
                  {source.restrictionNote && (
                    <div id={`budget-sources-view-sponsor-scope-5-${source.id}`} className="pt-1.5 border-t border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{source.restrictionNote}</span>
                    </div>
                  )}
                </div>

                {/* Amounts Breakdown */}
                <div id={`budget-sources-view-amounts-breakdown-${source.id}`} className="space-y-2 mb-4">
                  <div id={`budget-sources-view-amounts-breakdown-2-${source.id}`} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">سقف کل اعتبار:</span>
                    <span className="font-black text-slate-900 dark:text-slate-100">{formatToman(source.totalAmountToman)}</span>
                  </div>
                  <div id={`budget-sources-view-amounts-breakdown-3-${source.id}`} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">تخصیص یافته:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{formatToman(source.allocatedAmountToman)}</span>
                  </div>
                  <div id={`budget-sources-view-amounts-breakdown-4-${source.id}`} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">مانده قابل مصرف:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatToman(source.remainingAmountToman)}</span>
                  </div>

                  <div id={`budget-sources-view-amounts-breakdown-5-${source.id}`} className="pt-1">
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-14 shrink-0">
                        <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                          <circle cx="28" cy="28" r="22" fill="none" strokeWidth="6" className="stroke-slate-100 dark:stroke-slate-800" />
                          <circle
                            cx="28"
                            cy="28"
                            r="22"
                            fill="none"
                            strokeWidth="6"
                            strokeLinecap="round"
                            className={`transition-all duration-500 ${
                              usagePercent >= 90 ? 'stroke-amber-500' : usagePercent >= 50 ? 'stroke-emerald-500' : 'stroke-blue-500'
                            }`}
                            strokeDasharray={2 * Math.PI * 22}
                            strokeDashoffset={2 * Math.PI * 22 * (1 - usagePercent / 100)}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-700 dark:text-slate-300">
                          {toPersianDigits(usagePercent)}٪
                        </span>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span className="block text-[10px] text-slate-400">نرخ تعهد و تخصیص</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">از سقف کل {formatToman(source.totalAmountToman)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div id={`budget-sources-view-footer-${source.id}`} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div id={`budget-sources-view-footer-2-${source.id}`} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{toPersianDigits(linkedProjects.length)} پروژه تأمین‌شده</span>
                </div>

                {canManage && (
                  <div id={`budget-sources-view-footer-3-${source.id}`} className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(source)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="ویرایش منبع"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        confirmDelete(`آیا از حذف منبع بودجه «${source.title}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`, () =>
                          handleDeleteBudgetSource(source.id)
                        )
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="حذف منبع"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div id="budget-sources-view-crud-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div id="budget-sources-view-crud-modal-2" ref={modalRef} className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div id="budget-sources-view-crud-modal-3" className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500" />
                {editingSource ? 'ویرایش سرفصل تأمین مالی' : 'تعریف سرفصل و منبع مالی جدید'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div id="budget-sources-view-crud-modal-4">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">عنوان سرفصل بودجه *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: اعتبارات مسئولیت اجتماعی معادن یا بودجه دهیاری‌ها"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div id="budget-sources-view-crud-modal-5" className="grid grid-cols-2 gap-3">
                <div id="budget-sources-view-crud-modal-6">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">کد ردیف بودجه</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="budget-sources-view-crud-modal-7">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">نوع ماهیت منبع</label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      const val = e.target.value as BudgetSourceType;
                      setFormType(val);
                      setFormTypeFa(typeLabels[val]);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="CSR">مسئولیت اجتماعی (CSR)</option>
                    <option value="GOVERNMENT">اعتبارات دولتی</option>
                    <option value="DEHYARI_MUNICIPALITY">دهیاری‌ها و شهرداری‌ها</option>
                    <option value="CHARITY_FOUNDATION">خیریه‌ها و بنیادها</option>
                    <option value="BANK_FACILITY">تسهیلات بانکی</option>
                    <option value="PUBLIC_PARTICIPATION">مشارکت‌های مردمی</option>
                  </select>
                </div>
              </div>

              <div id="budget-sources-view-crud-modal-8" className="grid grid-cols-2 gap-3">
                <div id="budget-sources-view-crud-modal-9">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">سازمان / شرکت حامی</label>
                  <input
                    type="text"
                    required
                    value={formSponsor}
                    onChange={(e) => setFormSponsor(e.target.value)}
                    placeholder="نام ارگان یا شرکت تأمین‌کننده"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div id="budget-sources-view-crud-modal-10">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">سال مالی</label>
                  <input
                    type="text"
                    value={formFiscalYear}
                    onChange={(e) => setFormFiscalYear(e.target.value)}
                    placeholder="۱۴۰۳-۱۴۰۴"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div id="budget-sources-view-crud-modal-11" className="grid grid-cols-2 gap-3">
                <div id="budget-sources-view-crud-modal-12">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">کل سقف اعتبار (تومان) *</label>
                  <input
                    type="number"
                    required
                    value={formTotal}
                    onChange={(e) => setFormTotal(Number(e.target.value))}
                    step="100000000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="budget-sources-view-crud-modal-13">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">تخصیص‌یافته به پروژه‌ها (تومان)</label>
                  <input
                    type="number"
                    value={formAllocated}
                    onChange={(e) => setFormAllocated(Number(e.target.value))}
                    step="100000000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div id="budget-sources-view-crud-modal-14">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">قلمرو جغرافیایی و جامعه هدف</label>
                <input
                  type="text"
                  value={formScope}
                  onChange={(e) => setFormScope(e.target.value)}
                  placeholder="مثال: روستاهای دارای تنش آبی بخش‌های کشکوئیه و فردوس"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div id="budget-sources-view-crud-modal-15">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ملاحظات و شروط هزینه‌کرد قانونی</label>
                <textarea
                  rows={2}
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="شرایط مصوب شورای نظارت یا الزامات قانونی تبصره‌ها..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div id="budget-sources-view-crud-modal-16" className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/30"
                >
                  {editingSource ? 'ذخیره تغییرات' : 'ثبت سرفصل بودجه'}
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
