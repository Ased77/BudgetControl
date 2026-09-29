import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Contractor, ContractorGrade } from '../types';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { compactToman, formatToman, toPersianDigits } from '../utils/numberUtils';
import { PROJECT_STATUS_META } from '../utils/projectStatusMeta';
import { PageHeader } from './PageHeader';
import {
  HardHat,
  Plus,
  Search,
  Filter,
  Star,
  CheckCircle2,
  Phone,
  Edit,
  Trash2,
  X,
  FileCheck2,
  User,
  Briefcase,
  Banknote,
  MapPin,
  AlertCircle,
  Award,
} from 'lucide-react';
import { useConfirmDelete } from './ConfirmDeleteModal';

/** Radius of the quality-score ring drawn on each contractor card. */
const GAUGE_RADIUS = 22;

/** Qualification-status copy and pill colours, keyed by the contractor's status. */
const STATUS_LABELS: Record<Contractor['status'], string> = {
  VERIFIED: 'تأیید صلاحیت‌شده',
  UNDER_EVALUATION: 'در حال ارزیابی اسناد',
  SUSPENDED: 'تعلیق موقت',
};

const STATUS_PILL: Record<Contractor['status'], string> = {
  VERIFIED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  UNDER_EVALUATION: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  SUSPENDED: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
};

/**
 * Colour of the quality gauge follows the score itself rather than the
 * contractor's grade, so the ring reads delivery quality at a glance: a strong
 * record writes green (≥ ۹۰), a passable one amber (۸۴–۸۹) and a weak one red
 * (below ۸۴).
 */
function qualityGaugeTone(score: number): string {
  if (score >= 90) return 'stroke-emerald-500 dark:stroke-emerald-400';
  if (score >= 84) return 'stroke-amber-500 dark:stroke-amber-400';
  return 'stroke-rose-500 dark:stroke-rose-400';
}

