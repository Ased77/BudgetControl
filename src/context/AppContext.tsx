import React, { createContext, useCallback, useContext, useState, useMemo, useEffect, useRef } from 'react';
import {
  LocationData,
  LocalIndicators,
  OrganizationConfig,
  CsrPriority,
  SmartRecommendationResult,
  AuditLogItem,
  ExecutiveProject,
  UserProfile,
  Department,
  BudgetSource,
  CrisisHarmItem,
  ProjectExecutor,
  Contractor,
  SystemRolePermission,
  UserPermissionField,
  UserPermissionOverride,
  AntiDuplicationAlert,
  AuditActionType,
  AdministrativeLevel,
  AnalysisSource,
  AnalysisSourceStatus,
} from '../types';
import {
  INITIAL_LOCATIONS,
  INITIAL_ORGANIZATION,
  INITIAL_PRIORITIES,
  INITIAL_PROJECTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_USERS,
  INITIAL_DEPARTMENTS,
  INITIAL_BUDGET_SOURCES,
  INITIAL_CRISES_AND_HARMS,
  INITIAL_EXECUTORS,
  INITIAL_CONTRACTORS,
  INITIAL_ROLES_PERMISSIONS,
  INITIAL_ANALYSIS_SOURCES,
} from '../data/initialData';
import { calculateSmartRecommendations } from '../utils/recommendationEngine';
import { formatMoney, formatNumber, roundPercentage, toPersianDigits } from '../utils/numberUtils';
import { analyzeProjectDuplicatesAndEfficiency, OptimizationMetrics } from '../utils/antiDuplicationEngine';
import { api, isApiError } from '../services/api';
import { useAuth } from './AuthContext';
import { canAccessSection, firstAccessibleSection } from '../utils/sectionAccess';

const TAB_STORAGE_KEY = 'csr.activeTab';
// Every navigable workspace tab. Used to validate the persisted tab so a
// stale/unknown stored value falls back to the dashboard instead of stranding
// the app on a blank page.
const VALID_TABS = [
  'DASHBOARD',
  'CULTURAL_TAXONOMY',
  'POPULATION',
  'DEPARTMENTS',
  'BUDGET_SOURCES',
  'QUOTA',
  'PRIORITIES',
  'CRISES_HARMS',
  'EXECUTORS',
  'CONTRACTORS',
  'CREATE_PROJECT',
  'PROJECTS',
  'CHARTS',
  'LOCATIONS',
  'ANALYSIS_SOURCES',
  'ROLES_PERMISSIONS',
  'SETTINGS',
  'USER_MINING',
];

/**
 * Identity is NO LONGER persisted client-side: the session lives in
 * httpOnly cookies owned by the server. These two helpers (the localStorage
 * identity cache of the old simulation) are removed — see AuthContext.
 */

/** Persisted active tab survives a refresh, so reloading any page stays on
 *  that page instead of redirecting home. */
function readPersistedTab(): string | null {
  try {
    const tab = window.localStorage.getItem(TAB_STORAGE_KEY);
    return VALID_TABS.includes(tab) ? tab : null;
  } catch {
    return null;
  }
}

function persistTab(tab: string) {
  try {
    if (VALID_TABS.includes(tab)) {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    }
  } catch {
    /* ignore — the tab still works for this session */
  }
}

/** Real paths (not hashes) for each tab, so a page can be bookmarked, shared and
 *  reloaded. Both servers fall back to index.html for unknown paths: Vite's dev
 *  middleware and the production build's `app.get('*')`. */
const TAB_PATHS: Record<string, string> = {
  DASHBOARD: '/dashboard',
  CULTURAL_TAXONOMY: '/cultural-taxonomy',
  POPULATION: '/population',
  DEPARTMENTS: '/departments',
  BUDGET_SOURCES: '/budget-sources',
  PRIORITIES: '/priorities',
  CRISES_HARMS: '/crises-harms',
  EXECUTORS: '/executors',
  CONTRACTORS: '/contractors',
  CREATE_PROJECT: '/create-project',
  PROJECTS: '/projects',
  CHARTS: '/charts',
  LOCATIONS: '/locations',
  ANALYSIS_SOURCES: '/analysis-sources',
  ROLES_PERMISSIONS: '/roles-permissions',
  SETTINGS: '/settings',
  USER_MINING: '/user-mining',
};

function pathForTab(tab: string): string {
  return TAB_PATHS[tab] ?? TAB_PATHS.DASHBOARD;
}

/** The inverse lookup, tolerant of a trailing slash and of any base path the app
 *  is served under (a reverse-proxy prefix leaves extra leading segments). */
function tabFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) return null;
  return VALID_TABS.find((tab) => TAB_PATHS[tab] === `/${last}`) ?? null;
}

interface AppContextType {
  // State
  locations: LocationData[];
  selectedLocation: LocationData;
  administrativeScope: AdministrativeLevel;
  orgConfig: OrganizationConfig;
  priorities: CsrPriority[];
  currentPercentages: Record<string, number>;
  lockedIds: Set<string>;
  recommendations: SmartRecommendationResult;
  auditLogs: AuditLogItem[];
  projects: ExecutiveProject[];
  departments: Department[];
  budgetSources: BudgetSource[];
  crisesHarms: CrisisHarmItem[];
  executors: ProjectExecutor[];
  contractors: Contractor[];
  analysisSources: AnalysisSource[];
  rolesPermissions: SystemRolePermission[];
  users: UserProfile[];
  currentUser: UserProfile;
  activeTab: string;

  // Verified-access gate: true only while the server session lives
  isAuthenticated: boolean;

  // Analysis & Engine
  antiDuplicationAlerts: AntiDuplicationAlert[];
  optimizationMetrics: OptimizationMetrics;

