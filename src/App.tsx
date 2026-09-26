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
  ChevronDown,
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
 * Sidebar hues — one per section, the colours this nav used before the flat
 * slate/blue restyle, brought back without returning to a solid fill.
 *
 * At rest every row shows its own hue on the icon, so the sections stay
 * distinguishable at a glance; when a row is active the same hue drives its
 * outline, accent bar and label. That way colour *and* shape mark the active
 * section, and no row is ever painted as a filled block. Hovering previews the
 * stroke, so the hue outline is what a row wears the moment it is pointed at.
 */
const NAV_TONES = {
  indigo: { icon: 'text-indigo-500', outline: 'border-indigo-200', hoverOutline: 'hover:border-indigo-200', bar: 'bg-indigo-500', label: 'text-indigo-700' },
  blue: { icon: 'text-blue-600', outline: 'border-blue-200', hoverOutline: 'hover:border-blue-200', bar: 'bg-blue-500', label: 'text-blue-700' },
  cyan: { icon: 'text-cyan-600', outline: 'border-cyan-200', hoverOutline: 'hover:border-cyan-200', bar: 'bg-cyan-500', label: 'text-cyan-700' },
  emerald: { icon: 'text-emerald-600', outline: 'border-emerald-200', hoverOutline: 'hover:border-emerald-200', bar: 'bg-emerald-500', label: 'text-emerald-700' },
  purple: { icon: 'text-purple-600', outline: 'border-purple-200', hoverOutline: 'hover:border-purple-200', bar: 'bg-purple-500', label: 'text-purple-700' },
  rose: { icon: 'text-rose-600', outline: 'border-rose-200', hoverOutline: 'hover:border-rose-200', bar: 'bg-rose-500', label: 'text-rose-700' },
  amber: { icon: 'text-amber-600', outline: 'border-amber-200', hoverOutline: 'hover:border-amber-200', bar: 'bg-amber-500', label: 'text-amber-700' },
  slate: { icon: 'text-slate-500', outline: 'border-slate-300', hoverOutline: 'hover:border-slate-300', bar: 'bg-slate-500', label: 'text-slate-700' },
} as const;

type NavTone = keyof typeof NAV_TONES;

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  count: number | string | null;
  tone: NavTone;
  badgeAlert?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  /** Leading glyph of the category button — a row-style icon, not a chevron. */
  icon: LucideIcon;
  items: NavItem[];
};

/**
 * The dashboard is the landing view rather than one of the workflow tools, so it
 * is rendered on its own above the categories instead of inside one of them.
 */
