import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { CrisisHarmItem, UrgencyLevel, AdministrativeLevel } from '../types';
import { useOutsideClick } from '../hooks/useOutsideClick';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Flame,
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  Edit,
  Trash2,
  X,
  Layers,
  Activity,
} from 'lucide-react';
import { formatNumber, toPersianDigits } from '../utils/numberUtils';
import { useConfirmDelete } from './ConfirmDeleteModal';

export const CrisesHarmsView: React.FC = () => {
  const {
    crisesHarms,
    projects,
    selectedLocation,
    handleAddCrisisHarm,
    handleUpdateCrisisHarm,
    handleDeleteCrisisHarm,
    setActiveTab,
    currentUser,
    getUserPermissions,
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(modalRef, () => setIsModalOpen(false));
  const [editingCrisis, setEditingCrisis] = useState<CrisisHarmItem | null>(null);
  const { confirmDelete, modal: deleteConfirmModal } = useConfirmDelete();

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState('زیرساخت و آب شرب');
  const [formLevel, setFormLevel] = useState<AdministrativeLevel>('COUNTY');
  const [formProvince, setFormProvince] = useState(selectedLocation.province);
  const [formCounty, setFormCounty] = useState(selectedLocation.county);
  const [formDistrict, setFormDistrict] = useState(selectedLocation.district);
  const [formSeverity, setFormSeverity] = useState<number>(85);
  const [formUrgency, setFormUrgency] = useState<UrgencyLevel>('CRITICAL');
  const [formAffectedPop, setFormAffectedPop] = useState<number>(45000);
  const [formCause, setFormCause] = useState('');
  const [formSolution, setFormSolution] = useState('');
  const [formStatus, setFormStatus] = useState<CrisisHarmItem['status']>('UNRESOLVED');
  const [formDeficitIndex, setFormDeficitIndex] = useState('');

  const userPerm = getUserPermissions(currentUser);
  const canManage = userPerm ? userPerm.canManageCrises : true;

  const urgencyLabels: Record<UrgencyLevel, { label: string; color: string; badge: string }> = {
    CRITICAL: { label: 'بحرانی و فوری', color: 'text-rose-600', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
    HIGH: { label: 'شدت بالا', color: 'text-amber-600', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
    MEDIUM: { label: 'شدت متوسط', color: 'text-blue-600', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
    LOW: { label: 'قابل پایش', color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  };

  const handleOpenAdd = () => {
    setEditingCrisis(null);
    setFormTitle('');
    setFormCode(`CRS-${Math.floor(100 + Math.random() * 900)}`);
    setFormCategory('زیرساخت و آب شرب');
    setFormLevel('COUNTY');
    setFormProvince(selectedLocation.province);
    setFormCounty(selectedLocation.county);
    setFormDistrict(selectedLocation.district);
    setFormSeverity(85);
    setFormUrgency('CRITICAL');
    setFormAffectedPop(40000);
    setFormCause('');
    setFormSolution('');
    setFormStatus('UNRESOLVED');
    setFormDeficitIndex('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CrisisHarmItem) => {
    setEditingCrisis(item);
    setFormTitle(item.title);
    setFormCode(item.code);
    setFormCategory(item.category);
    setFormLevel(item.level);
    setFormProvince(item.province);
    setFormCounty(item.county);
    setFormDistrict(item.districtOrVillage);
    setFormSeverity(item.severityScore);
    setFormUrgency(item.urgency);
    setFormAffectedPop(item.affectedPopulation);
    setFormCause(item.primaryCause);
    setFormSolution(item.recommendedIntervention);
    setFormStatus(item.status);
    setFormDeficitIndex(item.deficitIndexFa);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingCrisis) {
      handleUpdateCrisisHarm({
        ...editingCrisis,
        title: formTitle.trim(),
        code: formCode.trim(),
        category: formCategory.trim(),
        level: formLevel,
        province: formProvince.trim(),
        county: formCounty.trim(),
        districtOrVillage: formDistrict.trim(),
        severityScore: Number(formSeverity),
        urgency: formUrgency,
        affectedPopulation: Number(formAffectedPop),
        primaryCause: formCause.trim(),
        recommendedIntervention: formSolution.trim(),
        status: formStatus,
        deficitIndexFa: formDeficitIndex.trim() || formCategory,
      });
    } else {
      handleAddCrisisHarm({
        title: formTitle.trim(),
        code: formCode.trim(),
        category: formCategory.trim(),
        level: formLevel,
        province: formProvince.trim(),
        county: formCounty.trim(),
        districtOrVillage: formDistrict.trim(),
        severityScore: Number(formSeverity),
        urgency: formUrgency,
        affectedPopulation: Number(formAffectedPop),
        primaryCause: formCause.trim(),
        recommendedIntervention: formSolution.trim(),
        status: formStatus,
        activeProjectsCount: 0,
        deficitIndexFa: formDeficitIndex.trim() || formCategory,
      });
    }
    setIsModalOpen(false);
  };

  // Filtered Crises
  const filteredCrises = useMemo(() => {
    return crisesHarms.filter((c) => {
      const matchQ =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.districtOrVillage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchUrg = selectedUrgency === 'ALL' || c.urgency === selectedUrgency;
      const matchStat = selectedStatus === 'ALL' || c.status === selectedStatus;
      return matchQ && matchUrg && matchStat;
    });
  }, [crisesHarms, searchQuery, selectedUrgency, selectedStatus]);

  // Aggregate stats
  const criticalCount = useMemo(() => crisesHarms.filter((c) => c.urgency === 'CRITICAL').length, [crisesHarms]);
  const totalAffected = useMemo(() => crisesHarms.reduce((s, c) => s + c.affectedPopulation, 0), [crisesHarms]);
  const underInterventionCount = useMemo(() => crisesHarms.filter((c) => c.status === 'UNDER_INTERVENTION').length, [crisesHarms]);

  return (
    <div id="crises-harms-view-root" className="space-y-6">
      {/* Header Banner (Light Theme) */}
      <div id="crises-harms-view-header-banner-light-theme" className="bg-gradient-to-r from-rose-50/90 via-pink-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-rose-200/80 shadow-2xs relative overflow-hidden">
        <div id="crises-harms-view-header-banner-light-theme-2" className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div id="crises-harms-view-header-banner-light-theme-3">
            <div id="crises-harms-view-header-banner-light-theme-4" className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                پایگاه داده آسیب‌ها، بحران‌ها و نیازهای واقعی
              </span>
              <span className="text-xs text-slate-500">مبنای هوشمند سنجش اولویت و توجیه پروژه‌ها</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <AlertTriangle className="w-7 h-7 text-rose-600" />
              آسیب‌ها، بحران‌ها و نیازسنجی محلی / منطقه‌ای
            </h1>
            <p className="text-slate-600 text-sm mt-1 max-w-3xl leading-relaxed">
              ثبت و رتبه‌بندی دقیق بحران‌ها (تنش آبی، تصادفات جاده‌ای، اورژانس مسمومیت‌ها، بیکاری جوانان، حاشیه‌نشینی و فرونشست زمین).
              موتور هوشمند سامانه اجازه تعریف پروژه‌های موازی یا کم‌اثر را در مناطقی که بحران‌های حاد حل‌نشده دارند نخواهد داد.
            </p>
          </div>

          <div id="crises-harms-view-header-banner-light-theme-5" className="flex items-center gap-3 self-start md:self-auto">
            {canManage && (
              <button
                id="btn-add-crisis"
                onClick={handleOpenAdd}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-rose-600/25 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت آسیب یا بحران جدید</span>
              </button>
            )}
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div id="crises-harms-view-aggregate-kpi-strip" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-rose-200/60">
          <div id="crises-harms-view-aggregate-kpi-strip-2" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">کل موارد ثبت‌شده</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{toPersianDigits(crisesHarms.length)} مورد</span>
          </div>
          <div id="crises-harms-view-aggregate-kpi-strip-3" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">بحران‌های حاد و اضطراری</span>
            <span className="text-xl font-black text-rose-700 mt-0.5 block flex items-center gap-1 font-mono">
              <Flame className="w-4 h-4 text-rose-600" />
              {toPersianDigits(criticalCount)} کانون بحرانی
            </span>
          </div>
          <div id="crises-harms-view-aggregate-kpi-strip-4" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">جمعیت تحت تأثیر مستقیم</span>
            <span className="text-xl font-black text-amber-700 mt-0.5 block font-mono">{formatNumber(totalAffected)} نفر</span>
          </div>
          <div id="crises-harms-view-aggregate-kpi-strip-5" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">طرح‌های در حال مداخله</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block font-mono">{toPersianDigits(underInterventionCount)} بحران</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div id="crises-harms-view-filter-and-search-bar" className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div id="crises-harms-view-filter-and-search-bar-2" className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="جستجوی عنوان بحران، محدوده یا علت..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>

        <div id="crises-harms-view-filter-and-search-bar-3" className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div id="crises-harms-view-filter-and-search-bar-4" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>سطح فوریت:</span>
          </div>
          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="ALL">همه سطوح فوریت ({crisesHarms.length})</option>
            <option value="CRITICAL">بحرانی و فوری</option>
            <option value="HIGH">شدت بالا</option>
            <option value="MEDIUM">شدت متوسط</option>
            <option value="LOW">قابل پایش</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="UNRESOLVED">حل نشده / بدون پروژه</option>
            <option value="UNDER_INTERVENTION">تحت مداخله با پروژه فعال</option>
            <option value="CONTROLLED">مهار شده / تثبیت وضعیت</option>
          </select>
        </div>
      </div>

      {/* Crises Grid */}
      <div id="crises-harms-view-crises-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCrises.map((item) => {
          const urgencyInfo = urgencyLabels[item.urgency];
          const matchedProjects = projects.filter((p) => p.crisisHarmId === item.id);

          return (
            <div
              id="crises-harms-view-crises-grid-card"
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div id={`crises-harms-view-crises-grid-3-${item.id}`}>
                <div id={`crises-harms-view-crises-grid-4-${item.id}`} className="flex items-start justify-between gap-2 mb-3">
                  <div id={`crises-harms-view-crises-grid-5-${item.id}`} className="flex items-center gap-2.5">
                    <div id={`crises-harms-view-crises-grid-6-${item.id}`} className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div id={`crises-harms-view-crises-grid-7-${item.id}`}>
                      <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{item.code}</span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">{item.title}</h3>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${urgencyInfo.badge}`}
                  >
                    {urgencyInfo.label}
                  </span>
                </div>

                <div id={`crises-harms-view-crises-grid-8-${item.id}`} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {item.province} - {item.county} ({item.districtOrVillage})
                  </span>
                </div>

                {/* Score & Affected Population */}
                <div id={`crises-harms-view-score-affected-population-${item.id}`} className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs mb-3 border border-slate-100 dark:border-slate-800">
                  <div id={`crises-harms-view-score-affected-population-2-${item.id}`}>
                    <span className="text-slate-400 text-[11px] block">شاخص شدت محرومیت:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                      <Activity className="w-3.5 h-3.5 text-rose-500" />
                      {toPersianDigits(item.severityScore)} از ۱۰۰
                    </span>
                  </div>
                  <div id={`crises-harms-view-score-affected-population-3-${item.id}`}>
                    <span className="text-slate-400 text-[11px] block">جمعیت متأثر:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      {formatNumber(item.affectedPopulation)} نفر
                    </span>
                  </div>
                </div>

                {/* Cause and Intervention */}
                <div id={`crises-harms-view-cause-and-intervention-${item.id}`} className="space-y-2 text-xs text-slate-600 dark:text-slate-300 mb-4">
                  <div id={`crises-harms-view-cause-and-intervention-2-${item.id}`} className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-2.5 border border-amber-200/50 dark:border-amber-900/40">
                    <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">ریشه و علت اصلی:</span>
                    <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">{item.primaryCause}</p>
                  </div>
                  <div id={`crises-harms-view-cause-and-intervention-3-${item.id}`} className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-2.5 border border-emerald-200/50 dark:border-emerald-900/40">
                    <span className="font-bold text-emerald-900 dark:text-emerald-300 block mb-0.5">مداخله و راهکار پیشنهادی:</span>
                    <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">{item.recommendedIntervention}</p>
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div id={`crises-harms-view-status-actions-${item.id}`} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div id={`crises-harms-view-status-actions-2-${item.id}`} className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      item.status === 'UNDER_INTERVENTION'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        : item.status === 'CONTROLLED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    {item.status === 'UNDER_INTERVENTION' ? (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>پروژه فعال ({matchedProjects.length})</span>
                      </>
                    ) : item.status === 'CONTROLLED' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>مهار شده</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        <span>فاقد مداخله اجرایی</span>
                      </>
                    )}
                  </span>
                </div>

                <div id={`crises-harms-view-status-actions-3-${item.id}`} className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab('PROJECTS')}
                    className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-bold px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                  >
                    <span>مشاهده پروژه‌ها</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>

                  {canManage && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="ویرایش بحران"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          confirmDelete(`آیا از حذف بحران «${item.title}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`, () =>
                            handleDeleteCrisisHarm(item.id)
                          )
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="حذف بحران"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div id="crises-harms-view-crud-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div id="crises-harms-view-crud-modal-2" ref={modalRef} className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div id="crises-harms-view-crud-modal-3" className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                {editingCrisis ? 'ویرایش مشخصات بحران / آسیب محلی' : 'ثبت بحران یا آسیب جدید در سامانه ملی'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div id="crises-harms-view-crud-modal-4">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">عنوان بحران یا آسیب *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: تنش شدید آبی و فرسودگی شبکه آبرسانی روستایی"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div id="crises-harms-view-crud-modal-5" className="grid grid-cols-2 gap-3">
                <div id="crises-harms-view-crud-modal-6">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">کد شناسایی بحران</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="crises-harms-view-crud-modal-7">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">سطح فوریت و اولویت</label>
                  <select
                    value={formUrgency}
                    onChange={(e) => setFormUrgency(e.target.value as UrgencyLevel)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="CRITICAL">بحرانی و فوری (اقدام عاجل)</option>
                    <option value="HIGH">شدت بالا</option>
                    <option value="MEDIUM">شدت متوسط</option>
                    <option value="LOW">قابل پایش</option>
                  </select>
                </div>
              </div>

              <div id="crises-harms-view-crud-modal-8" className="grid grid-cols-2 gap-3">
                <div id="crises-harms-view-crud-modal-9">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">دسته آسیب / موضوع</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="آب شرب، راه، بهداشت، اعتیاد..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
                <div id="crises-harms-view-crud-modal-10">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">محدوده / روستا / بخش</label>
                  <input
                    type="text"
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    placeholder="مثال: بخش کشکوئیه و دهستان راویز"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div id="crises-harms-view-crud-modal-11" className="grid grid-cols-2 gap-3">
                <div id="crises-harms-view-crud-modal-12">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">شاخص شدت محرومیت (۰-۱۰۰)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="crises-harms-view-crud-modal-13">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">جمعیت تحت تأثیر مستقیم (نفر)</label>
                  <input
                    type="number"
                    min="1"
                    value={formAffectedPop}
                    onChange={(e) => setFormAffectedPop(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div id="crises-harms-view-crud-modal-14">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ریشه و علت اصلی معضل</label>
                <textarea
                  rows={2}
                  value={formCause}
                  onChange={(e) => setFormCause(e.target.value)}
                  placeholder="چرا این بحران به وجود آمده و چه عواملی تشدیدش کرده‌اند..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div id="crises-harms-view-crud-modal-15">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">مداخله و پروژه پیشنهادی جهت حل مسئله</label>
                <textarea
                  rows={2}
                  value={formSolution}
                  onChange={(e) => setFormSolution(e.target.value)}
                  placeholder="اقدام فنی، مهندسی یا اجتماعی مورد نیاز..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div id="crises-harms-view-crud-modal-16" className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-600/30"
                >
                  {editingCrisis ? 'ذخیره تغییرات' : 'ثبت بحران در سامانه'}
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