  // Actions
  setActiveTab: (tab: string) => void;
  /** Mobile+password login against /api/auth; resolves after the server-side
   *  session (httpOnly cookies) is established. */
  login: (mobile: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAdministrativeScope: (scope: AdministrativeLevel) => void;
  handleSelectLocation: (newLoc: LocationData) => void;
  handleUpdateIndicators: (newIndicators: LocalIndicators) => void;
  handleUpdateLocation: (updated: LocationData) => void;
  handlePercentageChange: (priorityId: string, value: number) => void;
  handleToggleLock: (priorityId: string) => void;
  handleApplySmartRecommendations: () => void;
  handleResetToDefault: () => void;
  handleAutoRebalance: () => void;
  handleAddPriority: (title: string, category: string, description: string, defaultPct: number) => void;
  handleUpdatePriority: (updated: CsrPriority) => void;
  handleDeletePriority: (priorityId: string) => void;
  handleImportPriorities: (imported: CsrPriority[]) => void;
  handleAddSubItem: (priorityId: string, subItemTitle: string) => void;
  handleDeleteSubItem: (priorityId: string, subItemIndex: number) => void;
  
  // Projects CRUD
  handleAddProject: (proj: Omit<ExecutiveProject, 'id' | 'costPerBeneficiaryToman' | 'antiOverlapStatus'>) => void;
  handleUpdateProject: (proj: ExecutiveProject) => void;
  handleDeleteProject: (projectId: string) => void;
  handleToggleProjectStatus: (projectId: string, newStatus: ExecutiveProject['status']) => void;

  // Departments CRUD
  handleAddDepartment: (dept: Omit<Department, 'id'>) => void;
  handleUpdateDepartment: (dept: Department) => void;
  handleDeleteDepartment: (departmentId: string) => void;

  // Budget Sources CRUD
  handleAddBudgetSource: (source: Omit<BudgetSource, 'id'>) => void;
  handleUpdateBudgetSource: (source: BudgetSource) => void;
  handleDeleteBudgetSource: (sourceId: string) => void;

  // Crises & Harms CRUD
  handleAddCrisisHarm: (item: Omit<CrisisHarmItem, 'id'>) => void;
  handleUpdateCrisisHarm: (item: CrisisHarmItem) => void;
  handleDeleteCrisisHarm: (crisisId: string) => void;

  // Executors CRUD
  handleAddExecutor: (executor: Omit<ProjectExecutor, 'id'>) => void;
  handleUpdateExecutor: (executor: ProjectExecutor) => void;
  handleDeleteExecutor: (executorId: string) => void;

  // Contractors CRUD
  handleAddContractor: (contractor: Omit<Contractor, 'id'>) => void;
  handleUpdateContractor: (contractor: Contractor) => void;
  handleDeleteContractor: (contractorId: string) => void;

  // Analysis Sources (analysis-engine inputs) CRUD + human-in-the-loop review
  handleAddAnalysisSource: (
    source: Omit<AnalysisSource, 'id' | 'status' | 'createdAt' | 'reviewedBy' | 'reviewNote'>
  ) => void;
  handleUpdateAnalysisSource: (source: AnalysisSource) => void;
  handleReviewAnalysisSource: (sourceId: string, status: AnalysisSourceStatus, note?: string) => void;
  handleDeleteAnalysisSource: (sourceId: string) => void;

  // Permissions
  getUserPermissions: (user: UserProfile) => SystemRolePermission | undefined;
  /** True when the signed-in role's effective permissions open this section. */
  canAccessTab: (tab: string) => boolean;
  handleToggleUserPermission: (userId: string, field: UserPermissionField) => void;

  handleSaveOrgConfig: (updated: OrganizationConfig) => void;
  /** The last write the server refused; the shell renders it as one toast. */
  writeError: WriteError | null;
  dismissWriteError: () => void;
  addAuditLog: (
    actionType: AuditActionType,
    targetPriorityTitle?: string,
    oldValue?: string,
    newValue?: string,
    rationale?: string,
    actingUser?: UserProfile
  ) => void;
}

export interface WriteError {
  /** Changes per failure so a repeated failure restarts the toast. */
  id: number;
  title: string;
  description: string;
}

/**
 * Why a write failed, in the user's language. The status is what matters: the
 * server never sends its internal text for a 5xx, so a raw message would only
 * ever be a stack-shaped string that means nothing to an operator.
 */
function describeWriteError(action: string, error: unknown): string {
  if (isApiError(error)) {
    switch (error.status) {
      case 400:
        return `${action}: داده‌های واردشده معتبر نیست.`;
      case 403:
        return `${action}: سطح دسترسی شما این تغییر را مجاز نمی‌داند.`;
      case 404:
        return `${action}: رکورد مورد نظر یافت نشد — صفحه را از نو بارگذاری کنید.`;
      case 409:
        return `${action}: این رکورد در جای دیگری استفاده شده و قابل تغییر نیست.`;
      case 429:
        return `${action}: تعداد درخواست‌ها بیش از حد مجاز است — کمی بعد دوباره تلاش کنید.`;
      default:
        return `${action}: سرور درخواست را نپذیرفت (${toPersianDigits(error.status)}).`;
    }
  }
  return `${action}: ارتباط با سرور برقرار نشد — اتصال شبکه را بررسی کنید.`;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State boots from the bundled seed data (instant first paint), then is
  // replaced by the PostgreSQL-backed API payload once the server responds.
  const [locations, setLocations] = useState<LocationData[]>(INITIAL_LOCATIONS);
  // The initial workspace is شهرستان امیدیه (first fully detailed county); the
  // global location picker can switch to any other registered county.
  const [selectedLocation, setSelectedLocation] = useState<LocationData>(
    () => INITIAL_LOCATIONS.find((l) => l.id === 'loc-06-omidiyeh-all') ?? INITIAL_LOCATIONS[0]
  );
  const [administrativeScope, setAdministrativeScope] = useState<AdministrativeLevel>('COUNTY');
  const [orgConfig, setOrgConfig] = useState<OrganizationConfig>(INITIAL_ORGANIZATION);
  const [priorities, setPriorities] = useState<CsrPriority[]>(INITIAL_PRIORITIES);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);

  // Comprehensive Entities State
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [budgetSources, setBudgetSources] = useState<BudgetSource[]>(INITIAL_BUDGET_SOURCES);
  const [crisesHarms, setCrisesHarms] = useState<CrisisHarmItem[]>(INITIAL_CRISES_AND_HARMS);
  const [executors, setExecutors] = useState<ProjectExecutor[]>(INITIAL_EXECUTORS);
  const [contractors, setContractors] = useState<Contractor[]>(INITIAL_CONTRACTORS);
  const [projects, setProjects] = useState<ExecutiveProject[]>(INITIAL_PROJECTS);
  const [analysisSources, setAnalysisSources] = useState<AnalysisSource[]>(INITIAL_ANALYSIS_SOURCES);
  const [rolesPermissions, setRolesPermissions] = useState<SystemRolePermission[]>(INITIAL_ROLES_PERMISSIONS);
  // Individual per-user permission overrides, keyed by user id. Only the
  // changed flags are stored; everything else inherits the role default.
  const [userPermissionOverrides, setUserPermissionOverrides] = useState<Record<string, UserPermissionOverride>>({});
  const [users, setUserDatabase] = useState<UserProfile[]>(INITIAL_USERS);
  // Verified identity — sourced ONLY from the AuthContext session (which
  // re-validates against the server on every mount and cannot be forged by
  // client storage). It replaces the old localStorage identity simulation.
  const auth = useAuth();
  const currentUser = useMemo<UserProfile>(() => auth.user ?? INITIAL_USERS[0], [auth.user]);
  const isAuthenticated = auth.status === 'authenticated';

