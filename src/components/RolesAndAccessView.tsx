import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserProfile, UserPermissionField, AuditActionType, AuditLogItem } from '../types';
import { useOutsideClick } from '../hooks/useOutsideClick';
import {
  DEFAULT_ROLES_SUB_TAB,
  hashForRolesSubTab,
  persistRolesSubTab,
  readPersistedRolesSubTab,
  rolesSubTabFromHash,
  type RolesViewSubTab,
} from '../utils/rolesViewTab';
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
  UserPlus,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from 'lucide-react';
import { api } from '../services/api';
import { authApi, CreateAccountResult } from '../services/authApi';

/** Columns of the audit trail, in render order. The header, the <colgroup> widths
 *  and the sort keys all read from this one list, so a column can never be
 *  sortable in the header but mis-sized in the body (or vice versa). */
type AuditLogSortKey = 'timestamp' | 'userName' | 'actionType' | 'targetPriorityTitle' | 'value' | 'rationale';

const AUDIT_LOG_COLUMNS: { key: AuditLogSortKey; label: string; width: string | null }[] = [
  { key: 'timestamp', label: 'زمان رویداد', width: '8.5rem' },
  { key: 'userName', label: 'کاربر ثبت‌کننده', width: '10rem' },
  { key: 'actionType', label: 'نوع اقدام', width: '9rem' },
  { key: 'targetPriorityTitle', label: 'موضوع / هدف', width: '12rem' },
  { key: 'value', label: 'مقدار پیشین ➔ مقدار جدید', width: '12rem' },
  // The prose column takes whatever is left of the table's floor width.
  { key: 'rationale', label: 'شرح و توجیه سیستمی', width: null },
];

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/**
 * Orderable value of a Persian-digit timestamp «۱۴۰۵/۷/۲۰ - ۱۱:۵۳».
 *
 * Lexicographic string comparison is wrong here: the month and day are not
 * zero-padded, so «۱۲» would sort before «۷». The parts are converted to a single
 * ascending number instead — an ordinal, not an epoch; only the ordering matters.
 */
const auditTimestampOrder = (timestamp: string): number => {
  const latin = timestamp.replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)));
  const [datePart, timePart = ''] = latin.split('-').map((part) => part.trim());
  const [year = 0, month = 0, day = 0] = datePart.split('/').map((part) => parseInt(part, 10) || 0);
  const [hour = 0, minute = 0] = timePart.split(':').map((part) => parseInt(part, 10) || 0);
  return (((year * 12 + month) * 31 + day) * 24 + hour) * 60 + minute;
};