export const ContractorsView: React.FC = () => {
  const {
    contractors,
    projects,
    selectedLocation,
    handleAddContractor,
    handleUpdateContractor,
    handleDeleteContractor,
    currentUser,
    getUserPermissions,
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(modalRef, () => setIsModalOpen(false));
  const [editingCnt, setEditingCnt] = useState<Contractor | null>(null);
  const { confirmDelete, modal: deleteConfirmModal } = useConfirmDelete();

  // Read-only drill-down of a single contractor
  const [detailCnt, setDetailCnt] = useState<Contractor | null>(null);
  const detailModalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(detailModalRef, () => setDetailCnt(null));

  // Form State
  const [formName, setFormName] = useState('');
  const [formNationalId, setFormNationalId] = useState('');
  const [formCeo, setFormCeo] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formGrade, setFormGrade] = useState<ContractorGrade>('GRADE_3');
  const [formSpecialty, setFormSpecialty] = useState('آب و فاضلاب و هیدرولیک');
  const [formFreeCapacity, setFormFreeCapacity] = useState<number>(3);
  const [formScore, setFormScore] = useState<number>(88);
  const [formRating, setFormRating] = useState<number>(4.5);
  const [formStatus, setFormStatus] = useState<'VERIFIED' | 'UNDER_EVALUATION' | 'SUSPENDED'>('VERIFIED');

  const userPerm = getUserPermissions(currentUser);
  const canManage = userPerm ? userPerm.canManageContractors : currentUser.role === 'ADMIN';

  const gradeLabels: Record<ContractorGrade, string> = {
    GRADE_1: 'پایه ۱ (کشوری / نامحدود)',
    GRADE_2: 'پایه ۲ (بزرگ‌مقیاس)',
    GRADE_3: 'پایه ۳ (متوسط استانی)',
    GRADE_4: 'پایه ۴ (محلی و شهرستانی)',
    GRADE_5: 'پایه ۵ (روستایی و خرد)',
    LOCAL_AUTHORIZED: 'پیمانکار بومی معتمد دهیاری',
  };

  const handleOpenAdd = () => {
    setEditingCnt(null);
    setFormName('');
    setFormNationalId(`1400${Math.floor(100000 + Math.random() * 900000)}`);
    setFormCeo('');
    setFormPhone('');
    setFormGrade('GRADE_3');
    setFormSpecialty('آب و فاضلاب و هیدرولیک');
    setFormFreeCapacity(3);
    setFormScore(88);
    setFormRating(4.5);
    setFormStatus('VERIFIED');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cnt: Contractor) => {
    setEditingCnt(cnt);
    setFormName(cnt.companyName);
    setFormNationalId(cnt.nationalId);
    setFormCeo(cnt.ceoName);
    setFormPhone(cnt.phone);
    setFormGrade(cnt.grade);
    setFormSpecialty(cnt.specialtyField);
    setFormFreeCapacity(cnt.freeCapacitySlots);
    setFormScore(cnt.performanceScore);
    setFormRating(cnt.satisfactionRating);
    setFormStatus(cnt.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingCnt) {
      handleUpdateContractor({
        ...editingCnt,
        companyName: formName.trim(),
        nationalId: formNationalId.trim(),
        ceoName: formCeo.trim(),
        phone: formPhone.trim(),
        grade: formGrade,
        gradeFa: gradeLabels[formGrade] || 'نامشخص',
        specialtyField: formSpecialty.trim(),
        freeCapacitySlots: Number(formFreeCapacity),
        performanceScore: Number(formScore),
        satisfactionRating: Number(formRating),
        status: formStatus,
      });
    } else {
      handleAddContractor({
        companyName: formName.trim(),
        nationalId: formNationalId.trim(),
        ceoName: formCeo.trim(),
        phone: formPhone.trim(),
        grade: formGrade,
        gradeFa: gradeLabels[formGrade] || 'نامشخص',
        specialtyField: formSpecialty.trim(),
        activeContractsCount: 0,
        totalContractValueToman: 0,
        freeCapacitySlots: Number(formFreeCapacity),
        performanceScore: Number(formScore),
        satisfactionRating: Number(formRating),
        status: formStatus,
        province: selectedLocation.province,
        county: selectedLocation.county,
      });
    }
    setIsModalOpen(false);
  };

  // Filtered
  const filteredContractors = useMemo(() => {
    return contractors.filter((c) => {
      const matchQ =
        c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.ceoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nationalId.includes(searchQuery);
      const matchG = selectedGrade === 'ALL' || c.grade === selectedGrade;
      const matchS = selectedSpecialty === 'ALL' || c.specialtyField.includes(selectedSpecialty);
      return matchQ && matchG && matchS;
    });
  }, [contractors, searchQuery, selectedGrade, selectedSpecialty]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedGrade('ALL');
    setSelectedSpecialty('ALL');
  };

  // Aggregate stats
  const totalContractsValue = useMemo(() => contractors.reduce((s, c) => s + c.totalContractValueToman, 0), [contractors]);
  const avgScore = useMemo(
    () => (contractors.length > 0 ? Math.round(contractors.reduce((s, c) => s + c.performanceScore, 0) / contractors.length) : 0),
    [contractors]
  );
  const localVerifiedCount = useMemo(() => contractors.filter((c) => c.grade === 'LOCAL_AUTHORIZED').length, [contractors]);

  return (
    <div id="contractors-view-root" className="space-y-6">
      {/* Page title block — above the banner, per the page-header reference. */}
      <PageHeader
        id="contractors-view-page-header"
        icon={HardHat}
        title="بانک اطلاعات پیمانکاران احراز صلاحیت‌شده"
        subtitle={`${toPersianDigits(contractors.length)} شرکت ثبت‌شده — صلاحیت، ظرفیت و کیفیت هر پیمانکار در ${selectedLocation.province} - ${selectedLocation.county}`}
        tone="text-amber-600"
      />

      {/* Banner — section label, actions and the micro-KPI strip. */}
      <div id="contractors-view-header-banner-light-theme" className="bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-amber-200/80 shadow-2xs relative overflow-hidden">
        <div id="contractors-view-header-banner-light-theme-2" className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div id="contractors-view-header-banner-light-theme-4" className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              پیمانکاران ذیصلاح و شرکت‌های فنی‌مهندسی
            </span>
          </div>

          <div id="contractors-view-header-banner-light-theme-5" className="flex items-center gap-3 self-start md:self-auto">
            {canManage && (
              <button
                id="btn-add-contractor"
                onClick={handleOpenAdd}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-amber-600/25 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت پیمانکار جدید</span>
              </button>
            )}
          </div>
        </div>

        {/* Micro-KPI Strip */}
        <div id="contractors-view-micro-kpi-strip" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-amber-200/60">
          <div id="contractors-view-micro-kpi-strip-2" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">پیمانکاران احراز صلاحیت شده</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{toPersianDigits(contractors.length)} شرکت</span>
          </div>
          <div id="contractors-view-micro-kpi-strip-3" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">ارزش کل پیمان‌های فعال</span>
            <span className="text-xl font-black text-amber-700 mt-0.5 block font-mono">{formatToman(totalContractsValue)}</span>
          </div>
          <div id="contractors-view-micro-kpi-strip-4" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">میانگین نمره ارزیابی کیفی</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block flex items-center gap-1 font-mono">
              <Star className="w-4 h-4 fill-emerald-600 text-emerald-600" />
              {toPersianDigits(avgScore)} از ۱۰۰
            </span>
          </div>
          <div id="contractors-view-micro-kpi-strip-5" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">پیمانکاران بومی معتمد</span>
            <span className="text-xl font-black text-blue-700 mt-0.5 block font-mono">{toPersianDigits(localVerifiedCount)} شرکت بومی</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div id="contractors-view-filter-and-search-bar" className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div id="contractors-view-filter-and-search-bar-2" className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="جستجوی نام شرکت، مدیرعامل، شناسه ملی..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div id="contractors-view-filter-and-search-bar-3" className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div id="contractors-view-filter-and-search-bar-4" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>رتبه صلاحیت:</span>
          </div>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">همه پایه‌ها ({toPersianDigits(contractors.length)})</option>
            <option value="GRADE_1">پایه ۱ (کشوری)</option>
            <option value="GRADE_2">پایه ۲</option>
            <option value="GRADE_3">پایه ۳</option>
            <option value="GRADE_4">پایه ۴</option>
            <option value="GRADE_5">پایه ۵</option>
            <option value="LOCAL_AUTHORIZED">بومی معتمد دهیاری</option>
          </select>
        </div>
      </div>

      {/* Contractors Grid — each card summarises one contractor and opens a drill-down modal */}
      {filteredContractors.length > 0 ? (
        <div id="contractors-view-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredContractors.map((cnt) => {
            const cntProjects = projects.filter((p) => p.contractorId === cnt.id);
            const contractValue = compactToman(cnt.totalContractValueToman);

            return (
              <article
                id={`contractors-view-card-${cnt.id}`}
                key={cnt.id}
                onClick={() => setDetailCnt(cnt)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDetailCnt(cnt);
                  }
                }}
                title="کلیک برای مشاهده جزئیات پیمانکار"
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md cursor-pointer transition-all flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {/* Identity — centred emblem over the company name. */}
                <div id={`contractors-view-card-identity-${cnt.id}`} className="p-5 pb-4 flex flex-col items-center text-center">
                  <div
                    id={`contractors-view-card-icon-${cnt.id}`}
                    className="w-20 h-20 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0"
                  >
                    <HardHat className="w-10 h-10" />
                  </div>

                  <div id={`contractors-view-card-title-${cnt.id}`} className="mt-3 w-full min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{cnt.nationalId}</span>
                    <h3
                      className="font-black text-base text-slate-900 dark:text-slate-100 leading-tight min-w-0 line-clamp-2 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors"
                      title={cnt.companyName}
                    >
                      {cnt.companyName}
                    </h3>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
                    <span
                      id={`contractors-view-card-grade-${cnt.id}`}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    >
                      {cnt.gradeFa}
                    </span>
                    <span
                      id={`contractors-view-card-status-${cnt.id}`}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUS_PILL[cnt.status]}`}
                    >
                      {STATUS_LABELS[cnt.status]}
                    </span>
                    {cnt.grade === 'LOCAL_AUTHORIZED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        بومی معتبر
                      </span>
                    )}
                  </div>

                  <div
                    id={`contractors-view-card-meta-${cnt.id}`}
                    className="flex items-center justify-center gap-3 mt-3 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap"
                  >
                    <span className="flex items-center gap-1 min-w-0">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{cnt.ceoName}</span>
                    </span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="font-mono">{cnt.phone}</span>
                    </span>
                  </div>
                </div>

                {/* Three-metric strip: quality gauge / free capacity / contract value */}
                <div
                  id={`contractors-view-card-metrics-${cnt.id}`}
                  className="mt-auto grid grid-cols-3 items-stretch border-y border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 rounded-b-2xl"
                >
                  <div id={`contractors-view-card-gauge-${cnt.id}`} className="flex items-center justify-center py-3">
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
                          className={`transition-all duration-500 ${qualityGaugeTone(cnt.performanceScore)}`}
                          strokeDasharray={2 * Math.PI * GAUGE_RADIUS}
                          strokeDashoffset={2 * Math.PI * GAUGE_RADIUS * (1 - cnt.performanceScore / 100)}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-800 dark:text-slate-100">
                        {toPersianDigits(cnt.performanceScore)}
                      </span>
                    </div>
                  </div>

                  <div
                    id={`contractors-view-card-capacity-metric-${cnt.id}`}
                    className="flex flex-col items-center justify-center gap-0.5 px-1 py-3 border-x border-slate-100 dark:border-slate-800 text-center"
                  >
                    <span className="text-base font-black text-slate-900 dark:text-slate-100 leading-none">
                      {toPersianDigits(cnt.freeCapacitySlots)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <Briefcase className="w-3 h-3 text-slate-400" />
                      ظرفیت آزاد
                    </span>
                  </div>

                  <div
                    id={`contractors-view-card-value-metric-${cnt.id}`}
                    className="flex flex-col items-center justify-center gap-0.5 px-1 py-3 text-center"
                  >
                    <span className="text-base font-black text-slate-900 dark:text-slate-100 leading-none">{contractValue.value}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <Banknote className="w-3 h-3 text-slate-400" />
                      {contractValue.unit}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div
          id="contractors-view-empty-state"
          className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800"
        >
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">هیچ پیمانکاری با این مشخصات یافت نشد</h3>
          <p className="text-xs text-slate-400 mt-1">لطفاً عبارت جستجو یا فیلترهای خود را تغییر دهید.</p>
          <button
            id="btn-reset-contractor-filters"
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            پاک‌سازی جستجو و فیلترها
          </button>
        </div>
      )}

      {/* Contractor Drill-down Modal */}
      {detailCnt &&
        (() => {
          const cntProjects = projects.filter((p) => p.contractorId === detailCnt.id);
          const detailGaugeRadius = 32;

          return (
            <div id="contractors-view-detail-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div
                id="contractors-view-detail-modal-panel"
                ref={detailModalRef}
                className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
              >
                {/* Header */}
                <div id="contractors-view-detail-modal-header" className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      id="contractors-view-detail-modal-icon"
                      className="w-12 h-12 rounded-2xl border bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"
                    >
                      <HardHat className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{detailCnt.nationalId}</span>
                      <h3 className="font-black text-base text-slate-900 dark:text-slate-100 leading-tight">{detailCnt.companyName}</h3>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                          {detailCnt.gradeFa}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_PILL[detailCnt.status]}`}>
                          {STATUS_LABELS[detailCnt.status]}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {detailCnt.county ? `${detailCnt.province} - ${detailCnt.county}` : detailCnt.province}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    id="btn-close-contractor-details"
                    onClick={() => setDetailCnt(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                    title="بستن"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div id="contractors-view-detail-modal-body" className="p-5 space-y-4 text-xs">
                  {/* Company identity & contact */}
                  <div id="contractors-view-detail-modal-contact" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      id="contractors-view-detail-modal-contact-ceo"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <User className="w-3.5 h-3.5" />
                        مدیرعامل
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{detailCnt.ceoName}</span>
                    </div>
                    <div
                      id="contractors-view-detail-modal-contact-phone"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <Phone className="w-3.5 h-3.5" />
                        شماره تماس دفتر
                      </span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{detailCnt.phone}</span>
                    </div>
                    <div
                      id="contractors-view-detail-modal-contact-specialty"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <HardHat className="w-3.5 h-3.5" />
                        رشته تخصصی
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{detailCnt.specialtyField}</span>
                    </div>
                    <div
                      id="contractors-view-detail-modal-contact-projects"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <FileCheck2 className="w-3.5 h-3.5" />
                        قراردادهای فعال
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {toPersianDigits(cntProjects.length)} مورد
                      </span>
                    </div>
                  </div>

                  {/* Quality & capacity */}
                  <div
                    id="contractors-view-detail-modal-quality"
                    className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        ارزیابی کیفی و ظرفیت پیمان
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        رضایت کارفرما {toPersianDigits(detailCnt.satisfactionRating)} از ۵
                      </span>
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
                            className={`transition-all duration-500 ${qualityGaugeTone(detailCnt.performanceScore)}`}
                            strokeDasharray={2 * Math.PI * detailGaugeRadius}
                            strokeDashoffset={2 * Math.PI * detailGaugeRadius * (1 - detailCnt.performanceScore / 100)}
                          />
                        </svg>
                        <span className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                            {toPersianDigits(detailCnt.performanceScore)}
                          </span>
                          <span className="text-[9px] text-slate-400">از ۱۰۰</span>
                        </span>
                      </div>

                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">ظرفیت آزاد پیمان</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {toPersianDigits(detailCnt.freeCapacitySlots)} پروژه
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">ارزش قراردادهای فعال</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {formatToman(detailCnt.totalContractValueToman)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">وضعیت احراز صلاحیت</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{STATUS_LABELS[detailCnt.status]}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Linked projects */}
                  <div id="contractors-view-detail-modal-projects">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-amber-500" />
                        پروژه‌های سپرده‌شده به این پیمانکار
                      </span>
                      <span className="text-[10px] text-slate-400">{toPersianDigits(cntProjects.length)} پروژه ثبت‌شده</span>
                    </div>

                    {cntProjects.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <AlertCircle className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                        <p className="text-[11px] text-slate-400">پروژه‌ای با پیمانکاری مستقیم این شرکت ثبت نشده است.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {cntProjects.map((proj) => (
                          <div
                            id={`contractors-view-detail-modal-project-${proj.id}`}
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
                                  className={`h-full rounded-full ${proj.progressPercentage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
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
                  id="contractors-view-detail-modal-footer"
                  className="sticky bottom-0 flex items-center justify-between gap-3 p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <span className="text-[10px] text-slate-400 font-mono truncate">شناسه ملی: {detailCnt.nationalId}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {canManage && (
                      <>
                        <button
                          id="btn-edit-contractor-from-details"
                          type="button"
                          onClick={() => {
                            const target = detailCnt;
                            setDetailCnt(null);
                            handleOpenEdit(target);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[11px] border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/70 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          ویرایش مشخصات
                        </button>
                        <button
                          id="btn-delete-contractor-from-details"
                          type="button"
                          onClick={() => {
                            const target = detailCnt;
                            setDetailCnt(null);
                            confirmDelete(
                              `آیا از حذف پیمانکار «${target.companyName}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`,
                              () => handleDeleteContractor(target.id)
                            );
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          حذف پیمانکار
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
        <div id="contractors-view-crud-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div id="contractors-view-crud-modal-2" ref={modalRef} className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div id="contractors-view-crud-modal-3" className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <HardHat className="w-5 h-5 text-amber-500" />
                {editingCnt ? 'ویرایش مشخصات شرکت پیمانکار' : 'ثبت و احراز صلاحیت پیمانکار جدید'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div id="contractors-view-crud-modal-4">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">نام کامل شرکت / تعاونی *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: شرکت مهندسی آب‌سازه کویر"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div id="contractors-view-crud-modal-5" className="grid grid-cols-2 gap-3">
                <div id="contractors-view-crud-modal-6">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">شناسه ملی شرکت *</label>
                  <input
                    type="text"
                    required
                    value={formNationalId}
                    onChange={(e) => setFormNationalId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="contractors-view-crud-modal-7">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">نام مدیرعامل *</label>
                  <input
                    type="text"
                    required
                    value={formCeo}
                    onChange={(e) => setFormCeo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div id="contractors-view-crud-modal-8" className="grid grid-cols-2 gap-3">
                <div id="contractors-view-crud-modal-9">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">شماره تماس دفتر *</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="contractors-view-crud-modal-10">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">رتبه تشخیص صلاحیت</label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value as ContractorGrade)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="GRADE_1">پایه ۱ (کشوری)</option>
                    <option value="GRADE_2">پایه ۲ (بزرگ‌مقیاس)</option>
                    <option value="GRADE_3">پایه ۳ (متوسط)</option>
                    <option value="GRADE_4">پایه ۴ (شهرستانی)</option>
                    <option value="GRADE_5">پایه ۵ (خرد)</option>
                    <option value="LOCAL_AUTHORIZED">بومی معتمد دهیاری</option>
                  </select>
                </div>
              </div>

              <div id="contractors-view-crud-modal-11" className="grid grid-cols-2 gap-3">
                <div id="contractors-view-crud-modal-12">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">رشته و زمینه تخصصی</label>
                  <input
                    type="text"
                    required
                    value={formSpecialty}
                    onChange={(e) => setFormSpecialty(e.target.value)}
                    placeholder="راه و ترابری، آب، ابنیه..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div id="contractors-view-crud-modal-13">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ظرفیت آزاد قرارداد (تعداد)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={formFreeCapacity}
                    onChange={(e) => setFormFreeCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div id="contractors-view-crud-modal-14" className="grid grid-cols-2 gap-3">
                <div id="contractors-view-crud-modal-15">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">نمره کیفیت و سابقه (۰ تا ۱۰۰)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formScore}
                    onChange={(e) => setFormScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="contractors-view-crud-modal-16">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">وضعیت احراز صلاحیت</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as Contractor['status'])}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="VERIFIED">تأیید صلاحیت‌شده (معتبر)</option>
                    <option value="UNDER_EVALUATION">در حال ارزیابی اسناد</option>
                    <option value="SUSPENDED">تعلیق موقت</option>
                  </select>
                </div>
              </div>

              <div id="contractors-view-crud-modal-17" className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-600/30"
                >
                  {editingCnt ? 'ذخیره تغییرات' : 'ثبت نهایی پیمانکار'}
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
