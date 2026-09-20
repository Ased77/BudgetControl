import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { ProjectExecutor, ExecutorType } from '../types';
import { useOutsideClick } from '../hooks/useOutsideClick';
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
} from 'lucide-react';
import { useConfirmDelete } from './ConfirmDeleteModal';
import { toPersianDigits } from '../utils/numberUtils';

export const ExecutorsView: React.FC = () => {
  const {
    executors,
    projects,
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

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<ExecutorType>('GOVERNMENTAL');
  const [formLead, setFormLead] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRegion, setFormRegion] = useState('شهرستان رفسنجان و بخش‌های تابعه');
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
    setFormRegion('شهرستان رفسنجان و بخش‌های تابعه');
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

  // Aggregate stats
  const totalCompleted = useMemo(() => executors.reduce((s, e) => s + e.completedProjectsCount, 0), [executors]);
  const avgSuccess = useMemo(
    () => (executors.length > 0 ? Math.round(executors.reduce((s, e) => s + e.successRate, 0) / executors.length) : 0),
    [executors]
  );
  const availableCount = useMemo(() => executors.filter((e) => e.capacityStatus === 'AVAILABLE').length, [executors]);

  return (
    <div id="executors-view-root" className="space-y-6">
      {/* Header Banner (Light Theme) */}
      <div id="executors-view-header-banner-light-theme" className="bg-gradient-to-r from-cyan-50/90 via-sky-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-cyan-200/80 shadow-2xs relative overflow-hidden">
        <div id="executors-view-header-banner-light-theme-2" className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div id="executors-view-header-banner-light-theme-3">
            <div id="executors-view-header-banner-light-theme-4" className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-200">
                بازوی اجرایی و پیاده‌سازی میدانی
              </span>
              <span className="text-xs text-slate-500">دستگاه‌های اجرایی، قرارگاه‌های جهادی و تعاونی‌ها</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <Users2 className="w-7 h-7 text-cyan-600" />
              مجریان طرح‌ها و پروژه‌های توسعه
            </h1>
            <p className="text-slate-600 text-sm mt-1 max-w-3xl leading-relaxed">
              مدیریت و ارزیابی صلاحیت نهادهای مجری پروژه (دستگاه‌های اجرایی تخصصی، قرارگاه‌های جهادی محرومیت‌زدایی و دهیاری‌ها).
              سامانه ظرفیت عملیاتی هر مجری را سنجیده و از واگذاری متمرکز به مجریان دارای بار مضاعف جلوگیری می‌کند.
            </p>
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

      {/* Grid */}
      <div id="executors-view-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExecutors.map((exec) => {
          const execProjects = projects.filter((p) => p.executorId === exec.id);

          return (
            <div
              id={`executors-view-grid-2-${exec.id}`}
              key={exec.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div id={`executors-view-grid-3-${exec.id}`}>
                <div id={`executors-view-grid-4-${exec.id}`} className="flex items-start justify-between gap-2 mb-3">
                  <div id={`executors-view-grid-5-${exec.id}`} className="flex items-center gap-2.5">
                    <div id={`executors-view-grid-6-${exec.id}`} className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div id={`executors-view-grid-7-${exec.id}`}>
                      <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{exec.code}</span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">{exec.name}</h3>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                      exec.capacityStatus === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : exec.capacityStatus === 'OPTIMAL'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    {exec.capacityStatus === 'AVAILABLE'
                      ? 'ظرفیت آزاد'
                      : exec.capacityStatus === 'OPTIMAL'
                      ? 'ظرفیت بهینه'
                      : 'تکمیل ظرفیت'}
                  </span>
                </div>

                {/* Lead Person & Contact */}
                <div id={`executors-view-lead-person-contact-${exec.id}`} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800/80 mb-4">
                  <div id={`executors-view-lead-person-contact-2-${exec.id}`} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">فرمانده / مدیر:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{exec.managingDirector}</span>
                  </div>
                  <div id={`executors-view-lead-person-contact-3-${exec.id}`} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">ساختار:</span>
                    <span className="font-medium text-cyan-600 dark:text-cyan-400">{exec.typeFa}</span>
                  </div>
                  <div id={`executors-view-lead-person-contact-4-${exec.id}`} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      تماس:
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">{exec.contactPhone}</span>
                  </div>
                </div>

                {/* Success Rate & Operational Region */}
                <div id={`executors-view-success-rate-operational-region-${exec.id}`} className="space-y-2 mb-4">
                  <div id={`executors-view-success-rate-operational-region-2-${exec.id}`} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">محدوده پوشش:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">{exec.coverageRegion}</span>
                  </div>
                  <div id={`executors-view-success-rate-operational-region-3-${exec.id}`} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">نرخ موفقیت پروژه‌ها:</span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">{toPersianDigits(exec.successRate)}٪</span>
                  </div>

                  <div id={`executors-view-success-rate-operational-region-4-${exec.id}`} className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      id={`executors-view-success-rate-operational-region-5-${exec.id}`}
                      className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${exec.successRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div id={`executors-view-footer-${exec.id}`} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div id={`executors-view-footer-2-${exec.id}`} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <FolderGit2 className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{toPersianDigits(execProjects.length)} پروژه جاری</span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{toPersianDigits(exec.completedProjectsCount)} خاتمه‌یافته</span>
                </div>

                {canManage && (
                  <div id={`executors-view-footer-3-${exec.id}`} className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(exec)}
                      className="p-1.5 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="ویرایش مشخصات"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        confirmDelete(`آیا از حذف مجری «${exec.name}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`, () =>
                          handleDeleteExecutor(exec.id)
                        )
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="حذف نهاد مجری"
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

      {/* Modal */}
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
                    onChange={(e) => setFormCapacity(e.target.value as any)}
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
