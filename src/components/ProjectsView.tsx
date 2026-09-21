import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { ExecutiveProject, ProjectStatus } from '../types';
import { formatToman, formatNumber, toPersianDigits } from '../utils/numberUtils';
import { useConfirmDelete } from './ConfirmDeleteModal';
import { useOutsideClick } from '../hooks/useOutsideClick';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertTriangle,
  Users,
  Calendar,
  Building2,
  Wallet,
  Users2,
  HardHat,
  AlertCircle,
  ShieldAlert,
  Trash2,
  Edit,
  X,
  Flame,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  FolderPlus,
} from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';

export const ProjectsView: React.FC = () => {
  const {
    projects,
    departments,
    budgetSources,
    executors,
    contractors,
    crisesHarms,
    priorities,
    antiDuplicationAlerts,
    optimizationMetrics,
    handleAddProject,
    handleUpdateProject,
    handleDeleteProject,
    handleToggleProjectStatus,
    currentUser,
    getUserPermissions,
    setActiveTab,
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedOverlapFilter, setSelectedOverlapFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(modalRef, () => setIsModalOpen(false));
  const [editingProject, setEditingProject] = useState<ExecutiveProject | null>(null);
  const { confirmDelete, modal: deleteConfirmModal } = useConfirmDelete();

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDeptId, setFormDeptId] = useState(departments[0]?.id || '');
  const [formBudgetId, setFormBudgetId] = useState(budgetSources[0]?.id || '');
  const [formExecId, setFormExecId] = useState(executors[0]?.id || '');
  const [formContractorId, setFormContractorId] = useState(contractors[0]?.id || '');
  const [formPriorityId, setFormPriorityId] = useState(priorities[0]?.id || '');
  const [formCrisisId, setFormCrisisId] = useState(crisesHarms[0]?.id || '');
  const [formCost, setFormCost] = useState<number>(1_000_000_000_000);
  const [formBeneficiaries, setFormBeneficiaries] = useState<number>(10000);
  const [formProvince, setFormProvince] = useState('کرمان');
  const [formCounty, setFormCounty] = useState('شهرستان رفسنجان');
  const [formDistrict, setFormDistrict] = useState('بخش کشکوئیه');
  const [formStartYear, setFormStartYear] = useState(1403);
  const [formEndYear, setFormEndYear] = useState(1404);
  const [formProgress, setFormProgress] = useState(25);
  const [formStatus, setFormStatus] = useState<ProjectStatus>('IN_PROGRESS');
  const [formDescription, setFormDescription] = useState('');

  const userPerm = getUserPermissions(currentUser);
  const canManage = userPerm ? userPerm.canApproveProjects : currentUser.role === 'ADMIN';

  // Live calculation of per-capita in the modal
  const computedPerCapita = useMemo(() => {
    const ben = Math.max(1, formBeneficiaries);
    return Math.round(formCost / ben);
  }, [formCost, formBeneficiaries]);

  const handleOpenAdd = () => {
    setEditingProject(null);
    setFormTitle('');
    setFormCode(`PRJ-${Math.floor(100 + Math.random() * 900)}`);
    setFormDeptId(departments[0]?.id || '');
    setFormBudgetId(budgetSources[0]?.id || '');
    setFormExecId(executors[0]?.id || '');
    setFormContractorId(contractors[0]?.id || '');
    setFormPriorityId(priorities[0]?.id || '');
    setFormCrisisId(crisesHarms[0]?.id || '');
    setFormCost(1_000_000_000_000);
    setFormBeneficiaries(10000);
    setFormProvince('کرمان');
    setFormCounty('شهرستان رفسنجان');
    setFormDistrict('بخش کشکوئیه');
    setFormStartYear(1403);
    setFormEndYear(1404);
    setFormProgress(10);
    setFormStatus('PROPOSED');
    setFormDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (proj: ExecutiveProject) => {
    setEditingProject(proj);
    setFormTitle(proj.title);
    setFormCode(proj.code);
    setFormDeptId(proj.departmentId);
    setFormBudgetId(proj.budgetSourceId);
    setFormExecId(proj.executorId);
    setFormContractorId(proj.contractorId || '');
    setFormPriorityId(proj.priorityId);
    setFormCrisisId(proj.crisisHarmId || '');
    setFormCost(proj.estimatedCostToman);
    setFormBeneficiaries(proj.beneficiariesCount);
    setFormProvince(proj.province);
    setFormCounty(proj.county);
    setFormDistrict(proj.district || proj.targetArea || '');
    setFormStartYear(proj.startYear);
    setFormEndYear(proj.endYear);
    setFormProgress(proj.progressPercentage);
    setFormStatus(proj.status);
    setFormDescription(proj.description);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const deptObj = departments.find((d) => d.id === formDeptId);
    const budgetObj = budgetSources.find((b) => b.id === formBudgetId);
    const execObj = executors.find((ex) => ex.id === formExecId);
    const contractorObj = contractors.find((c) => c.id === formContractorId);
    const prioObj = priorities.find((p) => p.id === formPriorityId);

    const costNum = Number(formCost);
    const beneficiariesNum = Number(formBeneficiaries);

    if (editingProject) {
      handleUpdateProject({
        ...editingProject,
        title: formTitle.trim(),
        code: formCode.trim(),
        departmentId: formDeptId,
        departmentName: deptObj?.name || 'نامشخص',
        budgetSourceId: formBudgetId,
        budgetSourceTitle: budgetObj?.title || 'نامشخص',
        budgetSourceType: budgetObj?.sourceType || 'CSR',
        executorId: formExecId,
        executorName: execObj?.name || 'نامشخص',
        contractorId: formContractorId,
        contractorName: contractorObj?.companyName || 'مشخص نشده',
        priorityId: formPriorityId,
        priorityTitle: prioObj?.title || 'نامشخص',
        crisisHarmId: formCrisisId,
        estimatedCostToman: costNum,
        beneficiariesCount: beneficiariesNum,
        province: formProvince,
        county: formCounty,
        districtOrVillage: formDistrict.trim(),
        startYear: Number(formStartYear),
        endYear: Number(formEndYear),
        progressPercentage: Number(formProgress),
        status: formStatus,
        description: formDescription.trim(),
      });
    } else {
      handleAddProject({
        title: formTitle.trim(),
        code: formCode.trim(),
        departmentId: formDeptId,
        departmentName: deptObj?.name || 'نامشخص',
        budgetSourceId: formBudgetId,
        budgetSourceTitle: budgetObj?.title || 'نامشخص',
        budgetSourceType: budgetObj?.sourceType || 'CSR',
        executorId: formExecId,
        executorName: execObj?.name || 'نامشخص',
        contractorId: formContractorId,
        contractorName: contractorObj?.companyName || 'مشخص نشده',
        priorityId: formPriorityId,
        priorityTitle: prioObj?.title || 'نامشخص',
        crisisHarmId: formCrisisId,
        targetArea: `${formProvince} - ${formCounty} (${formDistrict})`,
        estimatedCostToman: costNum,
        beneficiariesCount: beneficiariesNum,
        province: formProvince,
        county: formCounty,
        districtOrVillage: formDistrict.trim(),
        startYear: Number(formStartYear),
        endYear: Number(formEndYear),
        progressPercentage: Number(formProgress),
        status: formStatus,
        description: formDescription.trim(),
      });
    }
    setIsModalOpen(false);
  };

  // Filtered
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchQ =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.departmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.executorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.districtOrVillage.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = selectedDeptFilter === 'ALL' || p.departmentId === selectedDeptFilter;
      const matchSource = selectedSourceFilter === 'ALL' || p.budgetSourceId === selectedSourceFilter;
      const matchStatus = selectedStatusFilter === 'ALL' || p.status === selectedStatusFilter;
      const matchOverlap = selectedOverlapFilter === 'ALL' || p.antiOverlapStatus === selectedOverlapFilter;
      return matchQ && matchDept && matchSource && matchStatus && matchOverlap;
    });
  }, [projects, searchQuery, selectedDeptFilter, selectedSourceFilter, selectedStatusFilter, selectedOverlapFilter]);

  // Aggregate stats
  const totalBudget = useMemo(() => projects.reduce((s, p) => s + p.estimatedCostToman, 0), [projects]);
  const totalBeneficiaries = useMemo(() => projects.reduce((s, p) => s + p.beneficiariesCount, 0), [projects]);
  const flaggedCount = useMemo(() => projects.filter((p) => p.antiOverlapStatus !== 'CLEAR').length, [projects]);

  return (
    <div id="projects-view-root" className="space-y-6">
      {/* Header Banner (Light Theme) */}
      <div id="projects-view-header-banner-light-theme" className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-blue-200/80 shadow-2xs relative overflow-hidden">
        <div id="projects-view-header-banner-light-theme-2" className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div id="projects-view-header-banner-light-theme-3">
            <div id="projects-view-header-banner-light-theme-4" className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
                رصد پروژه‌های اجرایی و ممانعت از موازی‌کاری
              </span>
              <span className="text-xs text-slate-500">اتصال کامل به ادارات، سرفصل بودجه، مجریان و بحران‌ها</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <FolderKanban className="w-7 h-7 text-blue-600" />
              پروژه‌های عمرانی و توسعه‌ای سامانه ملی
            </h1>
            <p className="text-slate-600 text-sm mt-1 max-w-3xl leading-relaxed">
              سامانه هوشمند با تطبیق پیوسته ادارات متولی، سرفصل‌های تأمین مالی (CSR، دولتی، دهیاری)، مجریان و پیمانکاران،
              از تعریف پروژه‌های موازی یا طرح‌های بدون تناسب سرانه جمعیت جلوگیری کرده و تخصیص بهینه منابع را تضمین می‌کند.
            </p>
          </div>

          <div id="projects-view-header-banner-light-theme-5" className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('CREATE_PROJECT')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95"
            >
              <FolderPlus className="w-4 h-4" />
              <span>تب تعریف جامع و بین‌دستگاهی پروژه</span>
            </button>
            {canManage && (
              <button
                id="btn-add-project"
                onClick={handleOpenAdd}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2.5 rounded-xl font-bold text-sm shadow-2xs transition-all"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                <span>ثبت سریع</span>
              </button>
            )}
          </div>
        </div>

        {/* Micro-KPI Strip */}
        <div id="projects-view-micro-kpi-strip" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-blue-200/60">
          <div id="projects-view-micro-kpi-strip-2" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">کل پروژه‌های ثبت‌شده</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{toPersianDigits(projects.length)} پروژه</span>
          </div>
          <div id="projects-view-micro-kpi-strip-3" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">ارزش کل اعتبارات پروژه‌ها</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block font-mono">{formatToman(totalBudget)}</span>
          </div>
          <div id="projects-view-micro-kpi-strip-4" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">جمعیت بهره‌بردار مستقیم</span>
            <span className="text-xl font-black text-blue-700 mt-0.5 block font-mono">{formatNumber(totalBeneficiaries)} نفر</span>
          </div>
          <div id="projects-view-micro-kpi-strip-5" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">پروژه‌های نیازمند بازنگری موازی‌کاری</span>
            <span className="text-xl font-black text-rose-700 mt-0.5 block flex items-center gap-1 font-mono">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              {toPersianDigits(flaggedCount)} مورد هشدار
            </span>
          </div>
        </div>
      </div>

      {/* Anti-Duplication Engine Alerts Strip */}
      {antiDuplicationAlerts.length > 0 && (
        <div id="projects-view-anti-duplication-engine-alerts" className="bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-2xl p-4 shadow-sm">
          <div id="projects-view-anti-duplication-engine-alerts-2" className="flex items-center justify-between gap-2 mb-3">
            <div id="projects-view-anti-duplication-engine-alerts-3" className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <h3 className="font-black text-sm text-amber-900 dark:text-amber-200">
                هشدارهای فعال موتور ضد موازی‌کاری و اتلاف بودجه ({toPersianDigits(antiDuplicationAlerts.length)} مورد کشف شد)
              </h3>
            </div>
            <span className="text-xs text-amber-700 dark:text-amber-400 font-mono">
              صرفه‌جویی احتمالی: {formatToman(optimizationMetrics.potentialSavingsToman)}
            </span>
          </div>

          <div id="projects-view-anti-duplication-engine-alerts-4" className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {antiDuplicationAlerts.map((alert) => (
              <div
                id={`projects-view-anti-duplication-engine-alerts-5-${alert.id}`}
                key={alert.id}
                className="bg-white/90 dark:bg-slate-900/90 rounded-xl p-3 border border-amber-200 dark:border-amber-900/60 text-xs shadow-xs"
              >
                <div id={`projects-view-anti-duplication-engine-alerts-6-${alert.id}`} className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    {alert.projectTitle}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      alert.severity === 'HIGH'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {alert.severity === 'HIGH' ? 'بحرانی' : 'متوسط'}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1 leading-relaxed">{alert.message}</p>
                <div id={`projects-view-anti-duplication-engine-alerts-7-${alert.id}`} className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>پیشنهاد الگوریتم: {alert.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div id="projects-view-filter-and-search-bar" className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div id="projects-view-filter-and-search-bar-2" className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="جستجوی پروژه، اداره، مجری یا محدوده..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div id="projects-view-filter-and-search-bar-3" className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div id="projects-view-filter-and-search-bar-4" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>فیلترها:</span>
          </div>

          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">همه ادارات متولی</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSourceFilter}
            onChange={(e) => setSelectedSourceFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">همه منابع مالی</option>
            {budgetSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="PROPOSED">پیشنهادی</option>
            <option value="APPROVED">مصوب</option>
            <option value="IN_PROGRESS">در حال اجرا</option>
            <option value="COMPLETED">خاتمه یافته</option>
          </select>

          <select
            value={selectedOverlapFilter}
            onChange={(e) => setSelectedOverlapFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">همه وضعیت‌های انطباق</option>
            <option value="CLEAR">طرح‌های تأییدشده و پاک</option>
            <option value="DUPLICATE_WARNING">هشدار موازی‌کاری</option>
            <option value="EXCESSIVE_PER_CAPITA">هشدار عدم تناسب سرانه</option>
            <option value="UNALIGNED_PRIORITY">هشدار مغایرت اولویت</option>
          </select>
        </div>
      </div>

      {/* Projects List */}
      <div id="projects-view-projects-list" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.map((proj) => {
          const isWarning = proj.antiOverlapStatus !== 'CLEAR';

          return (
            <div
              id={`projects-view-projects-list-2-${proj.id}`}
              key={proj.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                isWarning
                  ? 'border-amber-400/80 dark:border-amber-600/60 bg-amber-50/20 dark:bg-amber-950/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div id={`projects-view-projects-list-3-${proj.id}`}>
                <div id={`projects-view-projects-list-4-${proj.id}`} className="flex items-start justify-between gap-2 mb-3">
                  <div id={`projects-view-projects-list-5-${proj.id}`} className="flex items-center gap-2.5">
                    <div id={`projects-view-projects-list-6-${proj.id}`} className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div id={`projects-view-projects-list-7-${proj.id}`}>
                      <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{proj.code}</span>
                      <div className="flex items-start gap-1">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight min-w-0 flex-1">{proj.title}</h3>
                        <HelpTooltip text={proj.description} label="مشاهده توضیح پروژه" size="sm" />
                      </div>
                    </div>
                  </div>

                  <div id={`projects-view-projects-list-8-${proj.id}`} className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${
                        proj.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : proj.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : proj.status === 'APPROVED'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {proj.status === 'COMPLETED'
                        ? 'تکمیل‌شده'
                        : proj.status === 'IN_PROGRESS'
                        ? 'در حال اجرا'
                        : proj.status === 'APPROVED'
                        ? 'مصوب'
                        : 'پیشنهادی'}
                    </span>

                    {isWarning && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        نیاز به تدقیق
                      </span>
                    )}
                  </div>
                </div>

                {/* Meta Matrix: Department, Budget, Executor, Contractor */}
                <div id={`projects-view-meta-matrix-department-budget-${proj.id}`} className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs mb-3 border border-slate-100 dark:border-slate-800">
                  <div id={`projects-view-meta-matrix-department-budget-2-${proj.id}`} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{proj.departmentName}</span>
                  </div>
                  <div id={`projects-view-meta-matrix-department-budget-3-${proj.id}`} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Wallet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{proj.budgetSourceTitle}</span>
                  </div>
                  <div id={`projects-view-meta-matrix-department-budget-4-${proj.id}`} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Users2 className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span className="truncate">مجری: {proj.executorName}</span>
                  </div>
                  <div id={`projects-view-meta-matrix-department-budget-5-${proj.id}`} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <HardHat className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">پیمانکار: {proj.contractorName || 'تعیین نشده'}</span>
                  </div>
                </div>

                {/* Financial & Per-Capita Breakdown */}
                <div id={`projects-view-financial-per-capita-breakdown-${proj.id}`} className="grid grid-cols-3 gap-2 bg-slate-100/70 dark:bg-slate-800/80 rounded-xl p-2.5 text-[11px] mb-3">
                  <div id={`projects-view-financial-per-capita-breakdown-2-${proj.id}`}>
                    <span className="text-slate-400 block text-[10px]">کل اعتبار مصوب:</span>
                    <span className="font-black text-slate-900 dark:text-slate-100">{formatToman(proj.estimatedCostToman)}</span>
                  </div>
                  <div id={`projects-view-financial-per-capita-breakdown-3-${proj.id}`}>
                    <span className="text-slate-400 block text-[10px]">جمعیت بهره‌بردار:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{formatNumber(proj.beneficiariesCount)} نفر</span>
                  </div>
                  <div id={`projects-view-financial-per-capita-breakdown-4-${proj.id}`}>
                    <span className="text-slate-400 block text-[10px]">سرانه هر نفر:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatToman(proj.costPerBeneficiaryToman)}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div id={`projects-view-progress-bar-${proj.id}`} className="space-y-1 mb-4">
                  <div id={`projects-view-progress-bar-2-${proj.id}`} className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">پیشرفت فیزیکی پروژه:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{toPersianDigits(proj.progressPercentage)}٪</span>
                  </div>
                  <div id={`projects-view-progress-bar-3-${proj.id}`} className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      id={`projects-view-progress-bar-4-${proj.id}`}
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${proj.progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div id={`projects-view-footer-${proj.id}`} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div id={`projects-view-footer-2-${proj.id}`} className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">{proj.districtOrVillage}</span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {proj.startYear} - {proj.endYear}
                  </span>
                </div>

                <div id={`projects-view-footer-3-${proj.id}`} className="flex items-center gap-1">
                  {canManage && (
                    <>
                      {proj.status === 'PROPOSED' && (
                        <button
                          onClick={() => handleToggleProjectStatus(proj.id, 'APPROVED')}
                          className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold text-[11px] hover:bg-indigo-100 transition-colors"
                        >
                          تصویب طرح
                        </button>
                      )}
                      {proj.status === 'APPROVED' && (
                        <button
                          onClick={() => handleToggleProjectStatus(proj.id, 'IN_PROGRESS')}
                          className="px-2 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg font-bold text-[11px] hover:bg-blue-100 transition-colors"
                        >
                          آغاز عملیات
                        </button>
                      )}
                      {proj.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleToggleProjectStatus(proj.id, 'COMPLETED')}
                          className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg font-bold text-[11px] hover:bg-emerald-100 transition-colors"
                        >
                          خاتمه و تحویل
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEdit(proj)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="ویرایش پروژه"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          confirmDelete(`آیا از حذف پروژه «${proj.title}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`, () =>
                            handleDeleteProject(proj.id)
                          )
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="حذف پروژه"
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
        <div id="projects-view-crud-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div id="projects-view-crud-modal-2" ref={modalRef} className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[92vh]">
            <div id="projects-view-crud-modal-3" className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-blue-500" />
                {editingProject ? 'ویرایش مشخصات پروژه عمرانی' : 'تعریف و ثبت پروژه عمرانی جدید'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div id="projects-view-crud-modal-4">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">عنوان کامل پروژه *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: تکمیل مجتمع آبرسانی روستایی و احداث مخزن بتنی"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div id="projects-view-crud-modal-5" className="grid grid-cols-2 gap-3">
                <div id="projects-view-crud-modal-6">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">اداره / نهاد متولی *</label>
                  <select
                    value={formDeptId}
                    onChange={(e) => setFormDeptId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.categoryFa})
                      </option>
                    ))}
                  </select>
                </div>
                <div id="projects-view-crud-modal-7">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">سرفصل منبع تأمین مالی *</label>
                  <select
                    value={formBudgetId}
                    onChange={(e) => setFormBudgetId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {budgetSources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.sourceTypeFa})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div id="projects-view-crud-modal-8" className="grid grid-cols-2 gap-3">
                <div id="projects-view-crud-modal-9">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">نهاد مجری طرح *</label>
                  <select
                    value={formExecId}
                    onChange={(e) => setFormExecId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {executors.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} ({ex.typeFa})
                      </option>
                    ))}
                  </select>
                </div>
                <div id="projects-view-crud-modal-10">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">پیمانکار ذیصلاح</label>
                  <select
                    value={formContractorId}
                    onChange={(e) => setFormContractorId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">تعیین در مرحله مناقصه / استعلام</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.gradeFa})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div id="projects-view-crud-modal-11" className="grid grid-cols-2 gap-3">
                <div id="projects-view-crud-modal-12">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">اولویت توسعه مرتبط *</label>
                  <select
                    value={formPriorityId}
                    onChange={(e) => setFormPriorityId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {priorities.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div id="projects-view-crud-modal-13">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">پاسخ به بحران / آسیب</label>
                  <select
                    value={formCrisisId}
                    onChange={(e) => setFormCrisisId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">پروژه توسعه‌ای عمومی (فاقد بحران خاص)</option>
                    {crisesHarms.map((cr) => (
                      <option key={cr.id} value={cr.id}>
                        {cr.title} ({cr.urgency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div id="projects-view-crud-modal-14" className="grid grid-cols-2 gap-3">
                <div id="projects-view-crud-modal-15">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">اعتبار برآوردی کل (تومان) *</label>
                  <input
                    type="number"
                    required
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    step="50000000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="projects-view-crud-modal-16">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">جمعیت بهره‌بردار مستقیم (نفر) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formBeneficiaries}
                    onChange={(e) => setFormBeneficiaries(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Online Per Capita Indicator */}
              <div id="projects-view-online-per-capita-indicator" className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                <div id="projects-view-online-per-capita-indicator-2">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">محاسبه خودکار سرانه هر بهره‌بردار:</span>
                  <span className="font-black text-sm text-slate-900 dark:text-slate-100">{formatToman(computedPerCapita)}</span>
                </div>
                {computedPerCapita > 300_000_000 ? (
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/60 px-2 py-1 rounded border border-rose-200">
                    هشدار: سرانه بسیار بالا (نیاز به توجیه اقتصادی)
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded border border-emerald-200">
                    سرانه در محدوده متناسب
                  </span>
                )}
              </div>

              <div id="projects-view-online-per-capita-indicator-3" className="grid grid-cols-2 gap-3">
                <div id="projects-view-online-per-capita-indicator-4">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">روستا / بخش / محدوده</label>
                  <input
                    type="text"
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    placeholder="بخش کشکوئیه یا روستای..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div id="projects-view-online-per-capita-indicator-5">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">وضعیت اولیه پروژه</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="PROPOSED">پیشنهادی (در مرحله مطالعه)</option>
                    <option value="APPROVED">مصوب و آماده اجرا</option>
                    <option value="IN_PROGRESS">در حال اجرا</option>
                    <option value="COMPLETED">تکمیل و خاتمه‌یافته</option>
                  </select>
                </div>
              </div>

              <div id="projects-view-online-per-capita-indicator-6">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">شرح اهداف، مشخصات فنی و خروجی‌های ملموس</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="طول خط لوله، مشخصات ساختمانی، تعداد اشتغال ایجادی..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div id="projects-view-online-per-capita-indicator-7" className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30"
                >
                  {editingProject ? 'ذخیره تغییرات' : 'ثبت نهایی پروژه'}
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
