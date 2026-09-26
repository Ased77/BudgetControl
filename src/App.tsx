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
import BranchedMenu, { type BranchedMenuItem } from './components/BranchedMenu';
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
  Database,
  Gauge,
  Layers,
  Network,
  Workflow,
  HelpCircle,
  Bell,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

/**
 * Row icons keep the hue they wore before the branched menu took over the rail.
 * An element is passed rather than a component so the glyph's own colour wins
 * over the menu's ink/accent colouring.
 */
const hued = (Icon: LucideIcon, hue: string) => <Icon size={18} strokeWidth={1.8} className={hue} />;

/**
 * The sidebar's navigation tree, rendered by BranchedMenu. Sections fold open onto
 * their rows; every value is one of the app's own tab ids, so a selection here is
 * exactly what `setActiveTab` expects. The dashboard is a leaf rather than a
 * section: it is a destination, not a group of tools.
 */
const NAV_MENU_ITEMS: BranchedMenuItem[] = [
  { value: 'DASHBOARD', label: 'داشبورد', icon: hued(LayoutDashboard, 'text-indigo-500') },
  {
    label: 'پایش و داده‌های پایه',
    icon: Database,
    children: [
      { value: 'POPULATION', label: 'جمعیت', icon: hued(Users, 'text-cyan-600') },
      { value: 'LOCATIONS', label: 'شاخص‌های مکانی', icon: hued(MapPin, 'text-emerald-600') },
    ],
  },
  {
    label: 'سازمان‌ها و مجریان',
    icon: Network,
    children: [
      { value: 'DEPARTMENTS', label: 'ادارات', icon: hued(Building2, 'text-blue-600') },
      { value: 'EXECUTORS', label: 'دستگاه‌های مجری', icon: hued(Users2, 'text-cyan-600') },
      { value: 'CONTRACTORS', label: 'پیمانکاران', icon: hued(HardHat, 'text-amber-600') },
    ],
  },
  {
    label: 'منابع و اولویت‌ها',
    icon: Layers,
    children: [
      { value: 'BUDGET_SOURCES', label: 'منابع بودجه', icon: hued(Wallet, 'text-emerald-600') },
      { value: 'PRIORITIES', label: 'اولویت‌ها', icon: hued(Scale, 'text-purple-600') },
      { value: 'CRISES_HARMS', label: 'بحران‌ها', icon: hued(Flame, 'text-rose-600') },
    ],
  },
  {
    label: 'چرخه پروژه',
    icon: Workflow,
    children: [
      { value: 'CREATE_PROJECT', label: 'ثبت پروژه', icon: hued(FolderPlus, 'text-indigo-500') },
      { value: 'PROJECTS', label: 'پروژه‌ها', icon: hued(FolderKanban, 'text-blue-600') },
    ],
  },
  {
    label: 'تحلیل و حاکمیت',
    icon: Gauge,
    children: [
      { value: 'CHARTS', label: 'نمودارها', icon: hued(BarChart3, 'text-indigo-500') },
      { value: 'ROLES_PERMISSIONS', label: 'نقش‌ها و دسترسی', icon: hued(ShieldCheck, 'text-slate-500') },
    ],
  },
];

function AppContent() {
  const {
    locations,
    selectedLocation,
    orgConfig,
    priorities,
    currentPercentages,
    recommendations,
    currentUser,
    isAuthenticated,
    logout,
    activeTab,
    setActiveTab,
    handleSelectLocation,
    handleUpdateIndicators,
    optimizationMetrics,
    addAuditLog,
  } = useAppContext();

  const [showAiModal, setShowAiModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showLocationDrawer, setShowLocationDrawer] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Nav state is owned here rather than inside BranchedMenu, so a selection made
  // anywhere else in the app — a dashboard link, the sidebar footer — keeps the
  // menu in step. Sections are addressed by index, which is the menu's own unit.
  const activeMenuSection = NAV_MENU_ITEMS.findIndex((item) =>
    item.children?.some((kid) => kid.value === activeTab)
  );
  const [openMenuSections, setOpenMenuSections] = useState<number[]>(() =>
    activeMenuSection >= 0 ? [activeMenuSection] : []
  );
  // Hovering a category previews its rows: the app still owns what is open, so a
  // preview is just that section added to the open list for as long as the
  // pointer is inside it. Leaving folds it back unless it was clicked open.
  const [hoveredMenuSection, setHoveredMenuSection] = useState<number | null>(null);
  // A section the user just clicked shut stays shut while the pointer is still
  // inside it, so the hover that opened it cannot immediately undo the click.
  const [collapsedMenuSection, setCollapsedMenuSection] = useState<number | null>(null);
  const openSectionsWithHover =
    hoveredMenuSection !== null && !openMenuSections.includes(hoveredMenuSection)
      ? [...openMenuSections, hoveredMenuSection]
      : openMenuSections;

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

  // Selecting a section — from the menu, the sidebar footer or a dashboard link —
  // reveals the section that holds it and folds every other one, so a selection
  // always leaves exactly one section open. Landing on the dashboard leaf, which
  // belongs to no section, folds them all.
  useEffect(() => {
    setOpenMenuSections(activeMenuSection >= 0 ? [activeMenuSection] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Access gate — every hook above runs unconditionally, then signed-out users
  // see only the identity screen.
  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div id="app-root" className="flex h-screen w-full bg-app-page text-slate-800 font-sans antialiased overflow-hidden dir-rtl">
      {/* Navigation Sidebar — floating white panel that hugs its own height
          (capped at the viewport) instead of stretching to the bottom; the
          active row is an outlined pill with a start-edge accent (no fill). */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-72 p-3 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div
          id="app-sleek-right-navigation-sidebar"
          className="flex flex-col min-h-0 max-h-full max-lg:flex-1 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/60 overflow-hidden"
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

          {/* Navigation — the branched menu owns the fold, the accent line and the
              selection marker; the app owns which sections are open
              (openMenuSections) and which row is current (activeTab), so a
              selection made anywhere else keeps the menu in step. */}
          <div className="scrollbar-none py-2 overflow-y-auto min-h-0 max-lg:flex-1">
            <BranchedMenu
              items={NAV_MENU_ITEMS}
              active={activeTab}
              open={openSectionsWithHover}
              onSelect={(value) => {
                setActiveTab(value);
                setSidebarOpen(false);
              }}
              onToggle={(index, isOpen) => {
                // One section at a time: opening a category folds the others.
                setOpenMenuSections(isOpen ? [index] : []);
                setCollapsedMenuSection(isOpen ? null : index);
              }}
              onSectionHover={(index, hovering) => {
                if (hovering) {
                  if (collapsedMenuSection === index) return;
                  setHoveredMenuSection(index);
                } else {
                  setHoveredMenuSection((current) => (current === index ? null : current));
                  setCollapsedMenuSection((current) => (current === index ? null : current));
                }
              }}
              color="#0f172a"
              accentColor="#2563eb"
              lineColor="#e2e8f0"
              width={252}
              rowHeight={44}
              fontSize={16}
              indent={46}
              trunk={16}
              radius={12}
              className="branched-menu--fill"
            />
          </div>

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
