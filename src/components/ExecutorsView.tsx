import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { ProjectExecutor, ExecutorType } from '../types';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { PageHeader } from './PageHeader';
import {
  Users2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Briefcase,
  Phone,
  Edit,
  Trash2,
  X,
  FolderGit2,
  User,
  MapPin,
  AlertCircle,
  Award,
} from 'lucide-react';
import { useConfirmDelete } from './ConfirmDeleteModal';
import { formatToman, toPersianDigits } from '../utils/numberUtils';
import { PROJECT_STATUS_META } from '../utils/projectStatusMeta';

/** Radius of the success-rate ring drawn on each executor card. */
const GAUGE_RADIUS = 22;

/** Capacity pill copy and colours, keyed by the executor's capacity status. */
const CAPACITY_LABELS: Record<ProjectExecutor['capacityStatus'], string> = {
  AVAILABLE: 'ظرفیت آزاد و آماده واگذاری',
  OPTIMAL: 'ظرفیت بهینه',
  OVERLOADED: 'تکمیل ظرفیت (بار اضافه)',
};

const CAPACITY_PILL: Record<ProjectExecutor['capacityStatus'], string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  OPTIMAL: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  OVERLOADED: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
};

/**
 * Colour of the field-success gauge follows the rate itself rather than the
 * executor's structural type, so the ring reads delivery health at a glance:
 * a proven executor writes green (≥ ۹۲٪), an acceptable one amber (۸۸–۹۱٪)
 * and a shaky one red (below ۸۸٪).
 */
function successGaugeTone(rate: number): string {
  if (rate >= 92) return 'stroke-emerald-500 dark:stroke-emerald-400';
  if (rate >= 88) return 'stroke-amber-500 dark:stroke-amber-400';
  return 'stroke-rose-500 dark:stroke-rose-400';
}

