import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
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
} from '../data/initialData';
import { calculateSmartRecommendations } from '../utils/recommendationEngine';
import { formatNumber, roundPercentage, toPersianDigits } from '../utils/numberUtils';
import { analyzeProjectDuplicatesAndEfficiency, OptimizationMetrics } from '../utils/antiDuplicationEngine';
import { api } from '../services/api';

const AUTH_STORAGE_KEY = 'csr.auth.userId';
const TAB_STORAGE_KEY = 'csr.activeTab';

// Every navigable workspace tab. Used to validate the persisted tab so a
// stale/unknown stored value falls back to the dashboard instead of stranding
// the app on a blank page.
const VALID_TABS = [
  'DASHBOARD',
  'POPULATION',
  'DEPARTMENTS',
  'BUDGET_SOURCES',
  'PRIORITIES',
  'CRISES_HARMS',
  'EXECUTORS',
  'CONTRACTORS',
  'CREATE_PROJECT',
  'PROJECTS',
  'CHARTS',
  'LOCATIONS',
  'ROLES_PERMISSIONS',
];

/** Persisted identity survives a refresh. Storage may be unavailable (private
 *  mode, quota, SSR), in which case the session simply stays in-memory. */
function readPersistedUserId(): string | null {
  try {
    return window.localStorage.getItem(AUTH_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistUserId(userId: string | null) {
  try {
    if (userId) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, userId);
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    /* ignore — the gate still works for this session */
  }
}

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
  rolesPermissions: SystemRolePermission[];
  users: UserProfile[];
  currentUser: UserProfile;
  activeTab: string;

  // Access gate (identity simulation)
  isAuthenticated: boolean;

  // Analysis & Engine
  antiDuplicationAlerts: AntiDuplicationAlert[];
  optimizationMetrics: OptimizationMetrics;

  // Actions
  setActiveTab: (tab: string) => void;
  setCurrentUser: (user: UserProfile) => void;
  login: (userId: string) => void;
  logout: () => void;
  setAdministrativeScope: (scope: AdministrativeLevel) => void;
  handleSelectLocation: (newLoc: LocationData) => void;
  handleUpdateIndicators: (newIndicators: LocalIndicators) => void;
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

  // Permissions
  getUserPermissions: (user: UserProfile) => SystemRolePermission | undefined;
  handleToggleUserPermission: (userId: string, field: UserPermissionField) => void;

  handleSaveOrgConfig: (updated: OrganizationConfig) => void;
  addAuditLog: (
    actionType: AuditActionType,
    targetPriorityTitle?: string,
    oldValue?: string,
    newValue?: string,
    rationale?: string,
    actingUser?: UserProfile
  ) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State boots from the bundled seed data (instant first paint), then is
  // replaced by the SQLite-backed API payload once the server responds.
  const [locations, setLocations] = useState<LocationData[]>(INITIAL_LOCATIONS);
  const [selectedLocation, setSelectedLocation] = useState<LocationData>(INITIAL_LOCATIONS[0]);
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
  const [rolesPermissions, setRolesPermissions] = useState<SystemRolePermission[]>(INITIAL_ROLES_PERMISSIONS);
  // Individual per-user permission overrides, keyed by user id. Only the
  // changed flags are stored; everything else inherits the role default.
  const [userPermissionOverrides, setUserPermissionOverrides] = useState<Record<string, UserPermissionOverride>>({});
  const [users, setUserDatabase] = useState<UserProfile[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const persistedId = readPersistedUserId();
    return INITIAL_USERS.find((u) => u.id === persistedId) ?? INITIAL_USERS[0];
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    INITIAL_USERS.some((u) => u.id === readPersistedUserId())
  );
  const [activeTab, setActiveTabState] = useState<string>(() => readPersistedTab() ?? 'DASHBOARD');
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    persistTab(tab);
  };

  // --- SQLite backend sync ---------------------------------------------------
  // Hydrate all entity state from the server on mount. The bundled INITIAL_*
  // constants only serve as optimistic seed / offline fallback.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const [locs, org, prios, projs, depts, sources, crises, execs, cnts, users, roles, logs] = await Promise.all([
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
          api.auditLogs.list(),
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
        setAuditLogs(logs);
        setUserDatabase(users);
        setCurrentUser((prev) => users.find((u) => u.id === prev.id) ?? prev);
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
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
    api.auditLogs.create(newEntry).catch(() => {});
  };

  // --- Access gate (organizational identity simulation) ---
  const login = (userId: string) => {
    const user = users.find((u) => u.id === userId) ?? INITIAL_USERS[0];
    setCurrentUser(user);
    setIsAuthenticated(true);
    setActiveTab('DASHBOARD');
    persistUserId(user.id);
    addAuditLog('LOGIN', 'ورود به سامانه', '-', user.roleFa, `ورود ${user.name} به سامانه مدیریت توسعه`, user);
  };

  const logout = () => {
    addAuditLog('LOGOUT', 'خروج از سامانه', currentUser.roleFa, '-', `خروج ${currentUser.name} از سامانه مدیریت توسعه`, currentUser);
    setIsAuthenticated(false);
    setActiveTab('DASHBOARD');
    persistUserId(null);
  };

  // Persona switching from the header / نقش‌ها tab keeps the persisted identity
  // in step, but only while signed in.
  const handleSetCurrentUser = (user: UserProfile) => {
    setCurrentUser(user);
    if (isAuthenticated) {
      persistUserId(user.id);
    }
  };

  // Smart Recommendations recalculated dynamically based on selectedLocation indicators
  const recommendations = useMemo(() => {
    return calculateSmartRecommendations(priorities, selectedLocation.indicators, selectedLocation.city);
  }, [priorities, selectedLocation.indicators, selectedLocation.city]);

  // Anti-duplication and project efficiency engine analysis
  const { evaluatedProjects, alerts: antiDuplicationAlerts, metrics: optimizationMetrics } = useMemo(() => {
    return analyzeProjectDuplicatesAndEfficiency(projects, crisesHarms, budgetSources);
  }, [projects, crisesHarms, budgetSources]);

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
    setPriorities((prev) => [...prev, newPriority]);
    setCurrentPercentages((prev) => ({ ...prev, [newId]: defaultPct }));
    api.priorities.create(newPriority).catch(console.error);
    addAuditLog('PRIORITY_ADD', title, 'عدم وجود', `${toPersianDigits(defaultPct)}٪`, 'افزودن اولویت توسعه جدید');
  };

  const handleUpdatePriority = (updated: CsrPriority) => {
    setPriorities((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    api.priorities.update(updated).catch(console.error);
    addAuditLog('PRIORITY_EDIT', updated.title, 'نسخه پیشین', 'به‌روزرسانی', 'ویرایش مشخصات اولویت توسعه');
  };

  const handleDeletePriority = (priorityId: string) => {
    const prio = priorities.find((p) => p.id === priorityId);
    setPriorities((prev) => prev.filter((p) => p.id !== priorityId));
    setCurrentPercentages((prev) => {
      const next = { ...prev };
      delete next[priorityId];
      return next;
    });
    api.priorities.remove(priorityId).catch(console.error);
    addAuditLog('PRIORITY_DELETE', prio?.title, 'فعال', 'حذف شده', 'حذف اولویت از ماتریس تخصیص');
  };

  const handleImportPriorities = (imported: CsrPriority[]) => {
    setPriorities(imported);
    const newPctMap: Record<string, number> = {};
    imported.forEach((p) => {
      newPctMap[p.id] = p.defaultPercentage;
    });
    setCurrentPercentages(newPctMap);
    api.priorities.importAll(imported).catch(console.error);
    addAuditLog('PRIORITY_ADD', 'ایمپورت داده‌ها', '-', `${toPersianDigits(imported.length)} اولویت`, 'بارگذاری اولویت‌ها');
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
      id: `proj-${Date.now()}`,
      costPerBeneficiaryToman: costPer,
      antiOverlapStatus: 'CLEAR',
    };
    setProjects((prev) => [proj, ...prev]);
    api.projects.create(proj).catch(console.error);
    addAuditLog('PROJECT_ADD', newP.title, 'تعریف اولیه', `${toPersianDigits((newP.estimatedCostToman / 1_000_000_000).toFixed(1))} میلیارد تومان`, `ثبت پروژه توسط ${newP.departmentName}`);
  };

  const handleUpdateProject = (updated: ExecutiveProject) => {
    const beneficiaries = Math.max(1, updated.beneficiariesCount);
    const costPer = Math.round(updated.estimatedCostToman / beneficiaries);
    const finalized = { ...updated, costPerBeneficiaryToman: costPer };
    setProjects((prev) => prev.map((p) => (p.id === finalized.id ? finalized : p)));
    api.projects.update(finalized).catch(console.error);
    addAuditLog('PROJECT_EDIT', updated.title, 'ویرایش', `${toPersianDigits(updated.progressPercentage)}٪ پیشرفت`, 'به‌روزرسانی اطلاعات پروژه');
  };

  const handleDeleteProject = (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    api.projects.remove(projectId).catch(console.error);
    addAuditLog('PROJECT_DELETE', proj?.title, 'موجود', 'حذف شده', 'حذف پروژه از سامانه');
  };

  const handleToggleProjectStatus = (projectId: string, newStatus: ExecutiveProject['status']) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
    );
    api.projects.setStatus(projectId, newStatus).catch(console.error);
    const proj = projects.find((p) => p.id === projectId);
    addAuditLog('PROJECT_STATUS_CHANGE', proj?.title, proj?.status, newStatus, `تغییر وضعیت پروژه به ${newStatus}`);
  };

  // Departments CRUD
  const handleAddDepartment = (dept: Omit<Department, 'id'>) => {
    const newDept: Department = { ...dept, id: `dept-${Date.now()}` };
    setDepartments((prev) => [...prev, newDept]);
    api.departments.create(newDept).catch(console.error);
    addAuditLog('DEPARTMENT_ADD', dept.name, 'تعریف جدید', dept.categoryFa, `ثبت نهاد/اداره جدید در سامانه ملی`);
  };

  const handleUpdateDepartment = (dept: Department) => {
    setDepartments((prev) => prev.map((d) => (d.id === dept.id ? dept : d)));
    api.departments.update(dept).catch(console.error);
    addAuditLog('DEPARTMENT_EDIT', dept.name, 'ویرایش', `${toPersianDigits((dept.allocatedBudgetToman / 1_000_000_000).toFixed(0))} م.ت`, 'ویرایش مشخصات نهاد');
  };

  const handleDeleteDepartment = (departmentId: string) => {
    const dept = departments.find((d) => d.id === departmentId);
    setDepartments((prev) => prev.filter((d) => d.id !== departmentId));
    api.departments.remove(departmentId).catch(console.error);
    addAuditLog('DEPARTMENT_DELETE', dept?.name, 'فعال', 'حذف شده', 'حذف اداره متولی');
  };

  // Budget Sources CRUD
  const handleAddBudgetSource = (source: Omit<BudgetSource, 'id'>) => {
    const newSrc: BudgetSource = { ...source, id: `src-${Date.now()}` };
    setBudgetSources((prev) => [...prev, newSrc]);
    api.budgetSources.create(newSrc).catch(console.error);
    addAuditLog('BUDGET_SOURCE_ADD', source.title, 'سرفصل جدید', `${toPersianDigits((source.totalAmountToman / 1_000_000_000).toFixed(0))} م.ت`, `تعریف منبع بودجه جدید (${source.sourceTypeFa})`);
  };

  const handleUpdateBudgetSource = (source: BudgetSource) => {
    setBudgetSources((prev) => prev.map((s) => (s.id === source.id ? source : s)));
    api.budgetSources.update(source).catch(console.error);
    addAuditLog('BUDGET_SOURCE_EDIT', source.title, 'ویرایش', `${toPersianDigits((source.totalAmountToman / 1_000_000_000).toFixed(0))} م.ت`, 'به‌روزرسانی منبع مالی');
  };

  const handleDeleteBudgetSource = (sourceId: string) => {
    const src = budgetSources.find((s) => s.id === sourceId);
    setBudgetSources((prev) => prev.filter((s) => s.id !== sourceId));
    api.budgetSources.remove(sourceId).catch(console.error);
    addAuditLog('BUDGET_SOURCE_DELETE', src?.title, 'فعال', 'حذف شده', 'حذف سرفصل تأمین مالی');
  };

  // Crises & Harms CRUD
  const handleAddCrisisHarm = (item: Omit<CrisisHarmItem, 'id'>) => {
    const newItem: CrisisHarmItem = { ...item, id: `crisis-${Date.now()}` };
    setCrisesHarms((prev) => [...prev, newItem]);
    api.crisesHarms.create(newItem).catch(console.error);
    addAuditLog('CRISIS_ADD', item.title, 'نیازسنجی جدید', item.urgency, `ثبت آسیب یا بحران محلی با ضریب فوریت ${item.urgency}`);
  };

  const handleUpdateCrisisHarm = (item: CrisisHarmItem) => {
    setCrisesHarms((prev) => prev.map((c) => (c.id === item.id ? item : c)));
    api.crisesHarms.update(item).catch(console.error);
    addAuditLog('CRISIS_EDIT', item.title, 'ویرایش', item.status, 'ویرایش مشخصات بحران/آسیب');
  };

  const handleDeleteCrisisHarm = (crisisId: string) => {
    const crisis = crisesHarms.find((c) => c.id === crisisId);
    setCrisesHarms((prev) => prev.filter((c) => c.id !== crisisId));
    api.crisesHarms.remove(crisisId).catch(console.error);
    addAuditLog('CRISIS_DELETE', crisis?.title, 'موجود', 'حذف شده', 'حذف آسیب از پایگاه داده');
  };

  // Executors CRUD
  const handleAddExecutor = (executor: Omit<ProjectExecutor, 'id'>) => {
    const newExec: ProjectExecutor = { ...executor, id: `exec-${Date.now()}` };
    setExecutors((prev) => [...prev, newExec]);
    api.executors.create(newExec).catch(console.error);
    addAuditLog('EXECUTOR_ADD', executor.name, 'تعریف جدید', executor.typeFa, 'ثبت مجری جدید');
  };

  const handleUpdateExecutor = (executor: ProjectExecutor) => {
    setExecutors((prev) => prev.map((e) => (e.id === executor.id ? executor : e)));
    api.executors.update(executor).catch(console.error);
    addAuditLog('EXECUTOR_EDIT', executor.name, 'ویرایش', executor.capacityStatus, 'به‌روزرسانی مشخصات مجری');
  };

  const handleDeleteExecutor = (executorId: string) => {
    const exec = executors.find((e) => e.id === executorId);
    setExecutors((prev) => prev.filter((e) => e.id !== executorId));
    api.executors.remove(executorId).catch(console.error);
    addAuditLog('EXECUTOR_DELETE', exec?.name, 'فعال', 'حذف شده', 'حذف مجری');
  };

  // Contractors CRUD
  const handleAddContractor = (contractor: Omit<Contractor, 'id'>) => {
    const newCnt: Contractor = { ...contractor, id: `cnt-${Date.now()}` };
    setContractors((prev) => [...prev, newCnt]);
    api.contractors.create(newCnt).catch(console.error);
    addAuditLog('CONTRACTOR_ADD', contractor.companyName, 'ثبت نام جدید', contractor.gradeFa, 'ثبت پیمانکار واجد صلاحیت');
  };

  const handleUpdateContractor = (contractor: Contractor) => {
    setContractors((prev) => prev.map((c) => (c.id === contractor.id ? contractor : c)));
    api.contractors.update(contractor).catch(console.error);
    addAuditLog('CONTRACTOR_EDIT', contractor.companyName, 'ویرایش', `${toPersianDigits(contractor.performanceScore)} امتیاز`, 'ویرایش مشخصات پیمانکار');
  };

  const handleDeleteContractor = (contractorId: string) => {
    const cnt = contractors.find((c) => c.id === contractorId);
    setContractors((prev) => prev.filter((c) => c.id !== contractorId));
    api.contractors.remove(contractorId).catch(console.error);
    addAuditLog('CONTRACTOR_DELETE', cnt?.companyName, 'موجود', 'حذف شده', 'حذف پیمانکار');
  };

  // Effective permissions of an individual user: the role default with that
  // user's stored per-user overrides layered on top.
  const getUserPermissions = (user: UserProfile): SystemRolePermission | undefined => {
    const base = rolesPermissions.find((r) => r.role === user.role);
    if (!base) return undefined;
    const overrides = userPermissionOverrides[user.id];
    return overrides ? { ...base, ...overrides } : base;
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
    setOrgConfig(updated);
    api.organization.save(updated).catch(console.error);
    addAuditLog('BUDGET_UPDATE', 'مشخصات سامانه ملی', 'ویرایش شده', `${formatNumber(updated.totalBudget)} تومان`, 'به‌روزرسانی مشخصات و تنظیمات کلان');
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
    auditLogs,
    projects: evaluatedProjects,
    departments,
    budgetSources,
    crisesHarms,
    executors,
    contractors,
    rolesPermissions,
    users,
    currentUser,
    activeTab,
    isAuthenticated,
    antiDuplicationAlerts,
    optimizationMetrics,
    setActiveTab,
    setCurrentUser: handleSetCurrentUser,
    login,
    logout,
    setAdministrativeScope,
    handleSelectLocation,
    handleUpdateIndicators,
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
    getUserPermissions,
    handleToggleUserPermission,
    handleSaveOrgConfig,
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