export const RolesAndAccessView: React.FC = () => {
  const {
    rolesPermissions,
    getUserPermissions,
    handleToggleUserPermission,
    auditLogs,
    users,
    currentUser,
    logout,
  } = useAppContext();

  // Which sub-tab is open. Read order: the URL hash, then the last visit on this
  // browser, then the matrix. The hash comes first because the two sub-tabs are
  // mounted conditionally — the audit table's ids exist only while its own
  // sub-tab is active, so a `#audit-logs` link has to win over whatever was open
  // in a previous session.
  const [activeSubTab, setActiveSubTab] = useState<RolesViewSubTab>(
    () => rolesSubTabFromHash(window.location.hash) ?? readPersistedRolesSubTab() ?? DEFAULT_ROLES_SUB_TAB
  );

  /**
   * Switch sub-tabs, mirroring the choice into the URL and the last-visit key.
   *
   * `replaceState` rather than `pushState`: a sub-tab is a view of the page
   * already on screen, not a page of its own, so it must not add history entries
   * the back button would have to walk through first. Path and query are carried
   * over untouched — the shell owns them.
   */
  const selectSubTab = (tab: RolesViewSubTab) => {
    setActiveSubTab(tab);
    persistRolesSubTab(tab);
    const { pathname, search } = window.location;
    window.history.replaceState(null, '', `${pathname}${search}${hashForRolesSubTab(tab)}`);
  };

  // A hash typed into the address bar, a bookmark, or a back/forward step between
  // two hashes of this page adopts the sub-tab it names.
  useEffect(() => {
    const handleHashChange = () => {
      const fromHash = rolesSubTabFromHash(window.location.hash);
      if (!fromHash) return;
      setActiveSubTab(fromHash);
      persistRolesSubTab(fromHash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Keep the address bar in step with the view. A session that resumes on the
  // audit trail — the shell rewrote the entry's path without a hash, or the page
  // was typed — gets the hash that addresses what is on screen, so the link in
  // the address bar always reproduces the current view (and can be handed to
  // someone else). The default sub-tab has no hash and is left alone.
  useEffect(() => {
    const hash = hashForRolesSubTab(activeSubTab);
    if (!hash || window.location.hash === hash) return;
    const { pathname, search } = window.location;
    window.history.replaceState(null, '', `${pathname}${search}${hash}`);
  }, [activeSubTab]);

  const [logSearch, setLogSearch] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');
  // Audit-trail ordering. Default is newest first, which is the order the log
  // itself records events in, so the initial view is unchanged.
  const [logSort, setLogSort] = useState<{ key: AuditLogSortKey; direction: 'asc' | 'desc' }>({
    key: 'timestamp',
    direction: 'desc',
  });
  // User whose role access is being edited in the modal (null = modal closed).
  const [permissionTargetUser, setPermissionTargetUser] = useState<UserProfile | null>(null);
  const permissionsModalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(permissionsModalRef, () => setPermissionTargetUser(null));

  // Roster pagination — 20 users per page.
  const [userPage, setUserPage] = useState(0);
  const userPageSize = 20;

  // ---------------------------------------------------------------------------
  // Account creation — admins only. There is no self-registration: this
  // modal is the only place in the UI where a new account can be born.
  // ---------------------------------------------------------------------------
  const isAdmin = currentUser?.role === 'SYSTEM_ADMIN';
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ displayName: '', mobile: '', role: '', province: '', county: '' });
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdAccount, setCreatedAccount] = useState<CreateAccountResult | null>(null);
  const createModalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(createModalRef, () => setCreateOpen(false));

  // Roster kept in a local mirror so a freshly created account shows up the
  // moment the server confirms, without reloading the whole application. The
  // context hydrates asynchronously (bundled demo data first, server list
  // after), so the mirror follows the context instead of pinning its first
  // value only.
  const [rosterUsers, setRosterUsers] = useState<UserProfile[]>(users);
  useEffect(() => {
    setRosterUsers(users);
  }, [users]);
  const userTotalPages = Math.max(1, Math.ceil(rosterUsers.length / userPageSize));
  const pagedUsers = rosterUsers.slice(userPage * userPageSize, userPage * userPageSize + userPageSize);
  const userPageStart = userPage * userPageSize + 1;
  const userPageEnd = Math.min(rosterUsers.length, (userPage + 1) * userPageSize);

  const refreshRoster = async () => {
    try {
      setRosterUsers(await api.users.list());
    } catch {
      /* the mirror stays at its previous value; the next full load catches up */
    }
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (createBusy) return;
    setCreateError(null);
    setCreateBusy(true);
    try {
      const result = await authApi.createAccount({
        mobile: createForm.mobile.trim(),
        displayName: createForm.displayName.trim(),
        role: createForm.role,
        ...(createForm.province.trim() && { province: createForm.province.trim() }),
        ...(createForm.county.trim() && { county: createForm.county.trim() }),
      });
      setCreatedAccount(result);
      setCreateForm({ displayName: '', mobile: '', role: '', province: '', county: '' });
      await refreshRoster();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'خطای نامشخص در ایجاد کاربر');
    } finally {
      setCreateBusy(false);
    }
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreatedAccount(null);
    setCreateError(null);
  };

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
    { key: 'canCreateProject', label: 'ثبت پروژه' },
    { key: 'canApproveProjects', label: 'تصویب پروژه' },
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
    ANALYSIS_SOURCE_ADD: { label: 'افزودن منبع تحلیل', badge: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
    ANALYSIS_SOURCE_EDIT: { label: 'ویرایش منبع تحلیل', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    ANALYSIS_SOURCE_DELETE: { label: 'حذف منبع تحلیل', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    ANALYSIS_SOURCE_REVIEW: { label: 'بازبینی منبع تحلیل', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
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

  // Clicking a header sorts by that column; clicking the active one flips the
  // direction. A newly chosen text column opens ascending, while the timestamp
  // opens newest-first — "latest activity" is the useful first view of a log.
  const toggleLogSort = (key: AuditLogSortKey) => {
    setLogSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'timestamp' ? 'desc' : 'asc' }
    );
  };

  /**
   * Filtered logs in the chosen order. `actionLabels` is static data declared in
   * this component, so reading it from the closure cannot go stale; the sort runs
   * over the filtered rows only (163 on the seeded data).
   */
  const sortedLogs = useMemo(() => {
    const { key, direction } = logSort;
    const factor = direction === 'asc' ? 1 : -1;

    // Action types order by their displayed Persian label, never the raw enum
    // key, so the order matches the text the column actually shows.
    const sortValue = (log: AuditLogItem): number | string => {
      switch (key) {
        case 'timestamp':
          return auditTimestampOrder(log.timestamp);
        case 'userName':
          return log.userName;
        case 'actionType':
          return actionLabels[log.actionType]?.label ?? log.actionType;
        case 'targetPriorityTitle':
          return log.targetPriorityTitle ?? '';
        case 'value':
          return `${log.oldValue ?? ''} ${log.newValue ?? ''}`;
        case 'rationale':
          return log.rationale ?? '';
      }
    };

    return [...filteredLogs].sort((a, b) => {
      const left = sortValue(a);
      const right = sortValue(b);
      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * factor;
      }
      return String(left).localeCompare(String(right), 'fa') * factor;
    });
  }, [filteredLogs, logSort]);

  const activeSortColumn =
    AUDIT_LOG_COLUMNS.find((column) => column.key === logSort.key) ?? AUDIT_LOG_COLUMNS[0];

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
            onClick={() => selectSubTab('ROLES_MATRIX')}
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
            onClick={() => selectSubTab('AUDIT_LOGS')}
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
            {isAdmin && (
              <button
                id="roles-and-access-view-active-user-switcher-create-user"
                onClick={() => {
                  setCreateError(null);
                  setCreatedAccount(null);
                  setCreateOpen(true);
                }}
                title="ایجاد حساب کاربری جدید — تنها مسیر ایجاد حساب"
                className="ms-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-700 shadow-sm transition-colors shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>افزودن کاربر</span>
              </button>
            )}
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
                  <div
                    id={`roles-and-access-view-active-user-switcher-6-${u.id}`}
                    title="هویت فعال از نشست احرازشدهٔ سرور می‌آید و از این صفحه قابل تغییر نیست"
                    className="flex-1 min-w-0 text-right cursor-default"
                  >
                    <span className="block text-[11px] font-bold text-slate-900 truncate">{u.name}</span>
                    <span className="block text-[10px] text-slate-500 truncate">
                      {u.roleFa} — {u.organization}
                    </span>
                  </div>

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
              نمایش {userPageStart.toLocaleString('fa-IR')} تا {userPageEnd.toLocaleString('fa-IR')} از {rosterUsers.length.toLocaleString('fa-IR')} کاربر
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
            {/* One scroll region for both axes with a bounded height, so the
                sticky header below actually sticks: with `overflow-x-auto` on a
                wrapper that never scrolls vertically, the header would scroll
                away with the page instead of holding the top of the table. */}
            <div
              id="roles-and-access-view-sub-tab-2-audit-trail-logs-6"
              className="max-h-[70vh] overflow-auto"
            >
              {/* Fixed layout with declared column widths. Under the browser's
                  automatic layout the long «مقدار پیشین ➔ مقدار جدید» run (nowrap
                  plus a decades-long value) claimed the widest column, growing it
                  to roughly twice the viewport, which crushed the other five into
                  ~95px stacks and stretched every row over several lines. Fixed
                  widths give the two prose columns — موضوع و شرح — the wrap room,
                  and keep the timestamp / actor / action columns at their natural
                  size. The table keeps a floor width so narrow screens scroll the
                  whole audit list rather than squashing it again. */}
              <table className="w-full min-w-[68rem] table-fixed text-right text-xs">
                {/* Widths travel as inline styles, not utilities: a class name
                    assembled at runtime would never reach Tailwind's scanner. */}
                <colgroup>
                  {AUDIT_LOG_COLUMNS.map((column) => (
                    <col
                      key={column.key}
                      style={column.width ? { width: column.width } : undefined}
                    />
                  ))}
                </colgroup>
                <thead>
                  {/* Each `th` carries the sticky position itself rather than the
                      row, and paints its own opaque background and bottom rule —
                      a row-level fill or border would scroll away with the body
                      and let the rows show through the header. */}
                  <tr className="text-slate-500 dark:text-slate-400">
                    {AUDIT_LOG_COLUMNS.map((column) => {
                      const isActive = logSort.key === column.key;
                      const ariaSort = isActive
                        ? logSort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none';

                      return (
                        <th
                          key={column.key}
                          scope="col"
                          aria-sort={ariaSort}
                          className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 py-3 px-4 font-bold border-b border-slate-200 dark:border-slate-800"
                        >
                          <button
                            type="button"
                            id={`roles-and-access-view-sub-tab-2-audit-trail-logs-sort-${column.key}`}
                            onClick={() => toggleLogSort(column.key)}
                            title={
                              isActive
                                ? `مرتب‌سازی ${column.label} — تغییر جهت ترتیب`
                                : `مرتب‌سازی بر اساس ${column.label}`
                            }
                            className={`inline-flex items-center gap-1.5 rounded-md transition-colors cursor-pointer hover:text-indigo-700 dark:hover:text-indigo-300 ${
                              isActive ? 'text-indigo-700 dark:text-indigo-300' : ''
                            }`}
                          >
                            <span>{column.label}</span>
                            {isActive ? (
                              logSort.direction === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              )
                            ) : (
                              <ChevronsUpDown
                                className="w-3.5 h-3.5 shrink-0 text-slate-300 dark:text-slate-600"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedLogs.map((log) => {
                    const actionInfo = actionLabels[log.actionType] || {
                      label: log.actionType,
                      badge: 'bg-slate-100 text-slate-700',
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 align-top font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-3 px-4 align-top">
                          <div id={`roles-and-access-view-sub-tab-2-audit-trail-logs-7-${log.id}`} className="font-bold text-slate-900 dark:text-slate-100">{log.userName}</div>
                          <div id={`roles-and-access-view-sub-tab-2-audit-trail-logs-8-${log.id}`} className="text-[10px] text-slate-400">{log.userRole}</div>
                        </td>
                        <td className="py-3 px-4 align-top whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${actionInfo.badge}`}>
                            {actionInfo.label}
                          </span>
                        </td>
                        {/* The three prose columns are clamped to a fixed number
                            of lines (full text stays available on hover): a
                            LOCATION_CHANGE log carries a whole population
                            breakdown, and unclamped it stretched single rows to
                            several hundred pixels while the rest of the table
                            stayed one line tall. The clamp lives on an inner
                            block — putting it on the cell itself would replace
                            `table-cell`, which collapses the fixed layout. */}
                        <td className="py-3 px-4 align-top font-medium text-slate-800 dark:text-slate-200">
                          <div
                            className="line-clamp-2 break-words leading-relaxed"
                            title={log.targetPriorityTitle || '-'}
                          >
                            {log.targetPriorityTitle || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-top font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          <div
                            className="line-clamp-3 break-words leading-relaxed"
                            title={`${log.oldValue || '-'} ➔ ${log.newValue || '-'}`}
                          >
                            {log.oldValue || '-'} ➔ {log.newValue || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-top text-slate-600 dark:text-slate-400 text-[11px]">
                          <div className="line-clamp-3 break-words leading-relaxed" title={log.rationale || '-'}>
                            {log.rationale || '-'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sortedLogs.length > 0 && (
              <div
                id="roles-and-access-view-sub-tab-2-audit-trail-logs-10"
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400"
              >
                <span>
                  نمایش {sortedLogs.length.toLocaleString('fa-IR')} از {auditLogs.length.toLocaleString('fa-IR')} رویداد
                </span>
                <span>
                  ترتیب: {activeSortColumn.label} — {logSort.direction === 'asc' ? 'صعودی' : 'نزولی'}
                </span>
              </div>
            )}

            {filteredLogs.length === 0 && (
              <div id="roles-and-access-view-sub-tab-2-audit-trail-logs-9" className="p-8 text-center text-slate-400 text-xs">هیچ رویدادی با این مشخصات ثبت نشده است.</div>
            )}
          </div>
        </div>
      )}

      {/* Account creation modal — the ONLY UI path to a new account. Visible
          to admins only; the server re-checks the role (403 otherwise). The
          system generates a one-time password when the admin supplies none,
          and that password is displayed exactly once, here. */}
      {createOpen && (
        <div id="roles-and-access-view-create-user-modal" className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl">
          <div
            id="roles-and-access-view-create-user-modal-2"
            ref={createModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="roles-and-access-view-create-user-modal-title"
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden w-full max-w-xl"
          >
            <div id="roles-and-access-view-create-user-modal-header" className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between gap-4">
              <div id="roles-and-access-view-create-user-modal-header-2">
                <h3 id="roles-and-access-view-create-user-modal-title" className="font-black text-sm flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-300" />
                  ایجاد حساب کاربری جدید
                </h3>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  تنها مسیر ایجاد حساب در سامانه همین پنجره است؛ ثبت‌نام آزاد وجود ندارد.
                </p>
              </div>
              <button
                id="roles-and-access-view-create-user-modal-close-button"
                onClick={closeCreateModal}
                title="بستن پنجره ایجاد حساب"
                aria-label="بستن"
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdAccount ? (
              /* Success state: the identity is on the server; if the system
                 generated the password it is shown here — and never again. */
              <div id="roles-and-access-view-create-user-modal-success" className="p-5 space-y-4">
                <div className="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    حساب برای «{createdAccount.user.name}» ساخته شد و در فهرست کاربران همین صفحه ظاهر می‌شود.
                  </span>
                </div>
                {createdAccount.generatedPassword && (
                  <div id="roles-and-access-view-create-user-modal-password" className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                    <p className="text-[11px] font-bold text-amber-900 mb-1">
                      رمز عبور یک‌بار مصرف — همین حالا کپی کنید:
                    </p>
                    <code dir="ltr" className="block text-sm font-mono font-bold text-amber-900 bg-white/70 rounded-lg px-3 py-2 select-all text-left break-all">
                      {createdAccount.generatedPassword}
                    </code>
                    <p className="text-[10px] text-amber-800 mt-2">
                      به «{createdAccount.user.mobile}» اعلام شود. این رمز پس از بستن این پنجره دیگر قابل مشاهده نیست؛
                      کاربر در اولین ورود می‌تواند آن را تغییر دهد.
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                >
                  بستن پنجره
                </button>
              </div>
            ) : (
              <form id="roles-and-access-view-create-user-modal-form" onSubmit={handleCreateUser} className="p-4 pt-3 flex flex-col gap-3">
                {createError && (
                  <div className="flex items-start gap-2 text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 leading-relaxed">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>{createError}</span>
                  </div>
                )}
                <label className="block">
                  <span className="block text-[11px] font-bold text-slate-700 mb-1.5">نام نمایشی</span>
                  <input
                    type="text"
                    required
                    minLength={2}
                    dir="rtl"
                    value={createForm.displayName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
                    placeholder="نام و نام خانوادگی"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold text-slate-700 mb-1.5">شماره موبایل سازمانی</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    dir="ltr"
                    minLength={10}
                    value={createForm.mobile}
                    onChange={(e) => setCreateForm((f) => ({ ...f, mobile: e.target.value }))}
                    placeholder="09xxxxxxxxx"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-left focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold text-slate-700 mb-1.5">نقش (بر اساس ماتریس دسترسی)</span>
                  <select
                    required
                    value={createForm.role}
                    onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="" disabled>انتخاب نقش…</option>
                    {rolesPermissions.map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.roleTitleFa || r.role}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-[11px] font-bold text-slate-700 mb-1.5">استان (اختیاری)</span>
                    <input
                      type="text"
                      dir="rtl"
                      value={createForm.province}
                      onChange={(e) => setCreateForm((f) => ({ ...f, province: e.target.value }))}
                      className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-bold text-slate-700 mb-1.5">شهرستان (اختیاری)</span>
                    <input
                      type="text"
                      dir="rtl"
                      value={createForm.county}
                      onChange={(e) => setCreateForm((f) => ({ ...f, county: e.target.value }))}
                      className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  رمز عبور به‌صورت خودکار و یک‌بارمصرف ساخته و فقط یک‌بار نمایش داده می‌شود؛ ارسال آن به کاربر بر عهده مدیر است.
                </p>
                <button
                  type="submit"
                  disabled={createBusy}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs transition-all ${
                    createBusy
                      ? 'bg-indigo-400 text-white cursor-wait'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  ایجاد حساب
                </button>
              </form>
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
