import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { NumCountUpTriggerContext } from './components/Num';
import { LocationModule } from './components/LocationModule';
import { PopulationView } from './components/PopulationView';
import { CreateProjectView } from './components/CreateProjectView';
import { RolesAndAccessView } from './components/RolesAndAccessView';
import { AnalysisSourcesView } from './components/AnalysisSourcesView';
import { SettingsView } from './components/SettingsView';
import { QuotaView } from './components/QuotaView';
import BranchedMenu, { type BranchedMenuItem } from './components/BranchedMenu';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { GlobalLocationSelector } from './components/GlobalLocationSelector';
import { LoginView } from './components/LoginView';
import { SystemTour } from './components/SystemTour';
import {
  hasSeenSystemTour,
  hasSeenRelaunchHint,
  markRelaunchHintShown,
  markSystemTourSeen,
} from './utils/systemTour';

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
  FileSearch,
  X,
  Database,
  Gauge,
  Layers,
  Network,
  Workflow,
  HelpCircle,
  Settings,
  Bell,
  LogOut,
  Menu,
  ChevronDown,
  ChevronLeft,
  Percent,
} from 'lucide-react';/**
 * Row icons keep the hue they wore before the branched menu took over the rail.
 * The hue is handed to the menu as a token rather than baked onto the glyph, so
 * a row's icon, its label while it is the active row and its accent branch all
 * read from one colour. Tailwind v4 publishes its palette as `--color-*` custom
 * properties, so these tokens stay in step with the utility classes used
 * elsewhere in the app.
 */


/**
 * The sidebar's navigation tree, rendered by BranchedMenu. Sections fold open onto
 * their rows; every value is one of the app's own tab ids, so a selection here is
 * exactly what `setActiveTab` expects. The dashboard is a leaf rather than a
 * section: it is a destination, not a group of tools.
 */
