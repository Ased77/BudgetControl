import React, { useState, useEffect, useRef } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { exportToCsv } from './utils/excelExport';
import { triggerPrintPdf } from './utils/pdfExport';
import { formatToman, toPersianDigits } from './utils/numberUtils';

import { NationalDashboardView } from './components/NationalDashboardView';
import { DepartmentsView } from './components/DepartmentsView';
import { BudgetSourcesView } from './components/BudgetSourcesView';
import { PrioritiesView } from './components/PrioritiesView';
import { CrisesHarmsView } from './components/CrisesHarmsView';
import { ExecutorsView } from './components/ExecutorsView';
import { ContractorsView } from './components/ContractorsView';
import { ProjectsView } from './components/ProjectsView';
import { ChartsView } from './components/ChartsView';
import { LocationModule } from './components/LocationModule';
import { PopulationView } from './components/PopulationView';
import { CreateProjectView } from './components/CreateProjectView';
import { RolesAndAccessView } from './components/RolesAndAccessView';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { GlobalLocationSelector } from './components/GlobalLocationSelector';
import { LoginView } from './components/LoginView';

import {
  LayoutDashboard,
  Users,
  Building2,
  Wallet,
  Scale,
  Flame,
  Users2,
  HardHat,
  FolderKanban,
  FolderPlus,
  BarChart3,
  MapPin,
  ShieldCheck,
  Sparkles,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Menu,
  X,
  ShieldAlert,
  HelpCircle,
  Bell,
  LogOut,
} from 'lucide-react';