  // --- Section access -------------------------------------------------------
  // The permissions matrix is enforced on the workspace itself: a role only
  // sees and opens the sections its effective permissions allow (the mapping
  // lives in utils/sectionAccess). Navigation, the rendered tab, deep links and
  // history entries all read this one gate, so none of them can drift.
  const getUserPermissions = useCallback(
    (user: UserProfile): SystemRolePermission | undefined => {
      const base = rolesPermissions.find((r) => r.role === user.role);
      if (!base) return undefined;
      const overrides = userPermissionOverrides[user.id];
      return overrides ? { ...base, ...overrides } : base;
    },
    [rolesPermissions, userPermissionOverrides]
  );
  const currentPermissions = useMemo(
    () => getUserPermissions(currentUser),
    [getUserPermissions, currentUser]
  );
  const canAccessTab = useCallback(
    (tab: string) => canAccessSection(tab, currentPermissions, currentUser.role),
    [currentPermissions, currentUser.role]
  );
  const fallbackTab = useMemo(
    () => firstAccessibleSection(currentPermissions, currentUser.role),
    [currentPermissions, currentUser.role]
  );

  // The active tab is mirrored into the URL, so the browser's back and forward
  // buttons walk the pages the user actually visited and every page is
  // addressable. Precedence on first load: deep link → last session → home.
  const [requestedTab, setRequestedTab] = useState<string>(() => {
    const fromUrl = tabFromPath(window.location.pathname);
    return fromUrl ?? readPersistedTab() ?? 'DASHBOARD';
  });
  // What is actually on screen: a request for a section this role may not open
  // resolves to the first page it can, so no view outside the matrix is ever
  // rendered. The redirect effect below then corrects the address bar.
  const activeTab = canAccessTab(requestedTab) ? requestedTab : fallbackTab;
  // Mirrors `activeTab` for the history helpers below: they are called from
  // handlers and listeners that must not re-push the page already on screen,
  // and they must agree with each other before React re-renders.
  const activeTabRef = useRef(activeTab);

  // Selecting a tab records a history entry, so the back and forward buttons walk
  // the pages the user actually visited. Re-selecting the page already on screen
  // records nothing, so a view that re-asserts its own tab on mount cannot leave a
  // duplicate entry behind.
  const setActiveTab = (tab: string) => {
    // A section this role may not open is not a destination: ignore the request
    // rather than render a page the permissions matrix forbids.
    if (!canAccessTab(tab)) return;
    const changed = tab !== activeTabRef.current;
    activeTabRef.current = tab;
    setRequestedTab(tab);
    persistTab(tab);
    // A tab with no page of its own has no URL to record; the state change is
    // still allowed, exactly as it was before the URL tracked the tab.
    if (!changed || !VALID_TABS.includes(tab)) return;
    window.history.pushState({ tab }, '', `${pathForTab(tab)}${window.location.search}`);
  };

  // Give the entry the app was opened on a page path of its own: the root URL (or
  // an unknown one) is rewritten to the resolved tab, while a deep link that
  // already names a page is left exactly as it was. Replacing rather than pushing
  // keeps the first back press leaving the app, instead of landing on the same
  // page twice.
  useEffect(() => {
    if (tabFromPath(window.location.pathname)) return;
    const tab = activeTabRef.current;
    window.history.replaceState({ tab }, '', `${pathForTab(tab)}${window.location.search}`);
  }, []);

  // Back and forward adopt the tab of the entry being shown. An entry carries
  // `state` when the app created it, and only a path when the URL was typed,
  // bookmarked or restored by the browser.
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const fromState = (event.state as { tab?: unknown } | null)?.tab;
      const tab =
        typeof fromState === 'string' && VALID_TABS.includes(fromState)
          ? fromState
          : tabFromPath(window.location.pathname);
      if (!tab) return;
      // A history entry can predate a role or permission change: an entry for a
      // section this session may not open is replaced, not shown.
      const nextTab = canAccessTab(tab) ? tab : fallbackTab;
      activeTabRef.current = nextTab;
      setRequestedTab(nextTab);
      persistTab(nextTab);
      if (nextTab !== tab) {
        window.history.replaceState(
          { tab: nextTab },
          '',
          `${pathForTab(nextTab)}${window.location.search}`
        );
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [canAccessTab, fallbackTab]);

  // A deep link, a bookmark or the last session's tab may name a section this
  // role may not open. `activeTab` already shows the first allowed page; this
  // corrects the address bar in place — replace, not push, because the denied
  // URL was never a page the operator visited.
  useEffect(() => {
    if (!isAuthenticated || canAccessTab(requestedTab)) return;
    activeTabRef.current = fallbackTab;
    setRequestedTab(fallbackTab);
    persistTab(fallbackTab);
    window.history.replaceState(
      { tab: fallbackTab },
      '',
      `${pathForTab(fallbackTab)}${window.location.search}`
    );
  }, [isAuthenticated, requestedTab, canAccessTab, fallbackTab]);

