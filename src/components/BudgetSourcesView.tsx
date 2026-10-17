import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { BudgetSource, BudgetSourceType } from '../types';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { PageHeader } from './PageHeader';
import { AnimatedGauge } from './AnimatedGauge';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  ShieldCheck,
  Building2,
  Banknote,
  CalendarDays,
  Layers,
  AlertCircle,
  X,
} from 'lucide-react';
import { compactToman, formatMoneyParts, formatPercent, formatToman, formatNumber, toPersianDigits } from '../utils/numberUtils';
import { Num } from './Num';
import { PROJECT_STATUS_META } from '../utils/projectStatusMeta';
import { useConfirmDelete } from './ConfirmDeleteModal';

/** Radius of the commitment gauge on both the card strip and the dialog. */
const USAGE_GAUGE_RADIUS = 22;

/** Commitment rate tone: nearly spent reads amber, healthy reads emerald. */
const usageGaugeTone = (percent: number) =>
  percent >= 90 ? 'stroke-amber-500' : percent >= 50 ? 'stroke-emerald-500' : 'stroke-blue-500';

/**
 * Status pill for a funding source. The cards and the drill-down dialog read
 * the same map, so a source is never described two different ways.
 */
const SOURCE_STATUS_META: Record<BudgetSource['status'], { label: string; badge: string }> = {
  ACTIVE: {
    label: 'فعال و جاری',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  },
  DEPLETED: {
    label: 'اعتبار مصرف‌شده',
    badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  RESERVED: {
    label: 'رزرو‌شده',
    badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
};

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
  // Card click opens this drill-down instead of printing every figure on the
  // card; edit and delete live in its footer, exactly like the departments cards.
  const [detailSource, setDetailSource] = useState<BudgetSource | null>(null);
  const detailModalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(detailModalRef, () => setDetailSource(null));
  const { confirmDelete, modal: deleteConfirmModal } = useConfirmDelete();

  // Escape dismisses the drill-down dialog, matching the app's other modals.
  useEffect(() => {
    if (!detailSource) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailSource(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [detailSource]);

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
      {/* Page title block — above the banner, per the page-header reference. */}
      <PageHeader
        id="budget-sources-view-page-header"
        icon={Wallet}
        title="سرفصل‌ها و منابع تأمین مالی توسعه"
        subtitle="ترکیب بهینه بودجه دولتی، مسئولیت اجتماعی، دهیاری و خیریه"
        tone="text-emerald-600"
      />

      {/* Banner — section label, actions and the aggregate KPI strip. */}
      <div id="budget-sources-view-header-banner-light-theme" className="bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-emerald-200/80 shadow-2xs relative overflow-hidden">
        <div id="budget-sources-view-header-banner-light-theme-2" className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div id="budget-sources-view-header-banner-light-theme-4" className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              مدیریت منابع و اعتبارات چندگانه
            </span>
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
            <Num {...formatMoneyParts(grandTotal)} className="text-xl font-black text-emerald-700 mt-0.5 block font-mono" />
          </div>
          <div id="budget-sources-view-aggregate-kpi-strip-3" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">اعتبارات تخصیص‌یافته به پروژه‌ها</span>
            <Num {...formatMoneyParts(grandAllocated)} className="text-xl font-black text-blue-700 mt-0.5 block font-mono" />
          </div>
          <div id="budget-sources-view-aggregate-kpi-strip-4" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">مانده آزاد و قابل تخصیص</span>
            <Num {...formatMoneyParts(grandRemaining)} className="text-xl font-black text-amber-700 mt-0.5 block font-mono" />
          </div>
          <div id="budget-sources-view-aggregate-kpi-strip-5" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">درصد پوشش تعهدات</span>
            <Num value={formatPercent(allocationRate)} className="text-xl font-black text-slate-900 mt-0.5 block font-mono" />
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
      </div>

      {/* Sources Grid — a section of its own, exactly like the departments cards. */}
      <div id="budget-sources-view-sources-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSources.map((source) => {
          const linkedProjects = projects.filter((p) => p.budgetSourceId === source.id);
          const usagePercent =
            source.totalAmountToman > 0
              ? Math.min(100, Math.round((source.allocatedAmountToman / source.totalAmountToman) * 100))
              : 0;
          const allocated = compactToman(source.allocatedAmountToman);

          return (
            <article
              id={`budget-sources-view-card-${source.id}`}
              key={source.id}
              onClick={() => setDetailSource(source)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setDetailSource(source);
                }
              }}
              title="کلیک برای مشاهده جزئیات منبع"
              className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md cursor-pointer transition-all flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              {/* Identity — centred emblem over the source title, per the departments cards. */}
              <div
                id={`budget-sources-view-card-identity-${source.id}`}
                className="p-5 pb-4 flex flex-col items-center text-center"
              >
                <div
                  id={`budget-sources-view-card-icon-${source.id}`}
                  className="w-20 h-20 rounded-2xl border border-slate-200 dark:border-slate-700 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
                >
                  <Wallet className="w-10 h-10" />
                </div>

                <div id={`budget-sources-view-card-title-${source.id}`} className="mt-3 w-full min-w-0">
                  <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{source.code}</span>
                  <h3
                    className="font-black text-base text-slate-900 dark:text-slate-100 leading-tight line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors"
                    title={source.title}
                  >
                    {source.title}
                  </h3>
                </div>

                <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
                  <span
                    id={`budget-sources-view-card-type-${source.id}`}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  >
                    {source.sourceTypeFa}
                  </span>
                  <span
                    id={`budget-sources-view-card-status-${source.id}`}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${SOURCE_STATUS_META[source.status].badge}`}
                  >
                    {SOURCE_STATUS_META[source.status].label}
                  </span>
                </div>

                <div
                  id={`budget-sources-view-card-meta-${source.id}`}
                  className="flex items-center justify-center gap-3 mt-3 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap"
                >
                  <span className="flex items-center gap-1 min-w-0">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate" title={source.sponsorOrganization}>{source.sponsorOrganization}</span>
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <CalendarDays className="w-3 h-3 text-slate-400" />
                    <span>{source.fiscalYear}</span>
                  </span>
                </div>
              </div>

              {/* Three-metric strip: commitment gauge / allocated budget / funded projects */}
              <div
                id={`budget-sources-view-card-metrics-${source.id}`}
                className="mt-auto grid grid-cols-3 items-stretch border-y border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 rounded-b-2xl"
              >
                <div
                  id={`budget-sources-view-card-gauge-${source.id}`}
                  className="flex items-center justify-center py-3"
                >
                  <AnimatedGauge
                    value={usagePercent}
                    radius={USAGE_GAUGE_RADIUS}
                    toneClassName={usageGaugeTone(usagePercent)}
                    className="w-14 h-14"
                  >
                    <Num value={formatPercent(usagePercent)} className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-800 dark:text-slate-100" />
                  </AnimatedGauge>
                </div>

                <div
                  id={`budget-sources-view-card-allocated-metric-${source.id}`}
                  className="flex flex-col items-center justify-center gap-0.5 px-1 py-3 border-x border-slate-100 dark:border-slate-800 text-center"
                >
                  <Num value={allocated.value} className="text-base font-black text-slate-900 dark:text-slate-100 leading-none" />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                    <Banknote className="w-3 h-3 text-slate-400" />
                    تخصیص‌یافته ({allocated.unit})
                  </span>
                </div>

                <div
                  id={`budget-sources-view-card-projects-metric-${source.id}`}
                  className="flex flex-col items-center justify-center gap-0.5 px-1 py-3 text-center"
                >
                  <Num value={formatNumber(linkedProjects.length)} className="text-base font-black text-slate-900 dark:text-slate-100 leading-none" />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                    <Layers className="w-3 h-3 text-slate-400" />
                    پروژه تأمین‌شده
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Budget-source drill-down dialog — the card grid keeps only the summary,
          and the edit/delete actions live here, exactly like the departments cards. */}
      {detailSource &&
        (() => {
          const linkedProjects = projects.filter((p) => p.budgetSourceId === detailSource.id);
          const usagePercent =
            detailSource.totalAmountToman > 0
              ? Math.min(100, Math.round((detailSource.allocatedAmountToman / detailSource.totalAmountToman) * 100))
              : 0;
          const statusMeta = SOURCE_STATUS_META[detailSource.status];
          const remainingToman = Math.max(0, detailSource.totalAmountToman - detailSource.allocatedAmountToman);
          const detailGaugeRadius = 32;

          return (
            <div
              id="budget-sources-view-detail-modal"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <div
                id="budget-sources-view-detail-modal-panel"
                ref={detailModalRef}
                className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
              >
                {/* Header */}
                <div
                  id="budget-sources-view-detail-modal-header"
                  className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      id="budget-sources-view-detail-modal-icon"
                      className="w-12 h-12 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
                    >
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{detailSource.code}</span>
                      <h3 className="font-black text-base text-slate-900 dark:text-slate-100 leading-tight">
                        {detailSource.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                          {detailSource.sourceTypeFa}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusMeta.badge}`}>
                          {statusMeta.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          سال مالی {detailSource.fiscalYear}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    id="btn-close-budget-source-details"
                    onClick={() => setDetailSource(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                    title="بستن"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div id="budget-sources-view-detail-modal-body" className="p-5 space-y-4 text-xs">
                  {/* Sponsor, type, year and funded projects */}
                  <div id="budget-sources-view-detail-modal-facts" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      id="budget-sources-view-detail-modal-facts-sponsor"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                        دستگاه تأمین‌کننده
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate" title={detailSource.sponsorOrganization}>
                        {detailSource.sponsorOrganization}
                      </span>
                    </div>
                    <div
                      id="budget-sources-view-detail-modal-facts-type"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <Wallet className="w-3.5 h-3.5" />
                        نوع ماهیت منبع
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate">{detailSource.sourceTypeFa}</span>
                    </div>
                    <div
                      id="budget-sources-view-detail-modal-facts-year"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <CalendarDays className="w-3.5 h-3.5" />
                        سال مالی
                      </span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{detailSource.fiscalYear}</span>
                    </div>
                    <div
                      id="budget-sources-view-detail-modal-facts-projects"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <Layers className="w-3.5 h-3.5" />
                        پروژه‌های تأمین‌شده
                      </span>
                      <Num value={formatNumber(linkedProjects.length)} unit="پروژه" className="font-bold text-slate-800 dark:text-slate-200" />
                    </div>
                  </div>

                  {/* Amounts panel */}
                  <div
                    id="budget-sources-view-detail-modal-amounts"
                    className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                        وضعیت اعتبارات و تخصیص
                      </span>
                      <span className="text-[10px] text-slate-400">سال مالی {detailSource.fiscalYear}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <AnimatedGauge
                        value={usagePercent}
                        radius={detailGaugeRadius}
                        center={40}
                        strokeWidth={8}
                        toneClassName={usageGaugeTone(usagePercent)}
                        className="w-20 h-20 shrink-0"
                      >
                        <span className="absolute inset-0 flex flex-col items-center justify-center">
                          <Num value={formatPercent(usagePercent)} className="text-sm font-black text-slate-800 dark:text-slate-100" />
                          <span className="text-[9px] text-slate-400">نرخ تعهد</span>
                        </span>
                      </AnimatedGauge>

                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">سقف کل اعتبار</span>
                          <Num {...formatMoneyParts(detailSource.totalAmountToman)} className="font-black text-slate-900 dark:text-slate-100" />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">تخصیص‌یافته به پروژه‌ها</span>
                          <Num {...formatMoneyParts(detailSource.allocatedAmountToman)} className="font-bold text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">مانده قابل مصرف</span>
                          <Num {...formatMoneyParts(remainingToman)} className="font-bold text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Target scope */}
                  <div id="budget-sources-view-detail-modal-scope">
                    <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                      قلمرو جغرافیایی و جامعه هدف
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                      {detailSource.targetScope || 'قلمرو خاصی برای این منبع ثبت نشده است.'}
                    </p>
                  </div>

                  {/* Legal note */}
                  <div id="budget-sources-view-detail-modal-note">
                    <span className="font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      ملاحظات و شروط هزینه‌کرد قانونی
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                      {detailSource.restrictionNote || 'شرط یا محدودیت خاصی برای این منبع ثبت نشده است.'}
                    </p>
                  </div>

                  {/* Linked projects */}
                  <div id="budget-sources-view-detail-modal-projects">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-500" />
                        پروژه‌های تأمین‌شده از این منبع
                      </span>
                      <span className="text-[10px] text-slate-400">
                        <Num value={formatNumber(linkedProjects.length)} unit="پروژه" unitClassName="text-[0.9em] font-bold text-slate-400 ms-0.5" /> ثبت‌شده
                      </span>
                    </div>

                    {linkedProjects.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <AlertCircle className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                        <p className="text-[11px] text-slate-400">
                          پروژه‌ای با تأمین مالی از این منبع ثبت نشده است.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {linkedProjects.map((proj) => (
                          <div
                            id={`budget-sources-view-detail-modal-project-${proj.id}`}
                            key={proj.id}
                            className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <span className="text-[10px] font-mono text-slate-400 block">{proj.code}</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] leading-tight block">
                                  {proj.title}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 ${
                                  PROJECT_STATUS_META[proj.status].className
                                }`}
                              >
                                {PROJECT_STATUS_META[proj.status].label}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    proj.progressPercentage >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${Math.min(100, proj.progressPercentage)}%` }}
                                />
                              </div>
                              <Num value={formatPercent(proj.progressPercentage)} className="text-[10px] font-bold text-slate-500 dark:text-slate-400 w-9 text-left shrink-0" />
                              <Num {...formatMoneyParts(proj.estimatedCostToman)} className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div
                  id="budget-sources-view-detail-modal-footer"
                  className="sticky bottom-0 flex items-center justify-between gap-3 p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <span className="text-[10px] text-slate-400 font-mono truncate">
                    شناسه سیستمی: {detailSource.code}
                  </span>
                  {canManage && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        id="btn-edit-budget-source-from-details"
                        type="button"
                        onClick={() => {
                          const target = detailSource;
                          setDetailSource(null);
                          handleOpenEdit(target);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        ویرایش مشخصات
                      </button>
                      <button
                        id="btn-delete-budget-source-from-details"
                        type="button"
                        onClick={() => {
                          const target = detailSource;
                          setDetailSource(null);
                          confirmDelete(
                            `آیا از حذف منبع بودجه «${target.title}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`,
                            () => handleDeleteBudgetSource(target.id)
                          );
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف منبع
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

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
