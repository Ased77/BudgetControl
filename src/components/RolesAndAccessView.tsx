import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserProfile, UserRole, SystemRolePermission, AuditActionType } from '../types';
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
    handleTogglePermission,
    auditLogs,
    users,
    currentUser,
    setCurrentUser,
  } = useAppContext();

  const [activeSubTab, setActiveSubTab] = useState<'ROLES_MATRIX' | 'AUDIT_LOGS'>('ROLES_MATRIX');
  const [logSearch, setLogSearch] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');

  // Permission columns
  const permissionCols: Array<{ key: keyof SystemRolePermission; label: string }> = [
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
    <div className="space-y-6">
      {/* Header Banner (Light Theme) */}
      <div className="bg-gradient-to-r from-slate-100 via-indigo-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-indigo-200/80 shadow-2xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                امنیت، حاکمیت داده و ردگیری تغییرات
              </span>
              <span className="text-xs text-slate-500">ماتریس دسترسی مبتنی بر نقش (RBAC) و لاگ‌های سیستمی</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-indigo-600" />
              مدیریت نقش‌ها، سطح دسترسی‌ها و تاریخچه عملیات
            </h1>
            <p className="text-slate-600 text-sm mt-1 max-w-3xl leading-relaxed">
              پیکربندی حدود اختیارات هر نقش در سامانه و بررسی شفاف تمامی رویدادها، تغییرات تخصیص بودجه و تغییر وضعیت پروژه‌ها به
              همراه دلیل تصمیم‌گیری و مشخصات دقیق کاربر مسئول.
            </p>
          </div>

          {/* Active User Switcher */}
          <div className="bg-white rounded-xl p-3 border border-slate-300 shadow-2xs flex items-center gap-3 self-start md:self-auto">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-semibold">کاربر فعال جاری (تست اختیارات):</span>
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const u = users.find((usr) => usr.id === e.target.value);
                  if (u) setCurrentUser(u);
                }}
                className="bg-transparent text-xs font-bold text-slate-900 border-none focus:outline-none cursor-pointer"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-white text-slate-900">
                    {u.name} — {u.roleFa} ({u.organization})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-indigo-200/60">
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

      {/* Sub-tab 1: Permissions Matrix */}
      {activeSubTab === 'ROLES_MATRIX' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">جدول کنترل دسترسی بر پایه نقش (RBAC)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  برای تغییر آنی مجوزهای هر نقش، مستقیماً روی خانه‌ها کلیک کنید.
                </p>
              </div>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                نقش فعلی شما: {currentUser.roleFa}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-850">
                    <th className="py-3 px-4 font-bold">عنوان نقش سازمانی</th>
                    <th className="py-3 px-4 font-bold">حوزه اختیارات</th>
                    {permissionCols.map((col) => (
                      <th key={col.key} className="py-3 px-3 font-bold text-center">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rolesPermissions.map((rp) => (
                    <tr
                      key={rp.role}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        currentUser.role === rp.role ? 'bg-indigo-50/30 dark:bg-indigo-950/20 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{rp.roleFa}</span>
                          {currentUser.role === rp.role && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded">
                              شما
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">{rp.description}</td>

                      {permissionCols.map((col) => {
                        const isGranted = Boolean(rp[col.key]);
                        return (
                          <td key={col.key} className="py-3.5 px-3 text-center">
                            <button
                              onClick={() => handleTogglePermission(rp.role, col.key)}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all ${
                                isGranted
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                              }`}
                              title={`${isGranted ? 'سلب مجوز' : 'اعطای مجوز'} ${col.label}`}
                            >
                              {isGranted ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Audit Trail Logs */}
      {activeSubTab === 'AUDIT_LOGS' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                placeholder="جستجو در شرح لاگ، کاربر یا موضوع..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pr-10 pl-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
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

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
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
                          <div className="font-bold text-slate-900 dark:text-slate-100">{log.userName}</div>
                          <div className="text-[10px] text-slate-400">{log.userRole}</div>
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
              <div className="p-8 text-center text-slate-400 text-xs">هیچ رویدادی با این مشخصات ثبت نشده است.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