const DASHBOARD_ITEM: NavItem = {
  id: 'DASHBOARD',
  label: 'داشبورد',
  icon: LayoutDashboard,
  count: null,
  tone: 'indigo',
};

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

  // Collapsible nav categories. Only the cluster holding the current section is
  // open by default; anything the user expands is remembered for this session.
  const [openNavGroups, setOpenNavGroups] = useState<Record<string, boolean>>({});
  // Hovering a category previews its sections: `hovered` opens the cluster and
  // closing the pointer folds it back, unless the user pinned it by clicking.
  const [hoveredNavGroup, setHoveredNavGroup] = useState<string | null>(null);
  // A cluster the user just clicked shut stays shut while the pointer is still
  // inside it, so the hover that opened it cannot immediately undo the click.
  const [collapsedNavGroup, setCollapsedNavGroup] = useState<string | null>(null);

  const hoverNavGroup = (id: string) => {
    if (collapsedNavGroup === id) return;
    setHoveredNavGroup(id);
  };

  const unhoverNavGroup = (id: string) => {
    setHoveredNavGroup((current) => (current === id ? null : current));
    setCollapsedNavGroup((current) => (current === id ? null : current));
  };

  const toggleNavGroup = (id: string, pinned: boolean) => {
    setOpenNavGroups((prev) => ({ ...prev, [id]: !pinned }));
    setCollapsedNavGroup(pinned ? id : null);
  };

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

  // Navigation groups — the sidebar is organised by the stage of the planning
  // workflow instead of one flat list, so related sections sit together and
  // each cluster carries its own heading.
  const navGroups: NavGroup[] = [
    {
      id: 'OVERVIEW',
      icon: Database,
      label: 'پایش و داده‌های پایه',
      items: [
        { id: 'POPULATION', label: 'جمعیت', icon: Users, count: '۳۱۵هزار', tone: 'cyan' },
        { id: 'LOCATIONS', label: 'شاخص‌های مکانی', icon: MapPin, count: null, tone: 'emerald' },
      ],
    },
    {
      id: 'STAKEHOLDERS',
      icon: Network,
      label: 'سازمان‌ها و مجریان',
      items: [
        { id: 'DEPARTMENTS', label: 'ادارات', icon: Building2, count: departments.length, tone: 'blue' },
        { id: 'EXECUTORS', label: 'دستگاه‌های مجری', icon: Users2, count: executors.length, tone: 'cyan' },
        { id: 'CONTRACTORS', label: 'پیمانکاران', icon: HardHat, count: contractors.length, tone: 'amber' },
      ],
    },
    {
      id: 'RESOURCES',
      icon: Layers,
      label: 'منابع و اولویت‌ها',
      items: [
        { id: 'BUDGET_SOURCES', label: 'منابع بودجه', icon: Wallet, count: budgetSources.length, tone: 'emerald' },
        { id: 'PRIORITIES', label: 'اولویت‌ها', icon: Scale, count: priorities.length, tone: 'purple' },
        { id: 'CRISES_HARMS', label: 'بحران‌ها', icon: Flame, count: crisesHarms.length, tone: 'rose' },
      ],
    },
    {
      id: 'PROJECT_LIFECYCLE',
      icon: Workflow,
      label: 'چرخه پروژه',
      items: [
        { id: 'CREATE_PROJECT', label: 'ثبت پروژه', icon: FolderPlus, count: 'جدید', tone: 'indigo' },
        { id: 'PROJECTS', label: 'پروژه‌ها', icon: FolderKanban, count: projects.length, tone: 'blue', badgeAlert: antiDuplicationAlerts.length > 0 },
      ],
    },
    {
      id: 'GOVERNANCE',
      icon: Gauge,
      label: 'تحلیل و حاکمیت',
      items: [
        { id: 'CHARTS', label: 'نمودارها', icon: BarChart3, count: null, tone: 'indigo' },
        { id: 'ROLES_PERMISSIONS', label: 'نقش‌ها و دسترسی', icon: ShieldCheck, count: auditLogs.length, tone: 'slate' },
      ],
    },
  ];

  // Selecting a section — from a nav row, the sidebar footer or a dashboard link —
  // reveals the cluster it lives in and folds every other one, so a selection
  // always leaves exactly one cluster open. The dashboard lives outside the
  // categories, so landing on it folds them all.
  useEffect(() => {
    const owner = navGroups.find((g) => g.items.some((item) => item.id === activeTab));
    setOpenNavGroups(() => {
      const next: Record<string, boolean> = {};
      for (const group of navGroups) next[group.id] = group.id === owner?.id;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // One nav row. The standalone dashboard entry and every row inside a category
  // share this markup, so the outlined-pill + accent-bar treatment is identical.
  const renderNavRow = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const tone = NAV_TONES[item.tone];

    return (
      <button
        key={item.id}
        type="button"
        aria-current={isActive ? 'page' : undefined}
        onClick={() => {
          setActiveTab(item.id as any);
          setSidebarOpen(false);
        }}
        className={`relative w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border font-bold transition-colors text-right ${
          isActive
            ? `${tone.outline} ${tone.label}`
            : `border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 ${tone.hoverOutline}`
        }`}
      >
        {/* Distinct shape, never a fill: the active row is outlined and carries a
            rounded accent bar on the leading edge — outline, bar and label all
            borrow the row's own hue. */}
        {isActive && (
          <span
            aria-hidden="true"
            className={`absolute inset-y-2 start-1 w-1 rounded-full ${tone.bar}`}
          />
        )}
        <Icon className={`w-5 h-5 shrink-0 ${tone.icon}`} />
        <span id={`app-nav-list-${item.id}`} className="flex-1 min-w-0 truncate text-sm">
          {item.label}
        </span>
      </button>
    );
  };

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

          {/* Nav List — grouped by workflow stage. No `tracking-*` on the
              category buttons: letter-spacing breaks the joining of Persian script. */}
          <nav className="scrollbar-none p-3 space-y-2 overflow-y-auto min-h-0 max-lg:flex-1">
            {/* Dashboard is pinned above the categories; the rule under it keeps
                it reading as its own entry rather than the first category. */}
            {renderNavRow(DASHBOARD_ITEM)}

            <div className="h-px bg-slate-100 mx-1" aria-hidden="true" />

            {navGroups.map((group) => {
              const activeItem = group.items.find((item) => item.id === activeTab);
              const hasActiveItem = Boolean(activeItem);
              const pinned = openNavGroups[group.id] ?? hasActiveItem;
              const isOpen =
                pinned || (hoveredNavGroup === group.id && collapsedNavGroup !== group.id);
              const activeTone = activeItem ? NAV_TONES[activeItem.tone] : null;
              const GroupIcon = group.icon;

              return (
                <div
                  key={group.id}
                  role="group"
                  aria-labelledby={`app-nav-group-${group.id}`}
                  className="space-y-1"
                  onMouseEnter={() => hoverNavGroup(group.id)}
                  onMouseLeave={() => unhoverNavGroup(group.id)}
                >
                  {/* The category is itself a button wearing the same clothes as
                      the rows it holds: identical box, type, hover and active
                      treatment, led by the category's own icon — which takes the
                      hue of the section inside when this cluster holds the current
                      one. The trailing arrow is the fold affordance, pointing down
                      while the cluster is closed and up once it is open; hovering
                      the cluster opens it for as long as the pointer stays inside. */}
                  <button
                    id={`app-nav-group-${group.id}`}
                    type="button"
                    onClick={() => toggleNavGroup(group.id, pinned)}
                    aria-expanded={isOpen}
                    aria-controls={`app-nav-group-panel-${group.id}`}
                    className={`relative w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border font-bold transition-colors text-right ${
                      hasActiveItem && activeTone
                        ? `${activeTone.outline} ${activeTone.label}`
                        : isOpen
                          ? 'border-transparent bg-slate-50 text-slate-800 hover:border-slate-200'
                          : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <GroupIcon
                      aria-hidden="true"
                      className={`w-5 h-5 shrink-0 ${hasActiveItem && activeTone ? activeTone.icon : 'text-slate-400'}`}
                    />
                    <span className="flex-1 min-w-0 truncate text-sm">{group.label}</span>
                    <ChevronDown
                      aria-hidden="true"
                      className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {/* 0fr → 1fr animates the fold without measuring heights; the
                      inner wrapper carries the overflow so collapsed rows are
                      both invisible and out of the tab order. */}
                  <div
                    id={`app-nav-group-panel-${group.id}`}
                    className={`grid transition-all duration-200 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                    inert={!isOpen}
                  >
                    {/* Rows sit one step in from the start edge, so a category is
                        visibly offset forward of the sections it holds. */}
                    <div className="min-h-0 overflow-hidden space-y-1 ps-3">
                      {group.items.map(renderNavRow)}
                    </div>
                  </div>
                </div>
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
