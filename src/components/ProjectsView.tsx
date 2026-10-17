import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { ExecutiveProject, ProjectStatus } from '../types';
import { formatMoneyParts, formatPercent, formatToman, formatNumber, toPersianDigits } from '../utils/numberUtils';
import { Num } from './Num';
import { useConfirmDelete } from './ConfirmDeleteModal';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { PageHeader } from './PageHeader';
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
  MapPin,
  AlertCircle,
  ShieldAlert,
  Trash2,
  Edit,
  X,
  Flame,
  ArrowUpRight,
  TrendingDown,
  FolderPlus,
} from 'lucide-react';
import { PROJECT_STATUS_META } from '../utils/projectStatusMeta';
import { hasOwnProjectScope, projectsForUser } from '../utils/recordScope';

export const ProjectsView: React.FC = () => {
  const {
    projects,
    departments,
    budgetSources,
    executors,
    contractors,
    crisesHarms,
    priorities,
    selectedLocation,
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
  // Detail modal holds only the record id so it stays in sync when the
  // underlying project is edited or its status changes.
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);
  const detailModalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(detailModalRef, () => setDetailProjectId(null));
  const detailProject = useMemo(
    () => projects.find((p) => p.id === detailProjectId) || null,
    [projects, detailProjectId]
  );
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
  const [formProvince, setFormProvince] = useState(selectedLocation.province);
  const [formCounty, setFormCounty] = useState(selectedLocation.county);
  const [formDistrict, setFormDistrict] = useState(selectedLocation.district);
  const [formStartYear, setFormStartYear] = useState(1403);
  const [formEndYear, setFormEndYear] = useState(1404);
  const [formProgress, setFormProgress] = useState(25);
  const [formStatus, setFormStatus] = useState<ProjectStatus>('IN_PROGRESS');
  const [formDescription, setFormDescription] = useState('');

  const userPerm = getUserPermissions(currentUser);
  const canManage = userPerm ? userPerm.canApproveProjects : currentUser.role === 'ADMIN';
  // Missing on rows seeded before the flag existed: preserve the old open door.
  const canCreateProject = userPerm ? userPerm.canCreateProject !== false : true;
  // «رئیس اداره» works on its own portfolio only; every other role keeps the
  // location-scoped list the context handed it.
  const ownProjectScope = hasOwnProjectScope(currentUser.role);
  const visibleProjects = useMemo(
    () => projectsForUser(projects, currentUser),
    [projects, currentUser]
  );

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
    setFormProvince(selectedLocation.province);
    setFormCounty(selectedLocation.county);
    setFormDistrict(selectedLocation.district);
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
    return visibleProjects.filter((p) => {
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
  }, [visibleProjects, searchQuery, selectedDeptFilter, selectedSourceFilter, selectedStatusFilter, selectedOverlapFilter]);

  // Aggregate stats
  const totalBudget = useMemo(() => visibleProjects.reduce((s, p) => s + p.estimatedCostToman, 0), [visibleProjects]);
  const totalBeneficiaries = useMemo(() => visibleProjects.reduce((s, p) => s + p.beneficiariesCount, 0), [visibleProjects]);
  const flaggedCount = useMemo(() => visibleProjects.filter((p) => p.antiOverlapStatus !== 'CLEAR').length, [visibleProjects]);

  return (
    <div id="projects-view-root" className="space-y-6">
      {/* Page title block — above the banner, per the page-header reference. */}
      <PageHeader
        id="projects-view-page-header"
        icon={FolderKanban}
        title="پروژه‌های عمرانی و توسعه‌ای سامانه ملی"
        subtitle={
          ownProjectScope
            ? 'فقط پروژه‌هایی که خودتان ثبت کرده‌اید؛ پیمانکاران تخصیص‌یافته به همین پروژه‌ها در صفحه پیمانکاران دیده می‌شوند'
            : 'اتصال کامل به ادارات، سرفصل بودجه، مجریان و بحران‌ها'
        }
        tone="text-blue-600"
      />

      {/* Banner — section label, actions and the micro-KPI strip. */}
      <div id="projects-view-header-banner-light-theme" className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-blue-200/80 shadow-2xs relative overflow-hidden">
        <div id="projects-view-header-banner-light-theme-2" className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div id="projects-view-header-banner-light-theme-4" className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
              <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
              {ownProjectScope ? 'پروژه‌های ثبت‌شده توسط شما' : 'رصد پروژه‌های اجرایی و ممانعت از موازی‌کاری'}
            </span>
            {ownProjectScope && (
              <span
                id="projects-view-own-scope-badge"
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-slate-600 border border-slate-200 flex items-center gap-1"
              >
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                محدوده شخصی
              </span>
            )}
          </div>

          <div id="projects-view-header-banner-light-theme-5" className="flex items-center gap-3 self-start md:self-auto">
            {canCreateProject && (
              <button
                onClick={() => setActiveTab('CREATE_PROJECT')}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95"
              >
                <FolderPlus className="w-4 h-4" />
                <span>ثبت پروژه جدید</span>
              </button>
            )}
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
            <span className="text-xs text-slate-500 block">
              {ownProjectScope ? 'پروژه‌های ثبت‌شده توسط شما' : 'کل پروژه‌های ثبت‌شده'}
            </span>
            <Num value={formatNumber(visibleProjects.length)} unit="پروژه" className="text-xl font-black text-slate-900 mt-0.5 block font-mono" />
          </div>
          <div id="projects-view-micro-kpi-strip-3" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">ارزش کل اعتبارات پروژه‌ها</span>
            <Num {...formatMoneyParts(totalBudget)} className="text-xl font-black text-emerald-700 mt-0.5 block font-mono" />
          </div>
          <div id="projects-view-micro-kpi-strip-4" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">جمعیت بهره‌بردار مستقیم</span>
            <Num value={formatNumber(totalBeneficiaries)} unit="نفر" className="text-xl font-black text-blue-700 mt-0.5 block font-mono" />
          </div>
          <div id="projects-view-micro-kpi-strip-5" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">پروژه‌های نیازمند بازنگری موازی‌کاری</span>
            <span className="text-xl font-black text-rose-700 mt-0.5 block flex items-center gap-1 font-mono">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <Num value={formatNumber(flaggedCount)} unit="مورد هشدار" unitClassName="text-[0.6em] font-bold text-rose-700 ms-1" />
            </span>
          </div>
        </div>
      </div>

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

      {/* Projects List — compact summary cards; click opens the full detail modal. */}
      <div id="projects-view-projects-list" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.map((proj) => {
          const isWarning = proj.antiOverlapStatus !== 'CLEAR';
          const statusMeta = PROJECT_STATUS_META[proj.status];

          return (
            <article
              id={`projects-view-projects-list-2-${proj.id}`}
              key={proj.id}
              onClick={() => setDetailProjectId(proj.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setDetailProjectId(proj.id);
                }
              }}
              title="کلیک برای مشاهده جزئیات کامل پروژه"
              className={`group bg-white dark:bg-slate-900 rounded-2xl p-4 border shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                isWarning
                  ? 'border-amber-400/80 dark:border-amber-600/60 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-500'
                  : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
              }`}
            >
              <div id={`projects-view-projects-list-3-${proj.id}`} className="flex items-start justify-between gap-3">
                <div id={`projects-view-projects-list-5-${proj.id}`} className="flex items-center gap-2.5 min-w-0">
                  <div id={`projects-view-projects-list-6-${proj.id}`} className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div id={`projects-view-projects-list-7-${proj.id}`} className="min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{proj.code}</span>
                    <h3
                      className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight line-clamp-2 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors"
                      title={proj.title}
                    >
                      {proj.title}
                    </h3>
                  </div>
                </div>

                <div id={`projects-view-projects-list-8-${proj.id}`} className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>

                  {isWarning && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      نیاز به تدقیق
                    </span>
                  )}
                </div>
              </div>

              {/* Progress + owning department — the remaining fields live in the detail modal. */}
              <div id={`projects-view-progress-bar-${proj.id}`} className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
                <div id={`projects-view-progress-bar-2-${proj.id}`} className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">پیشرفت فیزیکی</span>
                  <Num value={formatPercent(proj.progressPercentage)} className="font-bold text-slate-800 dark:text-slate-200" />
                </div>
                <div id={`projects-view-progress-bar-3-${proj.id}`} className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    id={`projects-view-progress-bar-4-${proj.id}`}
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${proj.progressPercentage}%` }}
                  />
                </div>
                <div id={`projects-view-footer-${proj.id}`} className="flex items-center justify-between gap-2 pt-1.5 text-[11px]">
                  <span className="flex items-center gap-1 text-slate-400 min-w-0">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{proj.departmentName}</span>
                  </span>
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold shrink-0 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                    جزئیات
                    <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100 group-hover:-translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Project Detail Modal — full record; edit/delete live here, not on the card. */}
      {detailProject && (
        <div
          id="projects-view-detail-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            id="projects-view-detail-modal-panel"
            ref={detailModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="projects-view-detail-modal-title"
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div id="projects-view-detail-modal-header" className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <FolderKanban className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{detailProject.code}</span>
                  <h3 id="projects-view-detail-modal-title" className="font-black text-base text-slate-900 dark:text-slate-100 leading-tight">
                    {detailProject.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PROJECT_STATUS_META[detailProject.status].className}`}>
                      {PROJECT_STATUS_META[detailProject.status].label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {detailProject.departmentName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {detailProject.province} - {detailProject.county}
                    </span>
                  </div>
                </div>
              </div>
              <button
                id="btn-close-project-details"
                onClick={() => setDetailProjectId(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                title="بستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="projects-view-detail-modal-body" className="p-5 space-y-4 text-xs">
              {/* Anti-overlap warning */}
              {detailProject.antiOverlapStatus !== 'CLEAR' && (
                <div id="projects-view-detail-modal-warning" className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-200 dark:border-amber-900 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-bold text-amber-800 dark:text-amber-300 block">نیازمند بازنگری موازی‌کاری / انطباق</span>
                    <span className="text-amber-700 dark:text-amber-400 leading-relaxed">
                      {detailProject.overlapWarningDetails || 'این پروژه در پایش هوشمند به‌عنوان نیازمند تدقیق علامت‌گذاری شده است.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Meta matrix: department, budget, executor, contractor */}
              <div id="projects-view-detail-modal-meta" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    اداره متولی
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{detailProject.departmentName}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                    <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                    منبع تأمین مالی
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{detailProject.budgetSourceTitle}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                    <Users2 className="w-3.5 h-3.5 text-cyan-500" />
                    مجری طرح
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{detailProject.executorName}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                    <HardHat className="w-3.5 h-3.5 text-amber-500" />
                    پیمانکار ذیصلاح
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{detailProject.contractorName || 'تعیین نشده'}</span>
                </div>
              </div>

              {/* Financial & per-capita breakdown */}
              <div id="projects-view-detail-modal-financial" className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-slate-400 block text-[10px] mb-1">کل اعتبار مصوب</span>
                  <Num {...formatMoneyParts(detailProject.estimatedCostToman)} className="font-black text-slate-900 dark:text-slate-100" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-slate-400 block text-[10px] mb-1">جمعیت بهره‌بردار</span>
                  <Num value={formatNumber(detailProject.beneficiariesCount)} unit="نفر" className="font-bold text-blue-600 dark:text-blue-400" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-slate-400 block text-[10px] mb-1">سرانه هر نفر</span>
                  <Num {...formatMoneyParts(detailProject.costPerBeneficiaryToman)} className="font-bold text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>

              {/* Progress */}
              <div id="projects-view-detail-modal-progress" className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">پیشرفت فیزیکی پروژه</span>
                  <Num value={formatPercent(detailProject.progressPercentage)} className="font-bold text-slate-800 dark:text-slate-200" />
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${detailProject.progressPercentage}%` }} />
                </div>
              </div>

              {/* Location & timeline */}
              <div id="projects-view-detail-modal-location" className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] mb-1">محدوده جغرافیایی</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {detailProject.province} - {detailProject.county} - {detailProject.districtOrVillage}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] mb-1">بازه زمانی اجرا</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {toPersianDigits(detailProject.startYear)} - {toPersianDigits(detailProject.endYear)}
                    {detailProject.durationMonths > 0 && (
                      <span className="font-sans text-slate-400 font-normal"> (<Num value={formatNumber(detailProject.durationMonths)} unit="ماه" unitClassName="text-[0.8em] font-normal text-slate-400 ms-0.5" />)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div id="projects-view-detail-modal-description">
                <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                  شرح اهداف، مشخصات فنی و خروجی‌های ملموس
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                  {detailProject.description || 'توضیحی برای این پروژه ثبت نشده است.'}
                </p>
              </div>
            </div>

            {/* Footer — management actions live inside the detail modal */}
            <div id="projects-view-detail-modal-footer" className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-400 font-mono truncate">
                شناسه سیستمی: {detailProject.code}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {canManage && (
                  <>
                    {detailProject.status === 'PROPOSED' && (
                      <button
                        type="button"
                        onClick={() => handleToggleProjectStatus(detailProject.id, 'APPROVED')}
                        className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 transition-colors"
                      >
                        تصویب طرح
                      </button>
                    )}
                    {detailProject.status === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handleToggleProjectStatus(detailProject.id, 'IN_PROGRESS')}
                        className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors"
                      >
                        آغاز عملیات
                      </button>
                    )}
                    {detailProject.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        onClick={() => handleToggleProjectStatus(detailProject.id, 'COMPLETED')}
                        className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors"
                      >
                        خاتمه و تحویل
                      </button>
                    )}
                    <button
                      id="btn-edit-project-from-details"
                      type="button"
                      onClick={() => {
                        const target = detailProject;
                        setDetailProjectId(null);
                        handleOpenEdit(target);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      ویرایش مشخصات
                    </button>
                    <button
                      id="btn-delete-project-from-details"
                      type="button"
                      onClick={() => {
                        const target = detailProject;
                        setDetailProjectId(null);
                        confirmDelete(
                          `آیا از حذف پروژه «${target.title}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`,
                          () => handleDeleteProject(target.id)
                        );
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      حذف پروژه
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <Num {...formatMoneyParts(computedPerCapita)} className="font-black text-sm text-slate-900 dark:text-slate-100" />
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
