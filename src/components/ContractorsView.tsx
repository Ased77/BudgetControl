import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Contractor, ContractorGrade } from '../types';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { formatToman, toPersianDigits } from '../utils/numberUtils';
import {
  HardHat,
  Plus,
  Search,
  Filter,
  Star,
  CheckCircle2,
  Building,
  Phone,
  Edit,
  Trash2,
  X,
  FileCheck2,
} from 'lucide-react';
import { useConfirmDelete } from './ConfirmDeleteModal';

export const ContractorsView: React.FC = () => {
  const {
    contractors,
    projects,
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

  // Aggregate stats
  const totalContractsValue = useMemo(() => contractors.reduce((s, c) => s + c.totalContractValueToman, 0), [contractors]);
  const avgScore = useMemo(
    () => (contractors.length > 0 ? Math.round(contractors.reduce((s, c) => s + c.performanceScore, 0) / contractors.length) : 0),
    [contractors]
  );
  const localVerifiedCount = useMemo(() => contractors.filter((c) => c.grade === 'LOCAL_AUTHORIZED').length, [contractors]);

  return (
    <div id="contractors-view-root" className="space-y-6">
      {/* Header Banner (Light Theme) */}
      <div id="contractors-view-header-banner-light-theme" className="bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-amber-200/80 shadow-2xs relative overflow-hidden">
        <div id="contractors-view-header-banner-light-theme-2" className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div id="contractors-view-header-banner-light-theme-3">
            <div id="contractors-view-header-banner-light-theme-4" className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                پیمانکاران ذیصلاح و شرکت‌های فنی‌مهندسی
              </span>
              <span className="text-xs text-slate-500">نظام رتبه‌بندی کیفی و اولویت‌دهی به نیروهای بومی</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <HardHat className="w-7 h-7 text-amber-600" />
              بانک اطلاعات پیمانکاران احراز صلاحیت‌شده
            </h1>
            <p className="text-slate-600 text-sm mt-1 max-w-3xl leading-relaxed">
              ثبت و ارزیابی فنی پیمانکاران بر اساس رتبه‌بندی سازمان برنامه و بودجه، سابقه اجرایی، نمره کیفیت و سقف مجاز پیمان‌ها.
              پروژه‌های روستایی با تأکید بر استفاده از پیمانکاران بومی تأیید صلاحیت‌شده جهت اشتغال‌زایی پایدار کنترل می‌شوند.
            </p>
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
            <option value="ALL">همه پایه‌ها ({contractors.length})</option>
            <option value="GRADE_1">پایه ۱ (کشوری)</option>
            <option value="GRADE_2">پایه ۲</option>
            <option value="GRADE_3">پایه ۳</option>
            <option value="GRADE_4">پایه ۴</option>
            <option value="GRADE_5">پایه ۵</option>
            <option value="LOCAL_AUTHORIZED">بومی معتمد دهیاری</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div id="contractors-view-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContractors.map((cnt) => {
          const cntProjects = projects.filter((p) => p.contractorId === cnt.id);

          return (
            <div
              id="contractors-view-grid-card"
              key={cnt.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div id={`contractors-view-grid-3-${cnt.id}`}>
                <div id={`contractors-view-grid-4-${cnt.id}`} className="flex items-start justify-between gap-2 mb-3">
                  <div id={`contractors-view-grid-5-${cnt.id}`} className="flex items-center gap-2.5">
                    <div id={`contractors-view-grid-6-${cnt.id}`} className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Building className="w-5 h-5" />
                    </div>
                    <div id={`contractors-view-grid-7-${cnt.id}`}>
                      <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{cnt.nationalId}</span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">{cnt.companyName}</h3>
                    </div>
                  </div>

                  {cnt.grade === 'LOCAL_AUTHORIZED' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      بومی معتبر
                    </span>
                  )}
                </div>

                <div id={`contractors-view-grid-8-${cnt.id}`} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800/80 mb-4">
                  <div id={`contractors-view-grid-9-${cnt.id}`} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">مدیرعامل:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{cnt.ceoName}</span>
                  </div>
                  <div id={`contractors-view-grid-10-${cnt.id}`} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">رتبه صلاحیت:</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">{cnt.gradeFa}</span>
                  </div>
                  <div id={`contractors-view-grid-11-${cnt.id}`} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">رشته تخصصی:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{cnt.specialtyField}</span>
                  </div>
                  <div id={`contractors-view-grid-12-${cnt.id}`} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      تماس:
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">{cnt.phone}</span>
                  </div>
                </div>

                {/* Capacity and Contracts */}
                <div id={`contractors-view-capacity-and-contracts-${cnt.id}`} className="space-y-2 mb-4 text-xs">
                  <div id={`contractors-view-capacity-and-contracts-2-${cnt.id}`} className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">ظرفیت آزاد پیمان:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{toPersianDigits(cnt.freeCapacitySlots)} پروژه</span>
                  </div>
                  <div id={`contractors-view-capacity-and-contracts-3-${cnt.id}`} className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">مجموع قراردادهای فعال:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{formatToman(cnt.totalContractValueToman)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div id={`contractors-view-footer-${cnt.id}`} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div id={`contractors-view-footer-2-${cnt.id}`} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <FileCheck2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>{toPersianDigits(cntProjects.length)} قرارداد فعال</span>
                </div>

                <div id={`contractors-view-footer-3-${cnt.id}`} className="flex items-center gap-1.5">
                  <div id={`contractors-view-footer-4-${cnt.id}`} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800/40">
                    <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                    <span>{toPersianDigits(cnt.performanceScore)}</span>
                  </div>

                  {canManage && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(cnt)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="ویرایش پیمانکار"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          confirmDelete(`آیا از حذف پیمانکار «${cnt.companyName}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`, () =>
                            handleDeleteContractor(cnt.id)
                          )
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="حذف پیمانکار"
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
                    onChange={(e) => setFormStatus(e.target.value as any)}
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
