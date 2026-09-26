import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ShellChromeContext } from './context/ShellContext';
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
  X,
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
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showLocationDrawer, setShowLocationDrawer] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Handed to each page's title block so the mobile nav toggle can live there.
  const shellChrome = useMemo(() => ({ openSidebar: () => setSidebarOpen(true) }), []);
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
      {/* Navigation Sidebar — floating white panel; the active row is an
          outlined pill with a start-edge accent (no solid fill). */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-72 p-3 bg-slate-100/70 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div
          id="app-sleek-right-navigation-sidebar"
          className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/60 overflow-hidden"
        >
          {/* Brand */}
          <div id="app-brand-header" className="px-5 py-4 flex items-center justify-between gap-3 shrink-0">
            <div id="app-brand-header-2" className="flex items-center gap-2.5 min-w-0">
              <div id="app-brand-header-3" className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                ملی
              </div>
              <div id="app-brand-header-4" className="min-w-0">
                <h1 className="font-black text-sm text-blue-700 tracking-tight truncate">سامانه توسعه ملی</h1>
                <p className="text-[10px] text-slate-400 truncate">توسعه هوشمند روستایی و شهری</p>
              </div>
            </div>
            <button
              id="app-sidebar-close-button"
              onClick={() => setSidebarOpen(false)}
              title="بستن منوی دسترسی"
              aria-label="بستن منوی دسترسی"
              className="lg:hidden shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95 active:border-blue-300 active:bg-blue-50 active:text-blue-700 active:shadow-none focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div id="app-sidebar-top-divider" className="h-px bg-slate-100 mx-5 shrink-0" />

          {/* Quick Location Switcher */}
          <div id="app-quick-location-anti-overlap" className="px-3 pt-3 shrink-0">
            <button
              onClick={() => setShowLocationDrawer(!showLocationDrawer)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 text-xs transition-colors text-right group"
            >
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                <MapPin className="w-4 h-4" />
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

          </div>

          {/* Nav List */}
          <nav className="scrollbar-none p-3 space-y-1 overflow-y-auto flex-1">
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
                  className={`relative w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border font-bold transition-colors text-right ${
                    isActive
                      ? 'border-blue-200 text-blue-700'
                      : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {/* Distinct shape, never a fill: the active row is outlined and
                      carries a rounded accent bar on the leading edge. */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-2 start-1 w-1 rounded-full bg-blue-600"
                    />
                  )}
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span id={`app-nav-list-${item.id}`} className="flex-1 min-w-0 truncate text-sm">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Account & sign-out — divided from the nav and tinted red, per the reference. */}
          <div id="app-sidebar-footer-user-role" className="shrink-0">
            <div id="app-sidebar-footer-divider" className="h-px bg-slate-100 mx-5" />

            <div className="p-3 space-y-1">
              <button
                id="app-sidebar-footer-user-role-2"
                onClick={() => {
                  setActiveTab('ROLES_PERMISSIONS');
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-right"
              >
                <span id="app-sidebar-footer-user-role-4" className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0">
                  {currentUser.name.charAt(0)}
                </span>
                <span id="app-sidebar-footer-user-role-5" className="min-w-0 flex-1">
                  <span id="app-sidebar-footer-user-role-6" className="block font-bold text-slate-800 text-xs truncate">{currentUser.name}</span>
                  <span id="app-sidebar-footer-user-role-7" className="block text-[10px] text-slate-400 truncate">{currentUser.roleFa}</span>
                </span>
              </button>

              <button
                id="app-sidebar-footer-user-role-8"
                onClick={logout}
                title={`خروج ${currentUser.name} از سامانه`}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-sm transition-colors text-right"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span>خروج</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area.
          No workspace header: each page renders its own title block at the top
          of its content (see `PageHeader`). */}
      <div id="app-main-content-area" className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Global Location Selector Modal — opened from the sidebar location button */}
        {showLocationDrawer && (
          <GlobalLocationSelector
            locations={locations}
            selectedLocation={selectedLocation}
            onSelectLocation={handleSelectLocation}
            onClose={() => setShowLocationDrawer(false)}
          />
        )}

        {/* Scrollable Main Workspace */}
        <ShellChromeContext.Provider value={shellChrome}>
        <div id="app-scrollable-main-workspace" ref={mainWorkspaceRef} className="scrollbar-none flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
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
        </ShellChromeContext.Provider>
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
