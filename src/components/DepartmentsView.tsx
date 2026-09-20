import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Department, AdministrativeLevel } from '../types';
import { useOutsideClick } from '../hooks/useOutsideClick';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Edit,
  Trash2,
  CheckCircle2,
  TrendingUp,
  FolderGit2,
  Award,
  X,
  AlertCircle,
} from 'lucide-react';
import { formatToman, toPersianDigits } from '../utils/numberUtils';
import { useConfirmDelete } from './ConfirmDeleteModal';

export const DepartmentsView: React.FC = () => {
  const {
    departments,
    projects,
    handleAddDepartment,
    handleUpdateDepartment,
    handleDeleteDepartment,
    currentUser,
    getUserPermissions,
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(modalRef, () => setIsModalOpen(false));
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const { confirmDelete, modal: deleteConfirmModal } = useConfirmDelete();

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState<Department['category']>('INFRASTRUCTURE');
  const [formCategoryFa, setFormCategoryFa] = useState('زیرساخت و عمران');
  const [formHeadName, setFormHeadName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAllocated, setFormAllocated] = useState<number>(500_000_000_000);
  const [formAbsorbed, setFormAbsorbed] = useState<number>(200_000_000_000);
  const [formScore, setFormScore] = useState<number>(85);
  const [formLevel, setFormLevel] = useState<AdministrativeLevel>('COUNTY');
  const [formProvince, setFormProvince] = useState('کرمان');
  const [formCounty, setFormCounty] = useState('شهرستان رفسنجان');
  const [formDesc, setFormDesc] = useState('');

  // Check user permission
  const userPerm = getUserPermissions(currentUser);
  const canEdit = userPerm ? userPerm.canEditDepartments : currentUser.role === 'ADMIN';

  // Category mapping
  const categoryLabels: Record<Department['category'], string> = {
    INFRASTRUCTURE: 'زیرساخت و عمران',
    HEALTH: 'بهداشت و درمان',
    EDUCATION: 'آموزش و پرورش',
    SOCIAL_WELFARE: 'حمایت اجتماعی و بهزیستی',
    AGRICULTURE: 'کشاورزی و منابع طبیعی',
    ENVIRONMENT: 'محیط زیست',
    MUNICIPAL_RURAL: 'امور دهیاری‌ها و شهری',
  };

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormName('');
    setFormCode(`DEP-${Math.floor(100 + Math.random() * 900)}`);
    setFormCategory('INFRASTRUCTURE');
    setFormCategoryFa('زیرساخت و عمران');
    setFormHeadName('');
    setFormPhone('');
    setFormEmail('');
    setFormAllocated(500_000_000_000);
    setFormAbsorbed(0);
    setFormScore(85);
    setFormLevel('COUNTY');
    setFormProvince('کرمان');
    setFormCounty('شهرستان رفسنجان');
    setFormDesc('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormCode(dept.code);
    setFormCategory(dept.category);
    setFormCategoryFa(dept.categoryFa);
    setFormHeadName(dept.headPersonName);
    setFormPhone(dept.contactNumber);
    setFormEmail(dept.email || '');
    setFormAllocated(dept.allocatedBudgetToman);
    setFormAbsorbed(dept.absorbedBudgetToman);
    setFormScore(dept.performanceScore);
    setFormLevel(dept.administrativeLevel);
    setFormProvince(dept.province);
    setFormCounty(dept.county || 'شهرستان رفسنجان');
    setFormDesc(dept.description);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingDept) {
      handleUpdateDepartment({
        ...editingDept,
        name: formName.trim(),
        code: formCode.trim(),
        category: formCategory,
        categoryFa: categoryLabels[formCategory] || formCategoryFa,
        headPersonName: formHeadName.trim(),
        contactNumber: formPhone.trim(),
        email: formEmail.trim(),
        allocatedBudgetToman: Number(formAllocated),
        absorbedBudgetToman: Number(formAbsorbed),
        performanceScore: Number(formScore),
        administrativeLevel: formLevel,
        province: formProvince,
        county: formCounty,
        description: formDesc.trim(),
      });
    } else {
      handleAddDepartment({
        name: formName.trim(),
        code: formCode.trim(),
        category: formCategory,
        categoryFa: categoryLabels[formCategory] || formCategoryFa,
        headPersonName: formHeadName.trim(),
        contactNumber: formPhone.trim(),
        email: formEmail.trim(),
        allocatedBudgetToman: Number(formAllocated),
        absorbedBudgetToman: Number(formAbsorbed),
        activeProjectsCount: 0,
        performanceScore: Number(formScore),
        administrativeLevel: formLevel,
        province: formProvince,
        county: formCounty,
        description: formDesc.trim(),
      });
    }
    setIsModalOpen(false);
  };

  // Filtered Departments
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const matchQuery =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.headPersonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'ALL' || d.category === selectedCategory;
      const matchLvl = selectedLevel === 'ALL' || d.administrativeLevel === selectedLevel;
      return matchQuery && matchCat && matchLvl;
    });
  }, [departments, searchQuery, selectedCategory, selectedLevel]);

  // Aggregate stats
  const totalAllocated = useMemo(() => departments.reduce((s, d) => s + d.allocatedBudgetToman, 0), [departments]);
  const totalAbsorbed = useMemo(() => departments.reduce((s, d) => s + d.absorbedBudgetToman, 0), [departments]);
  const avgPerformance = useMemo(
    () => (departments.length > 0 ? Math.round(departments.reduce((s, d) => s + d.performanceScore, 0) / departments.length) : 0),
    [departments]
  );

  return (
    <div id="departments-view-root" className="space-y-6">
      {/* Header Banner (Light Theme) */}
      <div id="departments-view-header-banner-light-theme" className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-blue-200/80 shadow-2xs relative overflow-hidden">
        <div id="departments-view-header-banner-light-theme-2" className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div id="departments-view-header-banner-light-theme-3">
            <div id="departments-view-header-banner-light-theme-4" className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                دستگاه‌های اجرایی و نهادهای حاکمیتی
              </span>
              <span className="text-xs text-slate-500">ماتریس متولیان و انضباط بودجه‌ای</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <Building2 className="w-7 h-7 text-blue-600" />
              ادارات، نهادها و دستگاه‌های متولی توسعه
            </h1>
            <p className="text-slate-600 text-sm mt-1 max-w-3xl leading-relaxed">
              پایش و مدیریت یکپارچه دستگاه‌های دولتی، نهادهای عمومی و دهیاری‌های فعال در سامانه ملی. هر پروژه و ردیف بودجه مشخصاً
              به اداره متولی متصل بوده و عملکرد جذب آن در لحظه سنجیده می‌شود.
            </p>
          </div>

          <div id="departments-view-header-banner-light-theme-5" className="flex items-center gap-3 self-start md:self-auto">
            {canEdit && (
              <button
                id="btn-add-department"
                onClick={handleOpenAdd}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-blue-600/25 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت نهاد / اداره جدید</span>
              </button>
            )}
          </div>
        </div>

        {/* Micro-KPI Strip */}
        <div id="departments-view-micro-kpi-strip" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-blue-200/60">
          <div id="departments-view-micro-kpi-strip-2" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">کل نهادهای فعال</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{toPersianDigits(departments.length)} نهاد</span>
          </div>
          <div id="departments-view-micro-kpi-strip-3" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">مجموع بودجه مصوب</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block font-mono">{formatToman(totalAllocated)}</span>
          </div>
          <div id="departments-view-micro-kpi-strip-4" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">بودجه جذب‌شده</span>
            <span className="text-xl font-black text-blue-700 mt-0.5 block font-mono">{formatToman(totalAbsorbed)}</span>
          </div>
          <div id="departments-view-micro-kpi-strip-5" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">میانگین امتیاز عملکرد</span>
            <span className="text-xl font-black text-amber-700 mt-0.5 block flex items-center gap-1 font-mono">
              <Award className="w-4 h-4" />
              {toPersianDigits(avgPerformance)} از ۱۰۰
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div id="departments-view-filter-and-search-bar" className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div id="departments-view-filter-and-search-bar-2" className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="جستجوی نام اداره، مدیر یا کد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div id="departments-view-filter-and-search-bar-3" className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div id="departments-view-filter-and-search-bar-4" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>حوزه فعالیت:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">همه حوزه‌ها ({toPersianDigits(departments.length)})</option>
            <option value="INFRASTRUCTURE">زیرساخت و عمران</option>
            <option value="HEALTH">بهداشت و درمان</option>
            <option value="EDUCATION">آموزش و پرورش</option>
            <option value="SOCIAL_WELFARE">حمایت اجتماعی</option>
            <option value="ENVIRONMENT">محیط زیست</option>
            <option value="MUNICIPAL_RURAL">دهیاری‌ها و روستایی</option>
          </select>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">همه سطوح اداری</option>
            <option value="NATIONAL">ملی / کشوری</option>
            <option value="PROVINCIAL">استانی</option>
            <option value="COUNTY">شهرستانی</option>
            <option value="RURAL_DISTRICT">بخشداری / دهیاری</option>
          </select>
        </div>
      </div>

      {/* Departments Grid */}
      <div id="departments-view-departments-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDepartments.map((dept) => {
          const deptProjects = projects.filter((p) => p.departmentId === dept.id);
          const absorptionRate =
            dept.allocatedBudgetToman > 0
              ? Math.min(100, Math.round((dept.absorbedBudgetToman / dept.allocatedBudgetToman) * 100))
              : 0;

          return (
            <div
              id={`departments-view-departments-grid-2-${dept.id}`}
              key={dept.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div id={`departments-view-departments-grid-3-${dept.id}`}>
                <div id={`departments-view-departments-grid-4-${dept.id}`} className="flex items-start justify-between gap-2 mb-3">
                  <div id={`departments-view-departments-grid-5-${dept.id}`} className="flex items-center gap-2.5">
                    <div id={`departments-view-departments-grid-6-${dept.id}`} className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div id={`departments-view-departments-grid-7-${dept.id}`}>
                      <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{dept.code}</span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">{dept.name}</h3>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                    {dept.categoryFa}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                  {dept.description}
                </p>

                {/* Manager and Contact */}
                <div id={`departments-view-manager-and-contact-${dept.id}`} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800/80 mb-4">
                  <div id={`departments-view-manager-and-contact-2-${dept.id}`} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">مدیر مسئول:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{dept.headPersonName}</span>
                  </div>
                  <div id={`departments-view-manager-and-contact-3-${dept.id}`} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      تماس:
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">{dept.contactNumber}</span>
                  </div>
                </div>

                {/* Financial & Absorption Progress */}
                <div id={`departments-view-financial-absorption-progress-${dept.id}`} className="space-y-2 mb-4">
                  <div id={`departments-view-financial-absorption-progress-2-${dept.id}`} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">بودجه مصوب:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatToman(dept.allocatedBudgetToman)}</span>
                  </div>
                  <div id={`departments-view-financial-absorption-progress-3-${dept.id}`} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">جذب شده:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatToman(dept.absorbedBudgetToman)}</span>
                  </div>

                  <div id={`departments-view-financial-absorption-progress-4-${dept.id}`} className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      id={`departments-view-financial-absorption-progress-5-${dept.id}`}
                      className={`h-full rounded-full transition-all duration-500 ${
                        absorptionRate >= 75 ? 'bg-emerald-500' : absorptionRate >= 40 ? 'bg-indigo-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${absorptionRate}%` }}
                    />
                  </div>
                  <div id={`departments-view-financial-absorption-progress-6-${dept.id}`} className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>درصد جذب بودجه</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{toPersianDigits(absorptionRate)}٪</span>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div id={`departments-view-footer-actions-${dept.id}`} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div id={`departments-view-footer-actions-2-${dept.id}`} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <FolderGit2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{toPersianDigits(deptProjects.length)} پروژه فعال</span>
                </div>

                <div id={`departments-view-footer-actions-3-${dept.id}`} className="flex items-center gap-1.5">
                  <div id={`departments-view-footer-actions-4-${dept.id}`} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 font-bold text-[11px] border border-amber-200 dark:border-amber-800/40">
                    <Award className="w-3 h-3" />
                    <span>{toPersianDigits(dept.performanceScore)}</span>
                  </div>

                  {canEdit && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(dept)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="ویرایش نهاد"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          confirmDelete(`آیا از حذف نهاد «${dept.name}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`, () =>
                            handleDeleteDepartment(dept.id)
                          )
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="حذف نهاد"
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

      {filteredDepartments.length === 0 && (
        <div id="departments-view-footer-actions-5" className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">هیچ اداره یا نهادی با این مشخصات یافت نشد</h3>
          <p className="text-xs text-slate-400 mt-1">لطفاً عبارت جستجو یا فیلترهای خود را تغییر دهید.</p>
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div id="departments-view-crud-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div id="departments-view-crud-modal-2" ref={modalRef} className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div id="departments-view-crud-modal-3" className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                {editingDept ? 'ویرایش مشخصات نهاد متولی' : 'ثبت نهاد / اداره جدید در سامانه ملی'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div id="departments-view-crud-modal-4">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">نام کامل دستگاه اجرایی / اداره *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: شرکت مهندسی آب و فاضلاب شهرستان"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div id="departments-view-crud-modal-5" className="grid grid-cols-2 gap-3">
                <div id="departments-view-crud-modal-6">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">کد شناسایی سیستمی</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="departments-view-crud-modal-7">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">سطح مدیریتی</label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value as AdministrativeLevel)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="NATIONAL">ملی / کشوری</option>
                    <option value="PROVINCIAL">استانی</option>
                    <option value="COUNTY">شهرستانی</option>
                    <option value="RURAL_DISTRICT">بخشداری / دهیاری</option>
                  </select>
                </div>
              </div>

              <div id="departments-view-crud-modal-8" className="grid grid-cols-2 gap-3">
                <div id="departments-view-crud-modal-9">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">حوزه تخصصی فعالیت</label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const val = e.target.value as Department['category'];
                      setFormCategory(val);
                      setFormCategoryFa(categoryLabels[val]);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="INFRASTRUCTURE">زیرساخت و عمران</option>
                    <option value="HEALTH">بهداشت و درمان</option>
                    <option value="EDUCATION">آموزش و پرورش</option>
                    <option value="SOCIAL_WELFARE">حمایت اجتماعی</option>
                    <option value="AGRICULTURE">کشاورزی و منابع طبیعی</option>
                    <option value="ENVIRONMENT">محیط زیست</option>
                    <option value="MUNICIPAL_RURAL">امور دهیاری‌ها و شهری</option>
                  </select>
                </div>

                <div id="departments-view-crud-modal-10">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">نام مدیر مسئول</label>
                  <input
                    type="text"
                    value={formHeadName}
                    onChange={(e) => setFormHeadName(e.target.value)}
                    placeholder="نام و نام خانوادگی"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div id="departments-view-crud-modal-11" className="grid grid-cols-2 gap-3">
                <div id="departments-view-crud-modal-12">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">شماره تماس مستقیم</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="۰۳۴-..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="departments-view-crud-modal-13">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ایمیل سازمانی</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="info@org.ir"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div id="departments-view-crud-modal-14" className="grid grid-cols-2 gap-3">
                <div id="departments-view-crud-modal-15">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">بودجه مصوب (تومان)</label>
                  <input
                    type="number"
                    value={formAllocated}
                    onChange={(e) => setFormAllocated(Number(e.target.value))}
                    step="100000000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="departments-view-crud-modal-16">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">بودجه جذب شده (تومان)</label>
                  <input
                    type="number"
                    value={formAbsorbed}
                    onChange={(e) => setFormAbsorbed(Number(e.target.value))}
                    step="100000000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div id="departments-view-crud-modal-17">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">شرح مأموریت و وظایف در توسعه منطقه</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="اهداف اصلی، برنامه‌های عمرانی و محرومیت‌زدایی..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div id="departments-view-crud-modal-18" className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30"
                >
                  {editingDept ? 'ذخیره تغییرات' : 'ثبت نهایی نهاد'}
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
