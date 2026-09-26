import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserProfile, UserPermissionField, AuditActionType } from '../types';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { PageHeader } from './PageHeader';
import {
  ShieldCheck,
  KeyRound,
  History,
  Users,
  Search,
  Filter,
  Check,
  X,
  Lock,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  CheckCircle2,
  Calendar,
  UserCheck,
} from 'lucide-react';

export const RolesAndAccessView: React.FC = () => {
  const {
    rolesPermissions,
    getUserPermissions,
    handleToggleUserPermission,
    auditLogs,
    users,
    currentUser,
    setCurrentUser,
  } = useAppContext();

  const [activeSubTab, setActiveSubTab] = useState<'ROLES_MATRIX' | 'AUDIT_LOGS'>('ROLES_MATRIX');
  const [logSearch, setLogSearch] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');
  // User whose role access is being edited in the modal (null = modal closed).
  const [permissionTargetUser, setPermissionTargetUser] = useState<UserProfile | null>(null);
  const permissionsModalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(permissionsModalRef, () => setPermissionTargetUser(null));

  // Roster pagination — 20 users per page.
  const [userPage, setUserPage] = useState(0);
  const userPageSize = 20;
  const userTotalPages = Math.max(1, Math.ceil(users.length / userPageSize));
  const pagedUsers = users.slice(userPage * userPageSize, userPage * userPageSize + userPageSize);
  const userPageStart = userPage * userPageSize + 1;
  const userPageEnd = Math.min(users.length, (userPage + 1) * userPageSize);

  // Escape closes the permissions modal, matching the location filter dialog.
  useEffect(() => {
    if (!permissionTargetUser) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPermissionTargetUser(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [permissionTargetUser]);

  // Effective (role default + individual overrides) permissions of the user
  // currently being edited in the modal.
  const permissionTargetEffective = permissionTargetUser ? getUserPermissions(permissionTargetUser) : undefined;
  const permissionTargetRoleBase = permissionTargetUser
    ? rolesPermissions.find((r) => r.role === permissionTargetUser.role)
    : undefined;

  // Permission columns
  const permissionCols: Array<{ key: UserPermissionField; label: string }> = [
    { key: 'canManagePriorities', label: 'تنظیم اولویت‌ها' },
    { key: 'canManageBudget', label: 'تخصیص و منابع بودجه' },
    { key: 'canApproveProjects', label: 'تصویب و ثبت پروژه' },
    { key: 'canManageCrises', label: 'مدیریت بحران‌ها' },
    { key: 'canManageExecutors', label: 'مدیریت مجریان' },
    { key: 'canManageContractors', label: 'مدیریت پیمانکاران' },
    { key: 'canEditDepartments', label: 'مدیریت نهادها' },
    { key: 'canAuditLogs', label: 'مشاهده لاگ‌ها' },
  ];

  // Action labels
  const actionLabels: Record<AuditActionType, { label: string; badge: string }> = {
    PERCENTAGE_CHANGE: { label: 'تنظیم درصد بودجه', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    LOCATION_CHANGE: { label: 'تغییر موقعیت مکانی', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    SCENARIO_APPLIED: { label: 'اعمال سناریوی AI', badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
    PRIORITY_ADD: { label: 'افزودن اولویت', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    PRIORITY_EDIT: { label: 'ویرایش اولویت', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    PRIORITY_DELETE: { label: 'حذف اولویت', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    PROJECT_ADD: { label: 'ثبت پروژه جدید', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    PROJECT_EDIT: { label: 'ویرایش پروژه', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    PROJECT_DELETE: { label: 'حذف پروژه', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    PROJECT_STATUS_CHANGE: { label: 'تغییر وضعیت پروژه', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    BUDGET_UPDATE: { label: 'تغییر سقف کل بودجه', badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
    DEPARTMENT_ADD: { label: 'ثبت نهاد جدید', badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
    DEPARTMENT_EDIT: { label: 'ویرایش نهاد', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    DEPARTMENT_DELETE: { label: 'حذف نهاد', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    BUDGET_SOURCE_ADD: { label: 'ثبت منبع بودجه', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    BUDGET_SOURCE_EDIT: { label: 'ویرایش منبع بودجه', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    BUDGET_SOURCE_DELETE: { label: 'حذف منبع بودجه', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    CRISIS_ADD: { label: 'ثبت بحران جدید', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    CRISIS_EDIT: { label: 'ویرایش بحران', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    CRISIS_DELETE: { label: 'حذف بحران', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    EXECUTOR_ADD: { label: 'ثبت مجری جدید', badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
    EXECUTOR_EDIT: { label: 'ویرایش مجری', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    EXECUTOR_DELETE: { label: 'حذف مجری', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    CONTRACTOR_ADD: { label: 'ثبت پیمانکار جدید', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    CONTRACTOR_EDIT: { label: 'ویرایش پیمانکار', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    CONTRACTOR_DELETE: { label: 'حذف پیمانکار', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    EXPORT_REPORT: { label: 'دریافت خروجی گزارش', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    DUPLICATE_FLAGGED: { label: 'ردیابی موازی‌کاری', badge: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
    LOGIN: { label: 'ورود به سامانه', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    LOGOUT: { label: 'خروج از سامانه', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchQ =
        log.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.targetPriorityTitle && log.targetPriorityTitle.toLowerCase().includes(logSearch.toLowerCase())) ||
        (log.rationale && log.rationale.toLowerCase().includes(logSearch.toLowerCase()));
      const matchAct = selectedActionFilter === 'ALL' || log.actionType === selectedActionFilter;
      return matchQ && matchAct;
    });
  }, [auditLogs, logSearch, selectedActionFilter]);

  return (
    <div id="roles-and-access-view-root" className="space-y-6">
      {/* Page title block — above the banner, per the page-header reference. */}
      <PageHeader
        id="roles-and-access-view-page-header"
        icon={ShieldCheck}
        title="مدیریت نقش‌ها، سطح دسترسی‌ها و تاریخچه عملیات"
        subtitle="ماتریس دسترسی مبتنی بر نقش (RBAC) و لاگ‌های سیستمی"
        tone="text-indigo-600"
      />

      {/* Banner — section label and the sub-tab switcher. */}
      <div id="roles-and-access-view-header-banner-light-theme" className="bg-gradient-to-r from-slate-100 via-indigo-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-indigo-200/80 shadow-2xs relative overflow-hidden">
        <div id="roles-and-access-view-header-banner-light-theme-2" className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div id="roles-and-access-view-header-banner-light-theme-4" className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
              امنیت، حاکمیت داده و ردگیری تغییرات
            </span>
          </div>
        </div>

        {/* Sub-tab switcher */}
        <div id="roles-and-access-view-sub-tab-switcher" className="flex items-center gap-2 mt-6 pt-4 border-t border-indigo-200/60">
          <button
            onClick={() => setActiveSubTab('ROLES_MATRIX')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'ROLES_MATRIX'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>ماتریس نقش‌ها و مجوزهای دسترسی</span>
          </button>

          <button
            onClick={() => setActiveSubTab('AUDIT_LOGS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'AUDIT_LOGS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>تاریخچه و لاگ‌های نظارتی سامانه ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Users Roster — full-width section with paginated users */}
      {activeSubTab === 'ROLES_MATRIX' && (
        <div id="roles-and-access-view-active-user-switcher" className="bg-white rounded-xl p-4 border border-slate-300 shadow-2xs flex flex-col gap-3 w-full">
          <div id="roles-and-access-view-active-user-switcher-2" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div id="roles-and-access-view-active-user-switcher-3" className="min-w-0">
              <span className="text-[10px] text-slate-500 block font-semibold">کاربران سازمانی (فعال‌سازی کاربر یا ویرایش دسترسی):</span>
              <span className="text-xs font-bold text-slate-900 block truncate">
                کاربر فعال جاری: {currentUser.name} — {currentUser.roleFa}
              </span>
            </div>
          </div>

          <div id="roles-and-access-view-active-user-switcher-4" className="border border-slate-200 rounded-lg divide-y divide-slate-100">
            {pagedUsers.map((u) => {
              const isActiveUser = u.id === currentUser.id;

              return (
                <div
                  key={u.id}
                  id={`roles-and-access-view-active-user-switcher-5-${u.id}`}
                  className={`flex items-center gap-2 p-2 ${isActiveUser ? 'bg-indigo-50/60' : ''}`}
                >
                  <button
                    id={`roles-and-access-view-active-user-switcher-6-${u.id}`}
                    onClick={() => setCurrentUser(u)}
                    title={`فعال‌سازی ${u.name} به عنوان کاربر جاری`}
                    className="flex-1 min-w-0 text-right"
                  >
                    <span className="block text-[11px] font-bold text-slate-900 truncate">{u.name}</span>
                    <span className="block text-[10px] text-slate-500 truncate">
                      {u.roleFa} — {u.organization}
                    </span>
                  </button>

                  {isActiveUser && (
                    <span className="px-1.5 py-0.5 text-[9px] rounded bg-indigo-600 text-white font-bold shrink-0">
                      فعال
                    </span>
                  )}

                  <button
                    id={`roles-and-access-view-active-user-switcher-7-${u.id}`}
                    onClick={() => setPermissionTargetUser(u)}
                    title={`ویرایش دسترسی‌های اختصاصی ${u.name}`}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 border border-slate-200 shrink-0 transition-colors"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>ویرایش دسترسی</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div id="roles-and-access-view-active-user-switcher-8" className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
            <span id="roles-and-access-view-active-user-switcher-9" className="text-[10px] text-slate-500">
              نمایش {userPageStart.toLocaleString('fa-IR')} تا {userPageEnd.toLocaleString('fa-IR')} از {users.length.toLocaleString('fa-IR')} کاربر
            </span>
            <div className="flex items-center gap-1.5">
              <button
                id="roles-and-access-view-active-user-switcher-10"
                onClick={() => setUserPage((p) => Math.max(0, p - 1))}
                disabled={userPage === 0}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 border border-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                قبلی
              </button>
              <span id="roles-and-access-view-active-user-switcher-11" className="text-[10px] font-bold text-slate-600">
                صفحه {(userPage + 1).toLocaleString('fa-IR')} از {userTotalPages.toLocaleString('fa-IR')}
              </span>
              <button
                id="roles-and-access-view-active-user-switcher-12"
                onClick={() => setUserPage((p) => Math.min(userTotalPages - 1, p + 1))}
                disabled={userPage >= userTotalPages - 1}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 border border-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                بعدی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Audit Trail Logs */}
      {activeSubTab === 'AUDIT_LOGS' && (
        <div id="roles-and-access-view-sub-tab-2-audit-trail-logs" className="space-y-4">
          <div id="roles-and-access-view-sub-tab-2-audit-trail-logs-2" className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            <div id="roles-and-access-view-sub-tab-2-audit-trail-logs-3" className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                placeholder="جستجو در شرح لاگ، کاربر یا موضوع..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pr-10 pl-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div id="roles-and-access-view-sub-tab-2-audit-trail-logs-4" className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-slate-500 dark:text-slate-400">نوع عملیات:</span>
              <select
                value={selectedActionFilter}
                onChange={(e) => setSelectedActionFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">همه انواع رویدادها ({auditLogs.length})</option>
                <option value="PERCENTAGE_CHANGE">تنظیم درصد بودجه</option>
                <option value="LOCATION_CHANGE">تغییر موقعیت مکانی</option>
                <option value="PROJECT_ADD">ثبت پروژه</option>
                <option value="PROJECT_STATUS_CHANGE">تغییر وضعیت پروژه</option>
                <option value="DEPARTMENT_ADD">مدیریت نهادها</option>
                <option value="BUDGET_SOURCE_ADD">مدیریت منابع بودجه</option>
                <option value="CRISIS_ADD">مدیریت بحران‌ها</option>
              </select>
            </div>
          </div>

          <div id="roles-and-access-view-sub-tab-2-audit-trail-logs-5" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div id="roles-and-access-view-sub-tab-2-audit-trail-logs-6" className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-850">
                    <th className="py-3 px-4 font-bold">زمان رویداد</th>
                    <th className="py-3 px-4 font-bold">کاربر ثبت‌کننده</th>
                    <th className="py-3 px-4 font-bold">نوع اقدام</th>
                    <th className="py-3 px-4 font-bold">موضوع / هدف</th>
                    <th className="py-3 px-4 font-bold">مقدار پیشین ➔ مقدار جدید</th>
                    <th className="py-3 px-4 font-bold">شرح و توجیه سیستمی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.map((log) => {
                    const actionInfo = actionLabels[log.actionType] || {
                      label: log.actionType,
                      badge: 'bg-slate-100 text-slate-700',
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-3.5 px-4">
                          <div id={`roles-and-access-view-sub-tab-2-audit-trail-logs-7-${log.id}`} className="font-bold text-slate-900 dark:text-slate-100">{log.userName}</div>
                          <div id={`roles-and-access-view-sub-tab-2-audit-trail-logs-8-${log.id}`} className="text-[10px] text-slate-400">{log.userRole}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${actionInfo.badge}`}>
                            {actionInfo.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {log.targetPriorityTitle || '-'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {log.oldValue || '-'} ➔ {log.newValue || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed max-w-xs">
                          {log.rationale || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredLogs.length === 0 && (
              <div id="roles-and-access-view-sub-tab-2-audit-trail-logs-9" className="p-8 text-center text-slate-400 text-xs">هیچ رویدادی با این مشخصات ثبت نشده است.</div>
            )}
          </div>
        </div>
      )}

      {/* Per-user permission editor modal (standalone overlay). Permissions are
          stored for the individual user and never affect other users of the
          same role. */}
      {permissionTargetUser && (
        <div id="roles-and-access-view-permissions-modal" className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl">
          <div
            id="roles-and-access-view-permissions-modal-2"
            ref={permissionsModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="roles-and-access-view-permissions-modal-title"
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden w-full max-w-2xl"
          >
            <div id="roles-and-access-view-permissions-modal-header" className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between gap-4">
              <div id="roles-and-access-view-permissions-modal-header-2">
                <h3 id="roles-and-access-view-permissions-modal-title" className="font-black text-sm flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-300" />
                  ویرایش دسترسی‌های {permissionTargetUser.name}
                </h3>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  مجوزها به‌صورت اختصاصی برای این کاربر ذخیره می‌شوند؛ تغییرات هیچ‌کدام از کاربران هم‌نقش او را تحت تأثیر قرار نمی‌دهند.
                </p>
              </div>
              <button
                id="roles-and-access-view-permissions-modal-close-button"
                onClick={() => setPermissionTargetUser(null)}
                title="بستن پنجره ویرایش دسترسی"
                aria-label="بستن"
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div id="roles-and-access-view-permissions-modal-3" className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div id="roles-and-access-view-permissions-modal-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">دسترسی‌های اختصاصی کاربر</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  روی هر مجوز کلیک کنید تا فقط برای «{permissionTargetUser.name}» اعمال شود؛ مقادیر تغییرنیافته پیش‌فرض نقش «{permissionTargetUser.roleFa}» را به ارث می‌برند.
                </p>
              </div>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                نقش فعلی شما: {currentUser.roleFa}
              </span>
            </div>

            <div id="roles-and-access-view-permissions-modal-5" className="overflow-auto max-h-[70vh]">
              <div id="roles-and-access-view-permissions-modal-6" className="p-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
                <img
                  src={permissionTargetUser.avatar}
                  alt={permissionTargetUser.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
                <div className="min-w-0">
                  <div id="roles-and-access-view-permissions-modal-7" className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {permissionTargetUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {permissionTargetUser.roleFa} — {permissionTargetUser.organization}
                  </div>
                </div>
              </div>

              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-850">
                    <th className="py-3 px-4 font-bold">حوزه اختیارات</th>
                    <th className="py-3 px-4 font-bold">مبنای اعمال</th>
                    <th className="py-3 px-4 font-bold text-center">وضعیت مجوز</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {permissionCols.map((col) => {
                    const isGranted = Boolean(permissionTargetEffective?.[col.key]);
                    const isIndividualOverride =
                      Boolean(
                        permissionTargetEffective &&
                          permissionTargetRoleBase &&
                          permissionTargetEffective[col.key] !== permissionTargetRoleBase[col.key]
                      );
                    return (
                      <tr key={col.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{col.label}</td>
                        <td className="py-3 px-4">
                          <span
                            id={`roles-and-access-view-permissions-modal-8-${col.key}`}
                            className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${
                              isIndividualOverride
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {isIndividualOverride ? 'اختصاصی این کاربر' : 'پیش‌فرض نقش'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            id={`roles-and-access-view-permissions-modal-9-${col.key}`}
                            onClick={() => handleToggleUserPermission(permissionTargetUser.id, col.key)}
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all ${
                              isGranted
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                            title={`${isGranted ? 'سلب مجوز' : 'اعطای مجوز'} ${col.label} برای ${permissionTargetUser.name}`}
                          >
                            {isGranted ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