export const ExecutorsView: React.FC = () => {
  const {
    executors,
    projects,
    selectedLocation,
    handleAddExecutor,
    handleUpdateExecutor,
    handleDeleteExecutor,
    currentUser,
    getUserPermissions,
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedCapacity, setSelectedCapacity] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(modalRef, () => setIsModalOpen(false));
  const [editingExec, setEditingExec] = useState<ProjectExecutor | null>(null);
  const { confirmDelete, modal: deleteConfirmModal } = useConfirmDelete();

  // Read-only drill-down of a single executor
  const [detailExec, setDetailExec] = useState<ProjectExecutor | null>(null);
  const detailModalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(detailModalRef, () => setDetailExec(null));

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<ExecutorType>('GOVERNMENTAL');
  const [formLead, setFormLead] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRegion, setFormRegion] = useState(`${selectedLocation.county} و بخش‌های تابعه`);
  const [formSuccessRate, setFormSuccessRate] = useState<number>(90);
  const [formCapacity, setFormCapacity] = useState<ProjectExecutor['capacityStatus']>('AVAILABLE');

  const userPerm = getUserPermissions(currentUser);
  const canManage = userPerm ? userPerm.canManageExecutors : currentUser.role === 'ADMIN';

  const typeLabels: Record<ExecutorType, string> = {
    GOVERNMENTAL: 'دستگاه اجرایی دولتی',
    JIHADI_FOUNDATION: 'قرارگاه جهادی و محرومیت‌زدایی',
    PUBLIC_COMMUNITY: 'بخشداری و شورای دهیاری',
    NGO: 'سازمان مردم‌نهاد و خیریه',
    COOPERATIVE: 'تعاونی توسعه روستایی',
    PRIVATE: 'شرکت مجری تخصصی',
  };

  const handleOpenAdd = () => {
    setEditingExec(null);
    setFormName('');
    setFormCode(`EXC-${Math.floor(100 + Math.random() * 900)}`);
    setFormType('GOVERNMENTAL');
    setFormLead('');
    setFormPhone('');
    setFormRegion(`${selectedLocation.county} و بخش‌های تابعه`);
    setFormSuccessRate(90);
    setFormCapacity('AVAILABLE');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exec: ProjectExecutor) => {
    setEditingExec(exec);
    setFormName(exec.name);
    setFormCode(exec.code);
    setFormType(exec.type);
    setFormLead(exec.managingDirector);
    setFormPhone(exec.contactPhone);
    setFormRegion(exec.coverageRegion);
    setFormSuccessRate(exec.successRate);
    setFormCapacity(exec.capacityStatus);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingExec) {
      handleUpdateExecutor({
        ...editingExec,
        name: formName.trim(),
        code: formCode.trim(),
        type: formType,
        typeFa: typeLabels[formType] || 'سایر',
        managingDirector: formLead.trim(),
        contactPhone: formPhone.trim(),
        coverageRegion: formRegion.trim(),
        successRate: Number(formSuccessRate),
        capacityStatus: formCapacity,
      });
    } else {
      handleAddExecutor({
        name: formName.trim(),
        code: formCode.trim(),
        type: formType,
        typeFa: typeLabels[formType] || 'سایر',
        managingDirector: formLead.trim(),
        contactPhone: formPhone.trim(),
        activeProjectsCount: 0,
        completedProjectsCount: 0,
        successRate: Number(formSuccessRate),
        capacityStatus: formCapacity,
        coverageRegion: formRegion.trim(),
        province: selectedLocation.province,
        county: selectedLocation.county,
      });
    }
    setIsModalOpen(false);
  };

  // Filtered
  const filteredExecutors = useMemo(() => {
    return executors.filter((e) => {
      const matchQ =
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.managingDirector.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = selectedType === 'ALL' || e.type === selectedType;
      const matchCap = selectedCapacity === 'ALL' || e.capacityStatus === selectedCapacity;
      return matchQ && matchType && matchCap;
    });
  }, [executors, searchQuery, selectedType, selectedCapacity]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('ALL');
    setSelectedCapacity('ALL');
  };

  // Aggregate stats
  const totalCompleted = useMemo(() => executors.reduce((s, e) => s + e.completedProjectsCount, 0), [executors]);
  const avgSuccess = useMemo(
    () => (executors.length > 0 ? Math.round(executors.reduce((s, e) => s + e.successRate, 0) / executors.length) : 0),
    [executors]
  );
  const availableCount = useMemo(() => executors.filter((e) => e.capacityStatus === 'AVAILABLE').length, [executors]);

  return (
    <div id="executors-view-root" className="space-y-6">
      {/* Page title block — above the banner, per the page-header reference. */}
      <PageHeader
        id="executors-view-page-header"
        icon={Users2}
        title="مجریان طرح‌ها و پروژه‌های توسعه"
        subtitle={`${toPersianDigits(executors.length)} نهاد مجری ثبت‌شده — شناسنامه، عملکرد و ظرفیت هر مجری در ${selectedLocation.province} - ${selectedLocation.county}`}
        tone="text-cyan-600"
      />

      {/* Banner — section label, actions and the micro-KPI strip. */}
      <div id="executors-view-header-banner-light-theme" className="bg-gradient-to-r from-cyan-50/90 via-sky-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-cyan-200/80 shadow-2xs relative overflow-hidden">
        <div id="executors-view-header-banner-light-theme-2" className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div id="executors-view-header-banner-light-theme-4" className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-200">
              بازوی اجرایی و پیاده‌سازی میدانی
            </span>
          </div>

          <div id="executors-view-header-banner-light-theme-5" className="flex items-center gap-3 self-start md:self-auto">
            {canManage && (
              <button
                id="btn-add-executor"
                onClick={handleOpenAdd}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-cyan-600/25 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت نهاد مجری جدید</span>
              </button>
            )}
          </div>
        </div>

        {/* Micro-KPI Strip */}
        <div id="executors-view-micro-kpi-strip" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-cyan-200/60">
          <div id="executors-view-micro-kpi-strip-2" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">کل مجریان شناسنامه‌دار</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{toPersianDigits(executors.length)} نهاد</span>
          </div>
          <div id="executors-view-micro-kpi-strip-3" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">پروژه‌های با موفقیت تحویل‌شده</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block font-mono">{toPersianDigits(totalCompleted)} پروژه</span>
          </div>
          <div id="executors-view-micro-kpi-strip-4" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">میانگین نرخ موفقیت میدانی</span>
            <span className="text-xl font-black text-cyan-700 mt-0.5 block font-mono">{toPersianDigits(avgSuccess)}٪</span>
          </div>
          <div id="executors-view-micro-kpi-strip-5" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">مجریان دارای ظرفیت آزاد</span>
            <span className="text-xl font-black text-amber-700 mt-0.5 block font-mono">{toPersianDigits(availableCount)} مجری</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div id="executors-view-filter-and-search-bar" className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div id="executors-view-filter-and-search-bar-2" className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="جستجوی نام مجری، فرمانده/مدیر یا کد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
        </div>

        <div id="executors-view-filter-and-search-bar-3" className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div id="executors-view-filter-and-search-bar-4" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>نوع مجری:</span>
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="ALL">همه ساختارها ({toPersianDigits(executors.length)})</option>
            <option value="GOVERNMENTAL">دستگاه دولتی</option>
            <option value="JIHADI_FOUNDATION">قرارگاه جهادی</option>
            <option value="PUBLIC_COMMUNITY">شورای دهیاری و بخشداری</option>
            <option value="NGO">خیریه و سمن</option>
            <option value="COOPERATIVE">تعاونی توسعه</option>
            <option value="PRIVATE">شرکت مجری تخصصی</option>
          </select>

          <select
            value={selectedCapacity}
            onChange={(e) => setSelectedCapacity(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="ALL">همه وضعیت‌های ظرفیت</option>
            <option value="AVAILABLE">دارای ظرفیت آزاد</option>
            <option value="OPTIMAL">ظرفیت بهینه</option>
            <option value="OVERLOADED">تکمیل و دارای بار اضافه</option>
          </select>
        </div>
      </div>

      {/* Executors Grid — each card summarises one executor and opens a drill-down modal */}
      {filteredExecutors.length > 0 ? (
        <div id="executors-view-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredExecutors.map((exec) => {
            const execProjects = projects.filter((p) => p.executorId === exec.id);

            return (
              <article
                id={`executors-view-card-${exec.id}`}
                key={exec.id}
                onClick={() => setDetailExec(exec)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDetailExec(exec);
                  }
                }}
                title="کلیک برای مشاهده جزئیات مجری"
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md cursor-pointer transition-all flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {/* Identity — centred emblem over the executor name. */}
                <div id={`executors-view-card-identity-${exec.id}`} className="p-5 pb-4 flex flex-col items-center text-center">
                  <div
                    id={`executors-view-card-icon-${exec.id}`}
                    className="w-20 h-20 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0"
                  >
                    <Briefcase className="w-10 h-10" />
                  </div>

                  <div id={`executors-view-card-title-${exec.id}`} className="mt-3 w-full min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{exec.code}</span>
                    <h3
                      className="font-black text-base text-slate-900 dark:text-slate-100 leading-tight min-w-0 line-clamp-2 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors"
                      title={exec.name}
                    >
                      {exec.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
                    <span
                      id={`executors-view-card-type-${exec.id}`}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800"
                    >
                      {exec.typeFa}
                    </span>
                    <span
                      id={`executors-view-card-capacity-${exec.id}`}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${CAPACITY_PILL[exec.capacityStatus]}`}
                    >
                      {CAPACITY_LABELS[exec.capacityStatus]}
                    </span>
                  </div>

                  <div
                    id={`executors-view-card-meta-${exec.id}`}
                    className="flex items-center justify-center gap-3 mt-3 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap"
                  >
                    <span className="flex items-center gap-1 min-w-0">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{exec.managingDirector}</span>
                    </span>
                    <span className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{exec.coverageRegion}</span>
                    </span>
                  </div>
                </div>

                {/* Three-metric strip: success gauge / active projects / completed projects */}
                <div
                  id={`executors-view-card-metrics-${exec.id}`}
                  className="mt-auto grid grid-cols-3 items-stretch border-y border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 rounded-b-2xl"
                >
                  <div id={`executors-view-card-gauge-${exec.id}`} className="flex items-center justify-center py-3">
                    <div className="relative w-14 h-14">
                      <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                        <circle
                          cx="28"
                          cy="28"
                          r={GAUGE_RADIUS}
                          fill="none"
                          strokeWidth="6"
                          className="stroke-slate-200 dark:stroke-slate-700"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r={GAUGE_RADIUS}
                          fill="none"
                          strokeWidth="6"
                          strokeLinecap="round"
                          className={`transition-all duration-500 ${successGaugeTone(exec.successRate)}`}
                          strokeDasharray={2 * Math.PI * GAUGE_RADIUS}
                          strokeDashoffset={2 * Math.PI * GAUGE_RADIUS * (1 - exec.successRate / 100)}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-800 dark:text-slate-100">
                        {toPersianDigits(exec.successRate)}٪
                      </span>
                    </div>
                  </div>

                  <div
                    id={`executors-view-card-active-metric-${exec.id}`}
                    className="flex flex-col items-center justify-center gap-0.5 px-1 py-3 border-x border-slate-100 dark:border-slate-800 text-center"
                  >
                    <span className="text-base font-black text-slate-900 dark:text-slate-100 leading-none">
                      {toPersianDigits(execProjects.length)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <FolderGit2 className="w-3 h-3 text-slate-400" />
                      پروژه جاری
                    </span>
                  </div>

                  <div
                    id={`executors-view-card-completed-metric-${exec.id}`}
                    className="flex flex-col items-center justify-center gap-0.5 px-1 py-3 text-center"
                  >
                    <span className="text-base font-black text-slate-900 dark:text-slate-100 leading-none">
                      {toPersianDigits(exec.completedProjectsCount)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3 text-slate-400" />
                      خاتمه‌یافته
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div
          id="executors-view-empty-state"
          className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800"
        >
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">هیچ نهاد مجری‌ای با این مشخصات یافت نشد</h3>
          <p className="text-xs text-slate-400 mt-1">لطفاً عبارت جستجو یا فیلترهای خود را تغییر دهید.</p>
          <button
            id="btn-reset-executor-filters"
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            پاک‌سازی جستجو و فیلترها
          </button>
        </div>
      )}

      {/* Executor Drill-down Modal */}
      {detailExec &&
        (() => {
          const execProjects = projects.filter((p) => p.executorId === detailExec.id);
          const detailGaugeRadius = 32;

          return (
            <div id="executors-view-detail-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div
                id="executors-view-detail-modal-panel"
                ref={detailModalRef}
                className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
              >
                {/* Header */}
                <div id="executors-view-detail-modal-header" className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      id="executors-view-detail-modal-icon"
                      className="w-12 h-12 rounded-2xl border bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0"
                    >
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{detailExec.code}</span>
                      <h3 className="font-black text-base text-slate-900 dark:text-slate-100 leading-tight">{detailExec.name}</h3>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800">
                          {detailExec.typeFa}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CAPACITY_PILL[detailExec.capacityStatus]}`}>
                          {CAPACITY_LABELS[detailExec.capacityStatus]}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {detailExec.county ? `${detailExec.province} - ${detailExec.county}` : detailExec.province}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    id="btn-close-executor-details"
                    onClick={() => setDetailExec(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                    title="بستن"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div id="executors-view-detail-modal-body" className="p-5 space-y-4 text-xs">
                  {/* Governance & contact */}
                  <div id="executors-view-detail-modal-contact" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      id="executors-view-detail-modal-contact-manager"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <User className="w-3.5 h-3.5" />
                        فرمانده / مدیر
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{detailExec.managingDirector}</span>
                    </div>
                    <div
                      id="executors-view-detail-modal-contact-phone"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <Phone className="w-3.5 h-3.5" />
                        شماره تماس
                      </span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{detailExec.contactPhone}</span>
                    </div>
                    <div
                      id="executors-view-detail-modal-contact-region"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                        محدوده پوشش
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{detailExec.coverageRegion}</span>
                    </div>
                    <div
                      id="executors-view-detail-modal-contact-projects"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <FolderGit2 className="w-3.5 h-3.5" />
                        پروژه‌های جاری
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{toPersianDigits(execProjects.length)} پروژه</span>
                    </div>
                  </div>

                  {/* Delivery performance */}
                  <div
                    id="executors-view-detail-modal-performance"
                    className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-cyan-500" />
                        کارنامه اجرایی و نرخ موفقیت
                      </span>
                      <span className="text-[10px] text-slate-400">دوره جاری پایش</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20 shrink-0">
                        <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r={detailGaugeRadius}
                            fill="none"
                            strokeWidth="8"
                            className="stroke-slate-200 dark:stroke-slate-700"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r={detailGaugeRadius}
                            fill="none"
                            strokeWidth="8"
                            strokeLinecap="round"
                            className={`transition-all duration-500 ${successGaugeTone(detailExec.successRate)}`}
                            strokeDasharray={2 * Math.PI * detailGaugeRadius}
                            strokeDashoffset={2 * Math.PI * detailGaugeRadius * (1 - detailExec.successRate / 100)}
                          />
                        </svg>
                        <span className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                            {toPersianDigits(detailExec.successRate)}٪
                          </span>
                          <span className="text-[9px] text-slate-400">نرخ موفقیت</span>
                        </span>
                      </div>

                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">پروژه‌های جاری</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{toPersianDigits(execProjects.length)} پروژه</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">پروژه‌های خاتمه‌یافته</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {toPersianDigits(detailExec.completedProjectsCount)} پروژه
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">وضعیت ظرفیت اجرایی</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{CAPACITY_LABELS[detailExec.capacityStatus]}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Linked projects */}
                  <div id="executors-view-detail-modal-projects">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <FolderGit2 className="w-3.5 h-3.5 text-cyan-500" />
                        پروژه‌های سپرده‌شده به این مجری
                      </span>
                      <span className="text-[10px] text-slate-400">{toPersianDigits(execProjects.length)} پروژه ثبت‌شده</span>
                    </div>

                    {execProjects.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <AlertCircle className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                        <p className="text-[11px] text-slate-400">پروژه‌ای با اجرای مستقیم این نهاد ثبت نشده است.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {execProjects.map((proj) => (
                          <div
                            id={`executors-view-detail-modal-project-${proj.id}`}
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
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 ${PROJECT_STATUS_META[proj.status].className}`}
                              >
                                {PROJECT_STATUS_META[proj.status].label}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${proj.progressPercentage >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                  style={{ width: `${Math.min(100, proj.progressPercentage)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 w-9 text-left shrink-0">
                                {toPersianDigits(proj.progressPercentage)}٪
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0">
                                {formatToman(proj.estimatedCostToman)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div
                  id="executors-view-detail-modal-footer"
                  className="sticky bottom-0 flex items-center justify-between gap-3 p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <span className="text-[10px] text-slate-400 font-mono truncate">شناسه سیستمی: {detailExec.code}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {canManage && (
                      <>
                        <button
                          id="btn-edit-executor-from-details"
                          type="button"
                          onClick={() => {
                            const target = detailExec;
                            setDetailExec(null);
                            handleOpenEdit(target);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-bold text-[11px] border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-950/70 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          ویرایش مشخصات
                        </button>
                        <button
                          id="btn-delete-executor-from-details"
                          type="button"
                          onClick={() => {
                            const target = detailExec;
                            setDetailExec(null);
                            confirmDelete(`آیا از حذف مجری «${target.name}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`, () =>
                              handleDeleteExecutor(target.id)
                            );
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          حذف مجری
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div id="executors-view-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div id="executors-view-modal-2" ref={modalRef} className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div id="executors-view-modal-3" className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users2 className="w-5 h-5 text-cyan-500" />
                {editingExec ? 'ویرایش مشخصات نهاد مجری' : 'ثبت و شناسنامه‌دار کردن نهاد مجری'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div id="executors-view-modal-4">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">نام نهاد مجری *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: قرارگاه پیشرفت و آبادانی سپاه ثارالله"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div id="executors-view-modal-5" className="grid grid-cols-2 gap-3">
                <div id="executors-view-modal-6">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">کد شناسایی سیستمی *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="executors-view-modal-7">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">نوع ساختار مجری</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ExecutorType)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="GOVERNMENTAL">دستگاه دولتی</option>
                    <option value="JIHADI_FOUNDATION">قرارگاه جهادی</option>
                    <option value="PUBLIC_COMMUNITY">شورای دهیاری و بخشداری</option>
                    <option value="NGO">سازمان مردم‌نهاد و خیریه</option>
                    <option value="COOPERATIVE">تعاونی توسعه روستایی</option>
                    <option value="PRIVATE">شرکت مجری تخصصی</option>
                  </select>
                </div>
              </div>

              <div id="executors-view-modal-8" className="grid grid-cols-2 gap-3">
                <div id="executors-view-modal-9">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">فرمانده / مدیر ارشد *</label>
                  <input
                    type="text"
                    required
                    value={formLead}
                    onChange={(e) => setFormLead(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
                <div id="executors-view-modal-10">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">تلفن هماهنگی *</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div id="executors-view-modal-11" className="grid grid-cols-2 gap-3">
                <div id="executors-view-modal-12">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">محدوده پوشش عملیاتی</label>
                  <input
                    type="text"
                    required
                    value={formRegion}
                    onChange={(e) => setFormRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
                <div id="executors-view-modal-13">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">وضعیت ظرفیت اجرایی</label>
                  <select
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value as ProjectExecutor['capacityStatus'])}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="AVAILABLE">دارای ظرفیت آزاد و آماده واگذاری</option>
                    <option value="OPTIMAL">ظرفیت بهینه</option>
                    <option value="OVERLOADED">تکمیل ظرفیت (بار اضافه)</option>
                  </select>
                </div>
              </div>

              <div id="executors-view-modal-14">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">نرخ موفقیت گذشته (درصد)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formSuccessRate}
                  onChange={(e) => setFormSuccessRate(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                />
              </div>

              <div id="executors-view-modal-15" className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-600/30"
                >
                  {editingExec ? 'ذخیره تغییرات' : 'ثبت نهایی مجری'}
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