function AppContent() {
  const {
    locations,
    selectedLocation,
    orgConfig,
    priorities,
    currentPercentages,
    recommendations,
    projects,
    departments,
    budgetSources,
    crisesHarms,
    executors,
    contractors,
    auditLogs,
    currentUser,
    users,
    setCurrentUser,
    isAuthenticated,
    logout,
    activeTab,
    setActiveTab,
    handleSelectLocation,
    handleUpdateIndicators,
    antiDuplicationAlerts,
    optimizationMetrics,
    addAuditLog,
  } = useAppContext();

  const [showAiModal, setShowAiModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showLocationDrawer, setShowLocationDrawer] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const mainWorkspaceRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Synchronize Recharts dimensions seamlessly when switching to CHARTS tab
  useEffect(() => {
    if (activeTab === 'CHARTS') {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Reset workspace scroll to top on every tab change
  useEffect(() => {
    mainWorkspaceRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  // Exports
  const handleExportPdf = () => {
    triggerPrintPdf(orgConfig, priorities, currentPercentages, selectedLocation.indicators, recommendations.summaryRationale);
    addAuditLog('PERCENTAGE_CHANGE', 'گزارش رسمی PDF', '-', 'چاپ PDF', 'دریافت خروجی گزارش جامع سامانه ملی');
  };

  const handleExportExcel = () => {
    exportToCsv(orgConfig, priorities, currentPercentages, orgConfig.totalBudget);
    addAuditLog('PERCENTAGE_CHANGE', 'خروجی اکسل/CSV', '-', 'دانلود CSV', 'دریافت فایل تفصیلی داده‌های ملی');
  };

  // Navigation Items
  const navItems = [
    { id: 'DASHBOARD', label: 'داشبورد', icon: LayoutDashboard, count: null, color: 'text-indigo-400' },
    { id: 'POPULATION', label: 'جمعیت', icon: Users, count: '۳۱۵هزار', color: 'text-cyan-600' },
    { id: 'DEPARTMENTS', label: 'ادارات', icon: Building2, count: departments.length, color: 'text-blue-600' },
    { id: 'BUDGET_SOURCES', label: 'منابع بودجه', icon: Wallet, count: budgetSources.length, color: 'text-emerald-600' },
    { id: 'PRIORITIES', label: 'اولویت‌ها', icon: Scale, count: priorities.length, color: 'text-purple-600' },
    { id: 'CRISES_HARMS', label: 'بحران‌ها', icon: Flame, count: crisesHarms.length, color: 'text-rose-600' },
    { id: 'EXECUTORS', label: 'دستگاه‌های مجری', icon: Users2, count: executors.length, color: 'text-cyan-600' },
    { id: 'CONTRACTORS', label: 'پیمانکاران', icon: HardHat, count: contractors.length, color: 'text-amber-600' },
    { id: 'CREATE_PROJECT', label: 'ثبت پروژه', icon: FolderPlus, count: 'جدید', color: 'text-indigo-600' },
    { id: 'PROJECTS', label: 'پروژه‌ها', icon: FolderKanban, count: projects.length, color: 'text-blue-600', badgeAlert: antiDuplicationAlerts.length > 0 },
    { id: 'CHARTS', label: 'نمودارها', icon: BarChart3, count: null, color: 'text-indigo-600' },
    { id: 'LOCATIONS', label: 'شاخص‌های مکانی', icon: MapPin, count: null, color: 'text-emerald-600' },
    { id: 'ROLES_PERMISSIONS', label: 'نقش‌ها و دسترسی', icon: ShieldCheck, count: auditLogs.length, color: 'text-slate-600' },
  ];

  // Access gate — every hook above runs unconditionally, then signed-out users
  // see only the identity screen.
  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div id="app-root" className="flex h-screen w-full bg-[#f8fafc] text-slate-800 font-sans antialiased overflow-hidden dir-rtl">
      {/* Sleek Right Navigation Sidebar (Light Theme) */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-72 bg-white text-slate-800 flex flex-col justify-between border-l border-slate-200 shadow-xl lg:shadow-none transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div id="app-sleek-right-navigation-sidebar" className="flex-1 flex flex-col min-h-0">
          {/* Brand Header */}
          <div id="app-brand-header" className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div id="app-brand-header-2" className="flex items-center gap-3">
              <div id="app-brand-header-3" className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20">
                ملی
              </div>
              <div id="app-brand-header-4">
                <h1 className="font-black text-sm text-slate-900 tracking-tight">سامانه توسعه ملی</h1>
                <p className="text-[10px] text-slate-500">توسعه هوشمند روستایی و شهری</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Location & Anti-Overlap Alert Banner */}
          <div id="app-quick-location-anti-overlap" className="p-3 bg-slate-50 border-b border-slate-100 space-y-2 shrink-0">
            <button
              onClick={() => setShowLocationDrawer(!showLocationDrawer)}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-white hover:bg-slate-50 text-xs border border-slate-200 hover:border-emerald-300 shadow-2xs transition-colors text-right group"
            >
              <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                <MapPin className="w-3.5 h-3.5" />
              </span>
              <span id="app-quick-location-anti-overlap-2" className="flex-1 min-w-0">
                <span className="block text-[9px] font-bold text-slate-400">موقعیت فعال سامانه</span>
                <span className="block text-[11px] font-bold text-slate-800 truncate">
                  {selectedLocation.province} — {selectedLocation.county}
                </span>
              </span>
              <span className="text-[10px] font-bold text-blue-700 px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded-md shrink-0">
                تغییر
              </span>
            </button>

            {antiDuplicationAlerts.length > 0 && (
              <button
                id="app-quick-location-anti-overlap-3"
                onClick={() => {
                  setActiveTab('PROJECTS');
                  setSidebarOpen(false);
                }}
                className="w-full p-2 rounded-xl bg-amber-50 border border-amber-200 hover:border-amber-300 text-amber-900 text-[11px] flex items-center justify-between transition-colors hover:bg-amber-100"
              >
                <span className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>هشدار موازی‌کاری</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="min-w-4.5 h-4.5 rounded-full bg-amber-500 text-white font-mono text-[9px] font-bold flex items-center justify-center px-1">
                    {antiDuplicationAlerts.length}
                  </span>
                  <span className="text-[10px] font-bold text-amber-800">مشاهده</span>
                </span>
              </button>
            )}
          </div>

          {/* Nav List */}
          <nav className="p-3 space-y-1 overflow-y-auto flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all text-right ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div id={`app-nav-list-${item.id}`} className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${isActive ? 'text-white' : item.color} shrink-0`} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Role */}
        <div id="app-sidebar-footer-user-role" className="p-4 border-t border-slate-100 bg-slate-50 text-xs shrink-0">
          <div id="app-sidebar-footer-user-role-2" className="flex items-center justify-between">
            <div id="app-sidebar-footer-user-role-3" className="flex items-center gap-2">
              <div id="app-sidebar-footer-user-role-4" className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div id="app-sidebar-footer-user-role-5" className="truncate">
                <div id="app-sidebar-footer-user-role-6" className="font-bold text-slate-800 text-xs truncate">{currentUser.name}</div>
                <div id="app-sidebar-footer-user-role-7" className="text-[10px] text-slate-500 truncate">{currentUser.roleFa}</div>
              </div>
            </div>
            <div id="app-sidebar-footer-user-role-8" className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setActiveTab('ROLES_PERMISSIONS');
                  setSidebarOpen(false);
                }}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline"
              >
                مدیریت
              </button>
              <button
                onClick={logout}
                title={`خروج ${currentUser.name} از سامانه`}
                className="flex items-center gap-1 text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline"
              >
                <LogOut className="w-3 h-3" />
                خروج
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div id="app-main-content-area" className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar.
            Deliberately no z-index: a z-index here makes the header a stacking
            context, which would trap the persona dropdown's z-50 inside it and
            let the sidebar (z-40) and the workspace paint over the open menu.
            The dropdown itself carries the z-50, so it wins over the sidebar. */}
        <header className="bg-white border-b border-slate-200 shadow-2xs h-16 px-4 md:px-6 flex items-center justify-between shrink-0">
          <div id="app-top-navbar" className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-slate-600 hover:text-slate-900 p-1 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div id="app-top-navbar-2">
              <h2 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <span>
                  {activeTab === 'DASHBOARD' && 'داشبورد'}
                  {activeTab === 'DEPARTMENTS' && 'دستگاه‌ها و ادارات متولی توسعه'}
                  {activeTab === 'BUDGET_SOURCES' && 'سرفصل‌های منابع بودجه (CSR، دولتی، دهیاری و خیریه)'}
                  {activeTab === 'PRIORITIES' && 'اولویت‌های توسعه و ضرایب وزنی تخصیص اعتبار'}
                  {activeTab === 'CRISES_HARMS' && 'بانک کانون‌های بحران، آسیب و نیازهای فوریتی'}
                  {activeTab === 'EXECUTORS' && 'نهادها و دستگاه‌های مجری طرح‌ها'}
                  {activeTab === 'CONTRACTORS' && 'پیمانکاران ذیصلاح و رتبه‌بندی فنی'}
                  {activeTab === 'PROJECTS' && 'رصد پروژه‌های عمرانی و تطبیق ضد موازی‌کاری'}
                  {activeTab === 'CHARTS' && 'نمودار حبابی (ارتباط شاخص محرومیت و تخصیص بودجه) و تحلیل زنده'}
                  {activeTab === 'LOCATIONS' && `شاخص‌های تفصیلی محرومیت (${selectedLocation.province} - ${selectedLocation.county})`}
                  {activeTab === 'ROLES_PERMISSIONS' && 'ماتریس دسترسی نقش‌ها، سطح اختیارات و تاریخچه نظارتی'}
                </span>
              </h2>
            </div>
          </div>

          {/* Actions & Persona */}
          <div id="app-actions-persona" className="flex items-center gap-2 md:gap-3">
            {/* Persona Switcher Quick Pill */}
            <div id="app-persona-switcher-quick-pill" className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="hidden md:inline">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 font-normal">({currentUser.roleFa})</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showUserDropdown && (
                <div id="app-persona-switcher-quick-pill-2" className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-xs">
                  <div id="app-persona-switcher-quick-pill-3" className="border-b border-slate-100 pb-2 mb-2">
                    <span className="text-[10px] text-slate-500 block">تغییر کاربر و نقش سیستمی (شبیه‌سازی دسترسی):</span>
                  </div>
                  <div id="app-persona-switcher-quick-pill-4" className="space-y-1">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setCurrentUser(u);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-right p-2 rounded-xl transition-colors flex flex-col ${
                          currentUser.id === u.id
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="text-xs">{u.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {u.roleFa} — {u.organization}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div id="app-persona-switcher-quick-pill-5" className="border-t border-slate-100 mt-2 pt-2">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        logout();
                      }}
                      className="w-full text-right p-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      خروج از حساب
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Global Location Selector Modal — opened from the sidebar location button */}
        {showLocationDrawer && (
          <GlobalLocationSelector
            locations={locations}
            selectedLocation={selectedLocation}
            onSelectLocation={handleSelectLocation}
            onClose={() => setShowLocationDrawer(false)}
            vulnerabilityIndex={selectedLocation.indicators.overallVulnerabilityScore || 45}
          />
        )}

        {/* Scrollable Main Workspace */}
        <div id="app-scrollable-main-workspace" ref={mainWorkspaceRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {activeTab === 'DASHBOARD' && <NationalDashboardView />}

          {activeTab === 'POPULATION' && <PopulationView />}

          {activeTab === 'DEPARTMENTS' && <DepartmentsView />}

          {activeTab === 'BUDGET_SOURCES' && <BudgetSourcesView />}

          {activeTab === 'PRIORITIES' && <PrioritiesView />}

          {activeTab === 'CRISES_HARMS' && <CrisesHarmsView />}

          {activeTab === 'EXECUTORS' && <ExecutorsView />}

          {activeTab === 'CONTRACTORS' && <ContractorsView />}

          {activeTab === 'CREATE_PROJECT' && <CreateProjectView />}

          {activeTab === 'PROJECTS' && <ProjectsView />}

          {/* Charts View: Kept mounted in DOM with display style so Bubble Chart animation & state survive seamlessly */}
          <div id="app-charts-view-kept-mounted-in-dom" style={{ display: activeTab === 'CHARTS' ? 'block' : 'none' }}>
            <ChartsView />
          </div>

          {activeTab === 'LOCATIONS' && (
            <LocationModule
              locations={locations}
              selectedLocation={selectedLocation}
              onSelectLocation={handleSelectLocation}
              onUpdateIndicators={handleUpdateIndicators}
            />
          )}

          {activeTab === 'ROLES_PERMISSIONS' && <RolesAndAccessView />}
        </div>
      </div>

      {/* AI Analysis Modal */}
      {showAiModal && (
        <AiAnalysisModal
          orgConfig={orgConfig}
          indicators={selectedLocation.indicators}
          priorities={priorities}
          currentPercentages={currentPercentages}
          onClose={() => setShowAiModal(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