const NAV_MENU_ITEMS: BranchedMenuItem[] = [
  { value: 'DASHBOARD', label: 'داشبورد', icon: LayoutDashboard, hue: 'var(--color-indigo-500)' },
  {
    label: 'پایش و داده‌های پایه',
    icon: Database,
    hue: 'var(--color-cyan-700)',
    children: [
      { value: 'POPULATION', label: 'جمعیت', icon: Users, hue: 'var(--color-cyan-600)' },
      { value: 'LOCATIONS', label: 'شاخص‌های مکانی', icon: MapPin, hue: 'var(--color-emerald-600)' },
    ],
  },
  {
    label: 'سازمان‌ها و مجریان',
    icon: Network,
    hue: 'var(--color-blue-700)',
    children: [
      { value: 'DEPARTMENTS', label: 'ادارات', icon: Building2, hue: 'var(--color-blue-600)' },
      { value: 'EXECUTORS', label: 'دستگاه‌های مجری', icon: Users2, hue: 'var(--color-cyan-600)' },
      { value: 'CONTRACTORS', label: 'پیمانکاران', icon: HardHat, hue: 'var(--color-amber-600)' },
    ],
  },
  {
    label: 'منابع و اولویت‌ها',
    icon: Layers,
    hue: 'var(--color-emerald-700)',
    children: [
      { value: 'BUDGET_SOURCES', label: 'منابع بودجه', icon: Wallet, hue: 'var(--color-emerald-600)' },
      { value: 'QUOTA', label: 'سهمیه', icon: Percent, hue: 'var(--color-emerald-700)' },
      { value: 'PRIORITIES', label: 'اولویت‌ها', icon: Scale, hue: 'var(--color-purple-600)' },
      { value: 'CRISES_HARMS', label: 'بحران‌ها', icon: Flame, hue: 'var(--color-rose-600)' },
    ],
  },
  {
    label: 'چرخه پروژه',
    icon: Workflow,
    hue: 'var(--color-amber-700)',
    children: [
      { value: 'CREATE_PROJECT', label: 'ثبت پروژه', icon: FolderPlus, hue: 'var(--color-indigo-500)' },
      { value: 'PROJECTS', label: 'پروژه‌ها', icon: FolderKanban, hue: 'var(--color-blue-600)' },
    ],
  },
  {
    label: 'تحلیل و حاکمیت',
    icon: Gauge,
    hue: 'var(--color-violet-700)',
    children: [
      { value: 'ANALYSIS_SOURCES', label: 'منابع تحلیل', icon: FileSearch, hue: 'var(--color-violet-600)' },
      { value: 'CHARTS', label: 'نمودارها', icon: BarChart3, hue: 'var(--color-indigo-500)' },
    ],
  },
  {
    label: 'تنظیمات',
    icon: Settings,
    hue: 'var(--color-slate-600)',
    children: [
      /* «عمومی» is the settings page proper; the governance view lives here too. */
      { value: 'SETTINGS', label: 'عمومی', icon: Settings, hue: 'var(--color-slate-600)' },
      { value: 'ROLES_PERMISSIONS', label: 'نقش‌ها و دسترسی‌ها', icon: ShieldCheck, hue: 'var(--color-slate-500)' },
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
    handleUpdateLocation,
    optimizationMetrics,
    addAuditLog,
    canAccessTab,
  } = useAppContext();

  // The nav tree is the app's access map: only the sections this role's
  // effective permissions open are listed, and a category left without rows
  // disappears entirely. Per-user overrides are already folded into
  // `canAccessTab`, so a revoked flag removes its entry here too.
  const navMenuItems = useMemo(
    () =>
      NAV_MENU_ITEMS.filter((item) => !item.value || canAccessTab(item.value))
        .map((item) =>
          item.children
            ? { ...item, children: item.children.filter((child) => child.value && canAccessTab(child.value)) }
            : item
        )
        .filter((item) => !item.children || item.children.length > 0),
    [canAccessTab]
  );
  // The identity chip only navigates into governance for roles that may open it.
  const canCreateProject = canAccessTab('CREATE_PROJECT');
  const canOpenRolesPage = canAccessTab('ROLES_PERMISSIONS');

  const [showAiModal, setShowAiModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showLocationDrawer, setShowLocationDrawer] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSystemTour, setShowSystemTour] = useState(false);
  const [showTourHint, setShowTourHint] = useState(false);
  // Tells the automatic first-run launch apart from a manual reopening: only the
  // former earns the "you can relaunch this" hint when it is cut short.
  const tourAutoLaunchedRef = useRef(false);

  // Nav state is owned here rather than inside BranchedMenu, so a selection made
  // anywhere else in the app — a dashboard link, the sidebar footer — keeps the
  // menu in step. Sections are addressed by index, which is the menu's own unit.
  const activeMenuSection = navMenuItems.findIndex((item) =>
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

  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const mainWorkspaceRef = useRef<HTMLDivElement>(null);
  const identityBarRef = useRef<HTMLDivElement>(null);

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

  // Publish the identity bar's height so the sidebar can clear it — plus the
  // gap the workspace leaves below it — before the title block, letting the
  // panel's top land on the page's banner. Measured rather than guessed: the
  // bar reflows (name/role hide, controls wrap) as the viewport narrows.
  useEffect(() => {
    const el = identityBarRef.current;
    if (!el) return;
    const publish = () => {
      const { height } = el.getBoundingClientRect();
      document.documentElement.style.setProperty('--app-identity-bar-space', `${height}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
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

  // The charts panel is kept mounted (its bubble chart's animation and state
  // must survive tab switches), so its figures never see a fresh mount and
  // would never play their count-up entrance. This epoch — bumped on every
  // transition into the tab, never on boot — replays the entrance for them
  // via `NumCountUpTriggerContext` (reset to 0, ease in again).
  const [chartsCountUpEpoch, setChartsCountUpEpoch] = useState(0);
  const prevActiveTabRef = useRef(activeTab);
  useEffect(() => {
    const prev = prevActiveTabRef.current;
    prevActiveTabRef.current = activeTab;
    if (activeTab === 'CHARTS' && prev !== 'CHARTS') {
      setChartsCountUpEpoch((epoch) => epoch + 1);
    }
  }, [activeTab]);

  // Reset workspace scroll to top on every tab change
  useEffect(() => {
    mainWorkspaceRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  // First-run tour: a session that has never seen the walkthrough gets it once
  // after signing in, with no action of its own. Leaving it — finished or not —
  // records that it was seen, so it never auto-launches again; the identity-bar
  // button remains the way back in at any time.
  useEffect(() => {
    if (!isAuthenticated || hasSeenSystemTour()) return;
    const timer = setTimeout(() => {
      tourAutoLaunchedRef.current = true;
      setShowSystemTour(true);
    }, 700);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Opening the walkthrough from the identity-bar button. The hint has done its
  // job the moment the operator follows it back to that button.
  const handleOpenSystemTour = () => {
    setShowTourHint(false);
    tourAutoLaunchedRef.current = false;
    setShowSystemTour(true);
  };

  // Leaving the tour. Only an automatic first run that was cut short earns the
  // one-time hint pointing back at the button — an operator who reopened the
  // tour by hand already knows the button is there.
  const handleSystemTourClose = (finished: boolean) => {
    setShowSystemTour(false);
    markSystemTourSeen();
    const wasAutoLaunch = tourAutoLaunchedRef.current;
    tourAutoLaunchedRef.current = false;
    if (wasAutoLaunch && !finished && !hasSeenRelaunchHint()) {
      markRelaunchHintShown();
      setShowTourHint(true);
    }
  };

  // The hint is a nudge, not a panel: it retires itself after a short while.
  useEffect(() => {
    if (!showTourHint) return;
    const timer = setTimeout(() => setShowTourHint(false), 20000);
    return () => clearTimeout(timer);
  }, [showTourHint]);

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
          active row is an outlined pill with a start-edge accent (no fill).
          From `lg` up its top lines up with the page's banner: it reserves the
          workspace's own top padding, the identity bar above the page, the gap
          below that bar, and the title block (plus the margin `PageHeader`
          publishes), so the panel starts level with the banner rather than
          floating above the title. */}
      {/* Mobile drawer scrim — tapping outside the panel closes it, and the
          scrim is itself a keyboard-reachable close control. Hidden from `lg`
          up, where the sidebar is a static column. */}
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="بستن منوی دسترسی"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden cursor-default"
        />
      ) : null}

      <aside
        aria-label="ناوبری اصلی سامانه"
        className={`fixed inset-y-0 right-0 z-40 w-72 p-3 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 lg:pt-[calc(3rem+var(--app-identity-bar-space)+var(--app-page-header-space))] ${
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
                <p className="text-xs text-slate-500 truncate">توسعه هوشمند روستایی و شهری</p>
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

          {/* The quick location switcher that used to sit here has moved into the
              identity bar at the top of the workspace: the nav rail is now brand →
              nav → sign-out, and the active scope is stated once — in the session
              strip every page shares — instead of twice on the same screen. */}

          {/* Navigation — the branched menu owns the fold, the accent line and the
              selection marker; the app owns which sections are open
              (openMenuSections) and which row is current (activeTab), so a
              selection made anywhere else keeps the menu in step. */}
          <div className="scrollbar-none py-2 overflow-y-auto min-h-0 max-lg:flex-1">
            <BranchedMenu
              items={navMenuItems}
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

          {/* Sign-out only — the account chip it used to sit beside now rides at
              the top of the scrollable workspace, so the footer keeps the divider
              and the red sign-out row. */}
          <div id="app-sidebar-footer-user-role" className="shrink-0">
            <div id="app-sidebar-footer-divider" className="h-px bg-slate-100 mx-5" />

            <div className="p-3">
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
          No workspace header of its own: each page renders its own title block at
          the top of its content (see `PageHeader`), and the account chip rides in
          the page itself — see the identity bar at the top of the workspace. */}
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

        {/* Scrollable Main Workspace — the identity bar is its first row, so the
            account chip and, below `lg`, the mobile nav toggle ride in the page
            itself. */}
        <div id="app-scrollable-main-workspace" ref={mainWorkspaceRef} className="scrollbar-none flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Identity bar — the session strip that states the two facets of the
              active session: WHO the operator is signed in as and WHERE they are
              working (the geographic scope every page is filtered to). Both pills
              sit together at the start of the row, and the system guide is pushed
              to the far end. Below `lg` the mobile nav toggle shares the row, so
              the hamburger sits level with the identity block instead of on a row
              of its own under the page title.

              The row is the first block of the page it governs and scrolls away
              with the rest of the content, in normal flow: nothing above the
              workspace reserves room for it and nothing sits over the workspace.
              Only identity moved out of the sidebar; sign-out stayed behind in the
              sidebar footer. */}
          <div id="app-workspace-identity-bar" ref={identityBarRef} className="flex items-center gap-2 sm:gap-3">
            {/* Mobile nav toggle — the bordered square the page titles used to
                carry. Hidden from `lg` up, where the sidebar is a static column. */}
            <button
              id="app-sidebar-open-button"
              type="button"
              onClick={() => setSidebarOpen(true)}
              title="باز کردن منوی دسترسی"
              aria-label="باز کردن منوی دسترسی"
              className="lg:hidden shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95 active:border-blue-300 active:bg-blue-50 active:text-blue-700 active:shadow-none focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Who — the signed-in identity, leading the session cluster at the
                start of the row (the right edge, in this RTL shell). It and the
                scope pill beside it travel together, so the two facts every page
                is governed by — who is working and where — read as one block. On
                phones it drops to the avatar and the name. Choosing it opens the
                roles & access page, where the identity and its permissions are
                managed. */}
            <button
              id="app-workspace-identity-bar-user"
              onClick={() => {
                if (!canOpenRolesPage) return;
                setActiveTab('ROLES_PERMISSIONS');
                setSidebarOpen(false);
              }}
              aria-disabled={!canOpenRolesPage}
              title={
                canOpenRolesPage
                  ? `${currentUser.roleTitleFa} — مشاهده نقش‌ها و سطوح دسترسی`
                  : currentUser.roleTitleFa
              }
              className="group inline-flex min-w-0 max-w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white py-1.5 ps-1.5 pe-2.5 shadow-2xs transition-colors hover:border-blue-200 hover:bg-blue-50 focus:outline-none focus-visible:border-blue-400 text-right"
            >
              <span id="app-workspace-identity-bar-avatar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-black text-white shadow-sm shadow-blue-500/20">
                {currentUser.name.charAt(0)}
              </span>
              <span id="app-workspace-identity-bar-who" className="min-w-0 leading-tight">
                <span id="app-workspace-identity-bar-name" className="block truncate text-xs font-bold text-slate-800">{currentUser.name}</span>
                <span id="app-workspace-identity-bar-role" className="hidden truncate text-[10px] font-medium text-slate-500 sm:block">{currentUser.roleFa}</span>
              </span>
              <ChevronLeft className="hidden h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-blue-400 sm:block" aria-hidden="true" />
            </button>

            {/* Where — the geographic scope every page's data is filtered to, and
                the one control that changes it: choosing it opens the location
                picker, which the sidebar used to launch before the switcher moved
                up here. It sits with the account chip at the start of the row. It
                stays on phones too, where the sidebar is a drawer and the active
                county would otherwise be a tap away: the province/county line is
                the one that never hides. */}
            <button
              id="app-workspace-identity-bar-scope"
              type="button"
              onClick={() => setShowLocationDrawer(true)}
              title="مشاهده و تغییر محدوده جغرافیایی فعال"
              aria-haspopup="dialog"
              className="group inline-flex min-w-0 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white py-1.5 ps-1.5 pe-2.5 shadow-2xs transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 focus:outline-none focus-visible:border-emerald-400"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="min-w-0 max-w-[9rem] text-right leading-tight sm:max-w-[15rem]">
                <span className="hidden text-[10px] font-bold text-slate-400 md:block">محدوده فعال سامانه</span>
                <span className="block truncate text-xs font-bold text-slate-800">
                  {selectedLocation.province} — {selectedLocation.county}
                </span>
              </span>
              <span className="hidden shrink-0 items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 transition-colors group-hover:border-emerald-200 group-hover:bg-emerald-100 sm:inline-flex">
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
                تغییر
              </span>
            </button>

            {/* Guide — the entry point to the first-run walkthrough, pushed to the
                far end of the row by `ms-auto` so the session cluster keeps the
                start of the row to itself. The button reopens the tour on demand,
                and a session that has never seen it also launches it once on
                sign-in (see the effect in AppContent).

                The wrapper is the flex item (it carries `ms-auto`) and the
                positioning context for the one-time hint that appears when the
                walkthrough was left before the end. */}
            <div className="relative ms-auto shrink-0">
              <button
                id="app-workspace-identity-bar-guide"
                type="button"
                onClick={handleOpenSystemTour}
                title="راهنمای سامانه"
                aria-label="راهنمای سامانه"
                className="group inline-flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-slate-600 shadow-2xs transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:border-blue-400"
              >
                <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden truncate text-xs font-bold sm:inline">راهنمای سامانه</span>
              </button>

              {/* A quiet nudge towards the button while the hint below it is on
                  screen — the callout explains, this points. */}
              {showTourHint && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white"
                />
              )}

              {/* One-time relaunch hint. It only ever follows an automatic tour
                  that was cut short (see `handleSystemTourClose`), it is
                  recorded as seen the moment it appears, and it retires itself
                  after a short while so nothing lingers on the page. */}
              {showTourHint && (
                <div
                  id="app-workspace-identity-bar-guide-hint"
                  role="status"
                  className="tour-hint-in absolute end-0 top-full z-30 mt-2.5 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-blue-100 bg-white p-3 shadow-xl shadow-slate-900/10"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 end-3 h-2 w-2 rotate-45 rounded-[2px] border-t border-r border-blue-100 bg-white"
                  />
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-slate-600">
                      راهنما را نیمه‌کاره بستید. هر زمان خواستید، از همین دکمه می‌توانید{' '}
                      <span className="font-bold text-slate-800">راهنمای سامانه</span> را دوباره اجرا کنید.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowTourHint(false)}
                      aria-label="بستن این راهنمایی"
                      title="بستن"
                      className="-m-1 shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'DASHBOARD' && <NationalDashboardView />}

          {activeTab === 'POPULATION' && <PopulationView />}

          {activeTab === 'DEPARTMENTS' && <DepartmentsView />}

          {activeTab === 'BUDGET_SOURCES' && <BudgetSourcesView />}
          {activeTab === 'QUOTA' && <QuotaView />}

          {activeTab === 'PRIORITIES' && <PrioritiesView />}

          {activeTab === 'CRISES_HARMS' && <CrisesHarmsView />}

          {activeTab === 'EXECUTORS' && <ExecutorsView />}

          {activeTab === 'CONTRACTORS' && <ContractorsView />}

          {activeTab === 'CREATE_PROJECT' &&
            (canCreateProject ? (
              <CreateProjectView />
            ) : (
              <div
                id="app-create-project-access-denied"
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-10 text-center"
              >
                <ShieldCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h2 className="font-black text-sm text-slate-800 dark:text-slate-100">
                  دسترسی ثبت پروژه برای شما فعال نیست
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  این مجوز را مدیر سامانه می‌تواند از صفحه «نقش‌ها و دسترسی» برای کاربر شما فعال کند.
                </p>
              </div>
            ))}

          {activeTab === 'PROJECTS' && <ProjectsView />}

          {/* Charts View: Kept mounted in DOM with display style so Bubble Chart animation & state survive seamlessly */}
          <NumCountUpTriggerContext.Provider value={chartsCountUpEpoch}>
            <div id="app-charts-view-kept-mounted-in-dom" style={{ display: activeTab === 'CHARTS' ? 'block' : 'none' }}>
              <ChartsView />
            </div>
          </NumCountUpTriggerContext.Provider>

          {activeTab === 'LOCATIONS' && (
            <LocationModule
              locations={locations}
              selectedLocation={selectedLocation}
              onSelectLocation={handleSelectLocation}
              onUpdateIndicators={handleUpdateIndicators}
              onUpdateLocation={handleUpdateLocation}
            />
          )}

          {activeTab === 'ANALYSIS_SOURCES' && <AnalysisSourcesView />}

          {activeTab === 'ROLES_PERMISSIONS' && <RolesAndAccessView />}

          {activeTab === 'SETTINGS' && <SettingsView />}
        </div>
      </div>

      {/* Guided tour — the first-run walkthrough, relaunchable from the identity
          bar. It sits at the shell level so its spotlight can frame the session
          strip, the sidebar and any page's header without being clipped. */}
      <SystemTour open={showSystemTour} onClose={handleSystemTourClose} />

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