  // --- PostgreSQL backend sync -----------------------------------------------
  // Hydrate all entity state from the server on mount. The bundled INITIAL_*
  // constants only serve as optimistic seed / offline fallback.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const [locs, org, prios, projs, depts, sources, crises, execs, cnts, users, roles, analysisSrcs] = await Promise.all([
          api.locations.list(),
          api.organization.get(),
          api.priorities.list(),
          api.projects.list(),
          api.departments.list(),
          api.budgetSources.list(),
          api.crisesHarms.list(),
          api.executors.list(),
          api.contractors.list(),
          api.users.list(),
          api.rolesPermissions.list(),
          api.analysisSources.list(),
        ]);
        if (cancelled) return;

        setLocations(locs);
        setSelectedLocation((prev) => locs.find((l) => l.id === prev.id) ?? locs[0] ?? prev);
        setOrgConfig(org);
        setPriorities(prios);
        setProjects(projs);
        setDepartments(depts);
        setBudgetSources(sources);
        setCrisesHarms(crises);
        setExecutors(execs);
        setContractors(cnts);
        setRolesPermissions(roles);
        setAnalysisSources(analysisSrcs);
        setUserDatabase(users);

        // The audit trail is permission-gated (canAuditLogs), so a role without
        // the flag gets 403 here. It is loaded on its own precisely so that one
        // refusal cannot reject the whole batch and leave the session running on
        // the bundled seed permissions instead of the server's matrix.
        api.auditLogs
          .list()
          .then((logs) => {
            if (!cancelled) setAuditLogs(logs);
          })
          .catch(() => {
            /* no audit-trail permission — its page is closed to this role */
          });
      } catch {
        // Server unreachable — keep the bundled seed data so the app stays usable offline.
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Initial Percentages state mapped directly from smart recommendations for active location
  const [currentPercentages, setCurrentPercentages] = useState<Record<string, number>>(() => {
    const recs = calculateSmartRecommendations(INITIAL_PRIORITIES, INITIAL_LOCATIONS[0].indicators, INITIAL_LOCATIONS[0].city);
    return recs.scores;
  });

  // Helper to add audit trail log
  const addAuditLog = (
    actionType: AuditActionType,
    targetPriorityTitle?: string,
    oldValue?: string,
    newValue?: string,
    rationale?: string,
    actingUser?: UserProfile
  ) => {
    // `actingUser` exists because sign-in/sign-out write an entry in the same
    // tick as the user change: this closure still holds the previous user.
    const actor = actingUser ?? currentUser;
    const newEntry: AuditLogItem = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleDateString('fa-IR') + ' - ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      userName: actor.name,
      userRole: actor.role,
      actionType,
      targetPriorityTitle,
      oldValue,
      newValue,
      rationale,
      // هر رویداد به موقعیت فعال همان لحظه مهر می‌خورد تا تاریخچه نظارتی هر
      // شهرستان جدا از سایر شهرستان‌ها نمایش داده شود.
      province: selectedLocation.province,
      county: selectedLocation.county,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
    api.auditLogs.create(newEntry).catch(() => {});
  };

  // --- Write failures -------------------------------------------------------
  // Mutations are optimistic: the screen already shows the change. Until now a
  // refused request died in `console.error` and the UI kept showing a change the
  // database had rejected — a row that vanished on screen but not on the server,
  // or one that stayed after failing to save. Now every write either matches the
  // server or is rolled back and announced.
  const [writeError, setWriteError] = useState<WriteError | null>(null);

  const reportWriteError = useCallback((action: string, error: unknown) => {
    setWriteError({ id: Date.now(), title: 'ذخیره نشد', description: describeWriteError(action, error) });
  }, []);

  const dismissWriteError = useCallback(() => setWriteError(null), []);

  /**
   * Await one optimistic write. `rollback` restores the state as it was before
   * the optimistic update; `onSuccess` runs the audit entry, so the audit trail
   * never records a change the database refused.
   */
  const persist = useCallback(
    (action: string, rollback: () => void, request: Promise<unknown>, onSuccess?: () => void) => {
      void request.then(
        () => {
          onSuccess?.();
        },
        (error: unknown) => {
          rollback();
          reportWriteError(action, error);
        }
      );
    },
    [reportWriteError]
  );

  // --- Verified access gate (replaces the identity simulation) -------------
  // The API call and the audit trail both authenticate through the same
  // httpOnly session; a LOGIN/LOGOUT entry is stamped with the verified
  // identity — the audit-log route overwrites the actor FK server-side, so
  // even this narrative cannot claim an identity by name.
  const login = async (mobile: string, password: string) => {
    const verified = await auth.login(mobile, password);
    setActiveTab('DASHBOARD');
    addAuditLog('LOGIN', 'ورود به سامانه', '-', verified.roleFa, `ورود ${verified.name} به سامانه مدیریت توسعه`, verified);
  };

  const logout = async () => {
    // Log out while still authenticated so the audit entry gets valid actor
    // stamping from the server, then drop the session.
    addAuditLog('LOGOUT', 'خروج از سامانه', currentUser.roleFa, '-', `خروج ${currentUser.name} از سامانه مدیریت توسعه`, currentUser);
    await auth.logout();
    setActiveTab('DASHBOARD');
  };

  // --- Location-scoped entity views -----------------------------------------
  // The registry holds records for many counties. Dependent sections must
  // follow the selected location, so each list is narrowed here once instead of
  // hard-coding a county name inside every view. Records without any county
  // (national/policy level or user-created ones) keep showing, so nothing
  // user-entered ever disappears from the UI.
  const matchesSelectedCounty = useCallback(
    (entity: { province?: string; county?: string }) => {
      const county = entity.county?.trim();
      if (county) return county === selectedLocation.county;
      const province = entity.province?.trim();
      if (province) return province === selectedLocation.province;
      return true;
    },
    [selectedLocation.county, selectedLocation.province]
  );

  const scopedDepartments = useMemo(
    () => departments.filter(matchesSelectedCounty),
    [departments, matchesSelectedCounty]
  );
  const scopedBudgetSources = useMemo(
    () => budgetSources.filter(matchesSelectedCounty),
    [budgetSources, matchesSelectedCounty]
  );
  const scopedCrisesHarms = useMemo(
    () => crisesHarms.filter(matchesSelectedCounty),
    [crisesHarms, matchesSelectedCounty]
  );
  const scopedExecutors = useMemo(
    () => executors.filter(matchesSelectedCounty),
    [executors, matchesSelectedCounty]
  );
  const scopedContractors = useMemo(
    () => contractors.filter(matchesSelectedCounty),
    [contractors, matchesSelectedCounty]
  );
  const scopedProjects = useMemo(
    () => projects.filter(matchesSelectedCounty),
    [projects, matchesSelectedCounty]
  );
  const scopedUsers = useMemo(
    () => users.filter(matchesSelectedCounty),
    [users, matchesSelectedCounty]
  );
  const scopedAuditLogs = useMemo(
    () => auditLogs.filter(matchesSelectedCounty),
    [auditLogs, matchesSelectedCounty]
  );

  // Smart Recommendations recalculated dynamically based on selectedLocation indicators
  const recommendations = useMemo(() => {
    return calculateSmartRecommendations(priorities, selectedLocation.indicators, selectedLocation.city);
  }, [priorities, selectedLocation.indicators, selectedLocation.city]);

  // Anti-duplication and project efficiency engine analysis — scoped to the
  // selected county so overlap/duplication warnings describe the local portfolio.
  const { evaluatedProjects, alerts: antiDuplicationAlerts, metrics: optimizationMetrics } = useMemo(() => {
    return analyzeProjectDuplicatesAndEfficiency(scopedProjects, scopedCrisesHarms, scopedBudgetSources);
  }, [scopedProjects, scopedCrisesHarms, scopedBudgetSources]);

  // Centralized Effect: Automatically sync orgConfig and re-evaluate smart allocations when selectedLocation updates
  useEffect(() => {
    setOrgConfig((prev) => ({
      ...prev,
      province: selectedLocation.province,
      city: selectedLocation.city,
      county: selectedLocation.county,
      district: selectedLocation.district,
    }));

    const newRecs = calculateSmartRecommendations(priorities, selectedLocation.indicators, selectedLocation.city);
    setCurrentPercentages(newRecs.scores);
  }, [selectedLocation.id, selectedLocation.province, selectedLocation.county, selectedLocation.city, selectedLocation.district, priorities]);

  // Centralized Location Selection Handler
  const handleSelectLocation = (newLoc: LocationData) => {
    setSelectedLocation(newLoc);
    setAdministrativeScope(newLoc.level);
    setOrgConfig((prev) => ({
      ...prev,
      province: newLoc.province,
      city: newLoc.city,
      county: newLoc.county,
      district: newLoc.district,
    }));

    const newRecs = calculateSmartRecommendations(priorities, newLoc.indicators, newLoc.city);
    setCurrentPercentages(newRecs.scores);

    addAuditLog(
      'LOCATION_CHANGE',
      `${newLoc.province} - ${newLoc.county}`,
      '-',
      `${newLoc.district}`,
      `تغییر موقعیت جغرافیایی به ${newLoc.province} (${newLoc.county} - ${newLoc.district})`
    );
  };

  // Location Indicators Update
  const handleUpdateIndicators = (newIndicators: LocalIndicators) => {
    const updatedLoc = { ...selectedLocation, indicators: newIndicators };
    setSelectedLocation(updatedLoc);
    setLocations((prev) => prev.map((l) => (l.id === updatedLoc.id ? updatedLoc : l)));

    const newRecs = calculateSmartRecommendations(priorities, newIndicators, updatedLoc.city);
    setCurrentPercentages(newRecs.scores);
  };

  // Saving a whole location record. The Locations page edits any card — not
  // only the active one — so the registry entry is replaced in place, and when
  // the edited record happens to be the active location the rest of the system
  // (active picker, smart allocation) follows the new values immediately.
  const handleUpdateLocation = (updated: LocationData) => {
    setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));

    if (updated.id !== selectedLocation.id) return;

    setSelectedLocation(updated);
    const newRecs = calculateSmartRecommendations(priorities, updated.indicators, updated.city);
    setCurrentPercentages(newRecs.scores);
  };

  // Percentage change with smart rebalancing
  const handlePercentageChange = (priorityId: string, newValue: number) => {
    if (lockedIds.has(priorityId)) return;

    setCurrentPercentages((prevMap) => {
      const oldVal = prevMap[priorityId] || 0;
      const diff = newValue - oldVal;

      const unlockedOthers = priorities.filter((p) => p.id !== priorityId && !lockedIds.has(p.id));

      if (unlockedOthers.length === 0) {
        return { ...prevMap, [priorityId]: newValue };
      }

      const sumOthers = unlockedOthers.reduce((acc, p) => acc + (prevMap[p.id] || 0), 0);
      const nextMap = { ...prevMap, [priorityId]: newValue };

      if (sumOthers > 0) {
        let runningAdjusted = 0;
        unlockedOthers.forEach((p, idx) => {
          const currentOtherVal = prevMap[p.id] || 0;
          const ratio = currentOtherVal / sumOthers;
          let adjusted = currentOtherVal - diff * ratio;
          adjusted = Math.max(0, adjusted);

          if (idx === unlockedOthers.length - 1) {
            const sumAllSoFar =
              newValue +
              priorities
                .filter((pr) => pr.id !== priorityId && (lockedIds.has(pr.id) || unlockedOthers.indexOf(pr) < idx))
                .reduce((a, pr) => a + (nextMap[pr.id] || 0), 0);
            adjusted = Math.max(0, roundPercentage(100 - sumAllSoFar));
          } else {
            adjusted = roundPercentage(adjusted);
          }

          nextMap[p.id] = adjusted;
          runningAdjusted += adjusted;
        });
      }

      return nextMap;
    });

    const prioObj = priorities.find((p) => p.id === priorityId);
    if (prioObj) {
      addAuditLog(
        'PERCENTAGE_CHANGE',
        prioObj.title,
        `${toPersianDigits(currentPercentages[priorityId] || 0)}٪`,
        `${toPersianDigits(newValue)}٪`,
        'تنظیم درصد تخصیص اولویت در الگوریتم'
      );
    }
  };

  // Lock / Unlock Priority
  const handleToggleLock = (priorityId: string) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(priorityId)) {
        next.delete(priorityId);
      } else {
        next.add(priorityId);
      }
      return next;
    });
  };

  // Apply Smart Recommendations
  const handleApplySmartRecommendations = () => {
    setCurrentPercentages(recommendations.scores);
    addAuditLog(
      'SCENARIO_APPLIED',
      'پیشنهاد هوشمند AI و بهینه‌سازی الگوریتمی',
      'تخصیص قبلی',
      'الگوی هوشمند محلی',
      recommendations.summaryRationale
    );
  };

  // Reset to Default Percentages
  const handleResetToDefault = () => {
    const defMap: Record<string, number> = {};
    priorities.forEach((p) => {
      defMap[p.id] = p.defaultPercentage;
    });
    setCurrentPercentages(defMap);
    setLockedIds(new Set());
    addAuditLog('PERCENTAGE_CHANGE', 'همه اولویت‌ها', 'تغییریافته', 'پیش‌فرض اولیه', 'بازنشانی به درصد پیش‌فرض اولیه');
  };

  // Auto Rebalance to exact 100%
  const handleAutoRebalance = () => {
    const sum = (Object.values(currentPercentages) as number[]).reduce((a, b) => a + b, 0);
    if (sum === 0) return;

    const rebalanced: Record<string, number> = {};
    let runningSum = 0;
    priorities.forEach((p, idx) => {
      if (idx === priorities.length - 1) {
        rebalanced[p.id] = roundPercentage(100 - runningSum);
      } else {
        const val = currentPercentages[p.id] || 0;
        const norm = roundPercentage((val / sum) * 100);
        rebalanced[p.id] = norm;
        runningSum += norm;
      }
    });
    setCurrentPercentages(rebalanced);
  };

  // Priorities CRUD
  const handleAddPriority = (title: string, category: string, description: string, defaultPct: number) => {
    const newId = `p-${Date.now()}`;
    const newPriority: CsrPriority = {
      id: newId,
      code: priorities.length + 1,
      title,
      description,
      category,
      defaultPercentage: defaultPct,
      currentPercentage: defaultPct,
      isActive: true,
      relatedIndicators: ['povertyRate'],
      iconName: 'Building',
      weightFactor: 1.0,
      minPercent: 1,
      maxPercent: 50,
      subItems: [],
    };
    const previousPriorities = priorities;
    const previousPercentages = currentPercentages;
    setPriorities((prev) => [...prev, newPriority]);
    setCurrentPercentages((prev) => ({ ...prev, [newId]: defaultPct }));
    persist(
      'افزودن اولویت',
      () => {
        setPriorities(previousPriorities);
        setCurrentPercentages(previousPercentages);
      },
      api.priorities.create(newPriority),
      () => addAuditLog('PRIORITY_ADD', title, 'عدم وجود', `${toPersianDigits(defaultPct)}٪`, 'افزودن اولویت توسعه جدید')
    );
  };

  const handleUpdatePriority = (updated: CsrPriority) => {
    const previousPriorities = priorities;
    setPriorities((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    persist(
      'ویرایش اولویت',
      () => setPriorities(previousPriorities),
      api.priorities.update(updated),
      () => addAuditLog('PRIORITY_EDIT', updated.title, 'نسخه پیشین', 'به‌روزرسانی', 'ویرایش مشخصات اولویت توسعه')
    );
  };

  const handleDeletePriority = (priorityId: string) => {
    const prio = priorities.find((p) => p.id === priorityId);
    const previousPriorities = priorities;
    const previousPercentages = currentPercentages;
    setPriorities((prev) => prev.filter((p) => p.id !== priorityId));
    setCurrentPercentages((prev) => {
      const next = { ...prev };
      delete next[priorityId];
      return next;
    });
    persist(
      'حذف اولویت',
      () => {
        setPriorities(previousPriorities);
        setCurrentPercentages(previousPercentages);
      },
      api.priorities.remove(priorityId),
      () => addAuditLog('PRIORITY_DELETE', prio?.title, 'فعال', 'حذف شده', 'حذف اولویت از ماتریس تخصیص')
    );
  };

  const handleImportPriorities = (imported: CsrPriority[]) => {
    const previousPriorities = priorities;
    const previousPercentages = currentPercentages;
    setPriorities(imported);
    const newPctMap: Record<string, number> = {};
    imported.forEach((p) => {
      newPctMap[p.id] = p.defaultPercentage;
    });
    setCurrentPercentages(newPctMap);
    persist(
      'بارگذاری اولویت‌ها',
      () => {
        setPriorities(previousPriorities);
        setCurrentPercentages(previousPercentages);
      },
      api.priorities.importAll(imported),
      () =>
        addAuditLog('PRIORITY_ADD', 'ایمپورت داده‌ها', '-', `${toPersianDigits(imported.length)} اولویت`, 'بارگذاری اولویت‌ها')
    );
  };

  const handleAddSubItem = (priorityId: string, subItemTitle: string) => {
    if (!subItemTitle.trim()) return;
    const prio = priorities.find((p) => p.id === priorityId);
    setPriorities((prev) =>
      prev.map((p) => {
        if (p.id === priorityId) {
          const currentSub = p.subItems || [];
          return { ...p, subItems: [...currentSub, subItemTitle.trim()] };
        }
        return p;
      })
    );
    addAuditLog('PRIORITY_ADD', prio?.title, 'اقدام فرعی', subItemTitle.trim(), `افزودن زیرمجموعه به اولویت ${prio?.title}`);
  };

  const handleDeleteSubItem = (priorityId: string, subItemIndex: number) => {
    const prio = priorities.find((p) => p.id === priorityId);
    const deletedText = prio?.subItems?.[subItemIndex];
    setPriorities((prev) =>
      prev.map((p) => {
        if (p.id === priorityId && p.subItems) {
          const updatedSub = p.subItems.filter((_, idx) => idx !== subItemIndex);
          return { ...p, subItems: updatedSub };
        }
        return p;
      })
    );
    addAuditLog('PRIORITY_DELETE', prio?.title, deletedText || 'زیرمجموعه', 'حذف شده', `حذف زیرمجموعه`);
  };

  // Projects CRUD
  const handleAddProject = (newP: Omit<ExecutiveProject, 'id' | 'costPerBeneficiaryToman' | 'antiOverlapStatus'>) => {
    const beneficiaries = Math.max(1, newP.beneficiariesCount);
    const costPer = Math.round(newP.estimatedCostToman / beneficiaries);
    const proj: ExecutiveProject = {
      ...newP,
      // Ownership is stamped here rather than by the form: the creator is the
      // signed-in user, and the «رئیس اداره» scope reads this field back.
      createdByUserId: currentUser.id,
      createdByName: currentUser.name,
      id: `proj-${Date.now()}`,
      costPerBeneficiaryToman: costPer,
      antiOverlapStatus: 'CLEAR',
    };
    const previousProjects = projects;
    setProjects((prev) => [proj, ...prev]);
    persist(
      'ثبت پروژه',
      () => setProjects(previousProjects),
      api.projects.create(proj),
      () => addAuditLog('PROJECT_ADD', newP.title, 'تعریف اولیه', formatMoney(newP.estimatedCostToman), `ثبت پروژه توسط ${newP.departmentName}`)
    );
  };

  const handleUpdateProject = (updated: ExecutiveProject) => {
    const beneficiaries = Math.max(1, updated.beneficiariesCount);
    const costPer = Math.round(updated.estimatedCostToman / beneficiaries);
    const finalized = { ...updated, costPerBeneficiaryToman: costPer };
    const previousProjects = projects;
    setProjects((prev) => prev.map((p) => (p.id === finalized.id ? finalized : p)));
    persist(
      'ویرایش پروژه',
      () => setProjects(previousProjects),
      api.projects.update(finalized),
      () => addAuditLog('PROJECT_EDIT', updated.title, 'ویرایش', `${toPersianDigits(updated.progressPercentage)}٪ پیشرفت`, 'به‌روزرسانی اطلاعات پروژه')
    );
  };

  const handleDeleteProject = (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    const previousProjects = projects;
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    persist(
      'حذف پروژه',
      () => setProjects(previousProjects),
      api.projects.remove(projectId),
      () => addAuditLog('PROJECT_DELETE', proj?.title, 'موجود', 'حذف شده', 'حذف پروژه از سامانه')
    );
  };

  const handleToggleProjectStatus = (projectId: string, newStatus: ExecutiveProject['status']) => {
    const proj = projects.find((p) => p.id === projectId);
    const previousProjects = projects;
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
    );
    persist(
      'تغییر وضعیت پروژه',
      () => setProjects(previousProjects),
      api.projects.setStatus(projectId, newStatus),
      () => addAuditLog('PROJECT_STATUS_CHANGE', proj?.title, proj?.status, newStatus, `تغییر وضعیت پروژه به ${newStatus}`)
    );
  };

  // Departments CRUD
  const handleAddDepartment = (dept: Omit<Department, 'id'>) => {
    const newDept: Department = { ...dept, id: `dept-${Date.now()}` };
    const previousDepartments = departments;
    setDepartments((prev) => [...prev, newDept]);
    persist(
      'ثبت اداره',
      () => setDepartments(previousDepartments),
      api.departments.create(newDept),
      () => addAuditLog('DEPARTMENT_ADD', dept.name, 'تعریف جدید', dept.categoryFa, `ثبت نهاد/اداره جدید در سامانه ملی`)
    );
  };

  const handleUpdateDepartment = (dept: Department) => {
    const previousDepartments = departments;
    setDepartments((prev) => prev.map((d) => (d.id === dept.id ? dept : d)));
    persist(
      'ویرایش اداره',
      () => setDepartments(previousDepartments),
      api.departments.update(dept),
      () => addAuditLog('DEPARTMENT_EDIT', dept.name, 'ویرایش', formatMoney(dept.allocatedBudgetToman), 'ویرایش مشخصات نهاد')
    );
  };

  const handleDeleteDepartment = (departmentId: string) => {
    const dept = departments.find((d) => d.id === departmentId);
    const previous = departments;
    setDepartments((prev) => prev.filter((d) => d.id !== departmentId));
    persist(
      'حذف اداره',
      () => setDepartments(previous),
      api.departments.remove(departmentId),
      () => addAuditLog('DEPARTMENT_DELETE', dept?.name, 'فعال', 'حذف شده', 'حذف اداره متولی')
    );
  };

  // Budget Sources CRUD
  const handleAddBudgetSource = (source: Omit<BudgetSource, 'id'>) => {
    const newSrc: BudgetSource = { ...source, id: `src-${Date.now()}` };
    const previousSources = budgetSources;
    setBudgetSources((prev) => [...prev, newSrc]);
    persist(
      'ثبت منبع بودجه',
      () => setBudgetSources(previousSources),
      api.budgetSources.create(newSrc),
      () => addAuditLog('BUDGET_SOURCE_ADD', source.title, 'سرفصل جدید', formatMoney(source.totalAmountToman), `تعریف منبع بودجه جدید (${source.sourceTypeFa})`)
    );
  };

  const handleUpdateBudgetSource = (source: BudgetSource) => {
    const previousSources = budgetSources;
    setBudgetSources((prev) => prev.map((s) => (s.id === source.id ? source : s)));
    persist(
      'ویرایش منبع بودجه',
      () => setBudgetSources(previousSources),
      api.budgetSources.update(source),
      () => addAuditLog('BUDGET_SOURCE_EDIT', source.title, 'ویرایش', formatMoney(source.totalAmountToman), 'به‌روزرسانی منبع مالی')
    );
  };

  const handleDeleteBudgetSource = (sourceId: string) => {
    const src = budgetSources.find((s) => s.id === sourceId);
    const previousSources = budgetSources;
    setBudgetSources((prev) => prev.filter((s) => s.id !== sourceId));
    persist(
      'حذف منبع بودجه',
      () => setBudgetSources(previousSources),
      api.budgetSources.remove(sourceId),
      () => addAuditLog('BUDGET_SOURCE_DELETE', src?.title, 'فعال', 'حذف شده', 'حذف سرفصل تأمین مالی')
    );
  };

  // Crises & Harms CRUD
  const handleAddCrisisHarm = (item: Omit<CrisisHarmItem, 'id'>) => {
    const newItem: CrisisHarmItem = { ...item, id: `crisis-${Date.now()}` };
    const previousCrises = crisesHarms;
    setCrisesHarms((prev) => [...prev, newItem]);
    persist(
      'ثبت بحران/آسیب',
      () => setCrisesHarms(previousCrises),
      api.crisesHarms.create(newItem),
      () => addAuditLog('CRISIS_ADD', item.title, 'نیازسنجی جدید', item.urgency, `ثبت آسیب یا بحران محلی با ضریب فوریت ${item.urgency}`)
    );
  };

  const handleUpdateCrisisHarm = (item: CrisisHarmItem) => {
    const previousCrises = crisesHarms;
    setCrisesHarms((prev) => prev.map((c) => (c.id === item.id ? item : c)));
    persist(
      'ویرایش بحران/آسیب',
      () => setCrisesHarms(previousCrises),
      api.crisesHarms.update(item),
      () => addAuditLog('CRISIS_EDIT', item.title, 'ویرایش', item.status, 'ویرایش مشخصات بحران/آسیب')
    );
  };

  const handleDeleteCrisisHarm = (crisisId: string) => {
    const crisis = crisesHarms.find((c) => c.id === crisisId);
    const previousCrises = crisesHarms;
    setCrisesHarms((prev) => prev.filter((c) => c.id !== crisisId));
    persist(
      'حذف بحران/آسیب',
      () => setCrisesHarms(previousCrises),
      api.crisesHarms.remove(crisisId),
      () => addAuditLog('CRISIS_DELETE', crisis?.title, 'موجود', 'حذف شده', 'حذف آسیب از پایگاه داده')
    );
  };

  // Executors CRUD
  const handleAddExecutor = (executor: Omit<ProjectExecutor, 'id'>) => {
    const newExec: ProjectExecutor = { ...executor, id: `exec-${Date.now()}` };
    const previousExecutors = executors;
    setExecutors((prev) => [...prev, newExec]);
    persist(
      'ثبت مجری',
      () => setExecutors(previousExecutors),
      api.executors.create(newExec),
      () => addAuditLog('EXECUTOR_ADD', executor.name, 'تعریف جدید', executor.typeFa, 'ثبت مجری جدید')
    );
  };

  const handleUpdateExecutor = (executor: ProjectExecutor) => {
    const previousExecutors = executors;
    setExecutors((prev) => prev.map((e) => (e.id === executor.id ? executor : e)));
    persist(
      'ویرایش مجری',
      () => setExecutors(previousExecutors),
      api.executors.update(executor),
      () => addAuditLog('EXECUTOR_EDIT', executor.name, 'ویرایش', executor.capacityStatus, 'به‌روزرسانی مشخصات مجری')
    );
  };

  const handleDeleteExecutor = (executorId: string) => {
    const exec = executors.find((e) => e.id === executorId);
    const previousExecutors = executors;
    setExecutors((prev) => prev.filter((e) => e.id !== executorId));
    persist(
      'حذف مجری',
      () => setExecutors(previousExecutors),
      api.executors.remove(executorId),
      () => addAuditLog('EXECUTOR_DELETE', exec?.name, 'فعال', 'حذف شده', 'حذف مجری')
    );
  };

  // Contractors CRUD
  const handleAddContractor = (contractor: Omit<Contractor, 'id'>) => {
    const newCnt: Contractor = { ...contractor, id: `cnt-${Date.now()}` };
    const previousContractors = contractors;
    setContractors((prev) => [...prev, newCnt]);
    persist(
      'ثبت پیمانکار',
      () => setContractors(previousContractors),
      api.contractors.create(newCnt),
      () => addAuditLog('CONTRACTOR_ADD', contractor.companyName, 'ثبت نام جدید', contractor.gradeFa, 'ثبت پیمانکار واجد صلاحیت')
    );
  };

  const handleUpdateContractor = (contractor: Contractor) => {
    const previousContractors = contractors;
    setContractors((prev) => prev.map((c) => (c.id === contractor.id ? contractor : c)));
    persist(
      'ویرایش پیمانکار',
      () => setContractors(previousContractors),
      api.contractors.update(contractor),
      () => addAuditLog('CONTRACTOR_EDIT', contractor.companyName, 'ویرایش', `${toPersianDigits(contractor.performanceScore)} امتیاز`, 'ویرایش مشخصات پیمانکار')
    );
  };

  const handleDeleteContractor = (contractorId: string) => {
    const cnt = contractors.find((c) => c.id === contractorId);
    const previousContractors = contractors;
    setContractors((prev) => prev.filter((c) => c.id !== contractorId));
    persist(
      'حذف پیمانکار',
      () => setContractors(previousContractors),
      api.contractors.remove(contractorId),
      () => addAuditLog('CONTRACTOR_DELETE', cnt?.companyName, 'موجود', 'حذف شده', 'حذف پیمانکار')
    );
  };

  // Analysis Sources CRUD + human-in-the-loop review. Every mutation records an
  // audit entry so the source registry keeps the same governance trail as the
  // entities it feeds.
  const handleAddAnalysisSource = (
    source: Omit<AnalysisSource, 'id' | 'status' | 'createdAt' | 'reviewedBy' | 'reviewNote'>
  ) => {
    const now = new Date();
    const newSource: AnalysisSource = {
      ...source,
      id: `src-${Date.now()}`,
      status: 'PENDING',
      createdAt: `${now.toLocaleDateString('fa-IR')} - ${now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`,
    };
    const previousSources = analysisSources;
    setAnalysisSources((prev) => [newSource, ...prev]);
    persist(
      'افزودن منبع تحلیل',
      () => setAnalysisSources(previousSources),
      api.analysisSources.create(newSource),
      () => addAuditLog('ANALYSIS_SOURCE_ADD', source.title, 'ثبت جدید', source.provider, 'افزودن منبع تحلیل جدید به سامانه')
    );
  };

  const handleUpdateAnalysisSource = (source: AnalysisSource) => {
    const previousSources = analysisSources;
    setAnalysisSources((prev) => prev.map((s) => (s.id === source.id ? source : s)));
    persist(
      'ویرایش منبع تحلیل',
      () => setAnalysisSources(previousSources),
      api.analysisSources.update(source),
      () => addAuditLog('ANALYSIS_SOURCE_EDIT', source.title, 'ویرایش', source.provider, 'ویرایش منبع تحلیل')
    );
  };

  const handleReviewAnalysisSource = (sourceId: string, status: AnalysisSourceStatus, note?: string) => {
    const target = analysisSources.find((s) => s.id === sourceId);
    if (!target) return;
    const updated: AnalysisSource = {
      ...target,
      status,
      reviewedBy: currentUser.name,
      reviewNote: note ?? target.reviewNote,
    };
    const previousSources = analysisSources;
    setAnalysisSources((prev) => prev.map((s) => (s.id === sourceId ? updated : s)));
    const verdict =
      status === 'APPROVED' ? 'تأیید' : status === 'REJECTED' ? 'رد' : 'بازگشت به صف بررسی';
    persist(
      'بازبینی منبع تحلیل',
      () => setAnalysisSources(previousSources),
      api.analysisSources.update(updated),
      () => addAuditLog('ANALYSIS_SOURCE_REVIEW', target.title, target.status, status, `بازبینی منبع تحلیل: ${verdict}`)
    );
  };

  const handleDeleteAnalysisSource = (sourceId: string) => {
    const target = analysisSources.find((s) => s.id === sourceId);
    const previousSources = analysisSources;
    setAnalysisSources((prev) => prev.filter((s) => s.id !== sourceId));
    persist(
      'حذف منبع تحلیل',
      () => setAnalysisSources(previousSources),
      api.analysisSources.remove(sourceId),
      () => addAuditLog('ANALYSIS_SOURCE_DELETE', target?.title, 'موجود', 'حذف شده', 'حذف منبع تحلیل از سامانه')
    );
  };

  // Toggle one permission flag for a single user only. Other users — even
  // those sharing the same role — are never affected.
  const handleToggleUserPermission = (userId: string, field: UserPermissionField) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    setUserPermissionOverrides((prev) => {
      const base = rolesPermissions.find((r) => r.role === user.role);
      const effective = prev[userId]?.[field] ?? base?.[field] ?? false;
      const nextValue = !effective;
      const nextOverride: UserPermissionOverride = { ...(prev[userId] ?? {}), [field]: nextValue };

      // A value equal to the role default needs no override entry, so drop it.
      if (base && nextValue === base[field]) {
        const rest: UserPermissionOverride = { ...nextOverride };
        delete rest[field];
        if (Object.keys(rest).length === 0) {
          const { [userId]: _removed, ...restUsers } = prev;
          return restUsers;
        }
        return { ...prev, [userId]: rest };
      }
      return { ...prev, [userId]: nextOverride };
    });
  };

  // Save Org Config
  const handleSaveOrgConfig = (updated: OrganizationConfig) => {
    const previousOrg = orgConfig;
    setOrgConfig(updated);
    persist(
      'ذخیره تنظیمات کلان',
      () => setOrgConfig(previousOrg),
      api.organization.save(updated),
      () => addAuditLog('BUDGET_UPDATE', 'مشخصات سامانه ملی', 'ویرایش شده', `${formatNumber(updated.totalBudget)} تومان`, 'به‌روزرسانی مشخصات و تنظیمات کلان')
    );
  };

  const value: AppContextType = {
    locations,
    selectedLocation,
    administrativeScope,
    orgConfig,
    priorities,
    currentPercentages,
    lockedIds,
    recommendations,
    auditLogs: scopedAuditLogs,
    projects: evaluatedProjects,
    departments: scopedDepartments,
    budgetSources: scopedBudgetSources,
    crisesHarms: scopedCrisesHarms,
    executors: scopedExecutors,
    contractors: scopedContractors,
    analysisSources,
    rolesPermissions,
    users: scopedUsers,
    currentUser,
    activeTab,
    isAuthenticated,
    antiDuplicationAlerts,
    optimizationMetrics,
    setActiveTab,
    canAccessTab,
    login,
    logout,
    setAdministrativeScope,
    handleSelectLocation,
    handleUpdateIndicators,
    handleUpdateLocation,
    handlePercentageChange,
    handleToggleLock,
    handleApplySmartRecommendations,
    handleResetToDefault,
    handleAutoRebalance,
    handleAddPriority,
    handleUpdatePriority,
    handleDeletePriority,
    handleImportPriorities,
    handleAddSubItem,
    handleDeleteSubItem,
    handleAddProject,
    handleUpdateProject,
    handleDeleteProject,
    handleToggleProjectStatus,
    handleAddDepartment,
    handleUpdateDepartment,
    handleDeleteDepartment,
    handleAddBudgetSource,
    handleUpdateBudgetSource,
    handleDeleteBudgetSource,
    handleAddCrisisHarm,
    handleUpdateCrisisHarm,
    handleDeleteCrisisHarm,
    handleAddExecutor,
    handleUpdateExecutor,
    handleDeleteExecutor,
    handleAddContractor,
    handleUpdateContractor,
    handleDeleteContractor,
    handleAddAnalysisSource,
    handleUpdateAnalysisSource,
    handleReviewAnalysisSource,
    handleDeleteAnalysisSource,
    getUserPermissions,
    handleToggleUserPermission,
    handleSaveOrgConfig,
    writeError,
    dismissWriteError,
    addAuditLog,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
