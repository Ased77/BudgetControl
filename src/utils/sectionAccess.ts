/* =========================================================================
   Section access — which workspace pages a role may open.

   `roles_permissions` says what a role may DO; this module maps the app's
   navigable sections onto those flags so a role never enters a page for a
   domain it cannot manage. Each gate mirrors the role descriptions in
   INITIAL_ROLES_PERMISSIONS and the server's write guards (see
   `requirePermission` calls in server/app.ts), keeping the menu and the API
   authority in step.

   Read-only destinations (dashboard, base data, charts and the project
   register) hang off `canViewDashboard`, the baseline every role holds; the
   project register is additionally narrowed per record by utils/recordScope.
   The governance page is the one exception: the system administrator owns the
   roster and matrix, while an auditor needs the audit trail only.

   An absent matrix row cannot deny anyone — the entries boot from the bundled
   seed matrix and are replaced by the server's; writes remain guarded
   server-side either way.
   ========================================================================= */
import type { SystemRolePermission, UserRole } from '../types';

type SectionGate = (
  permissions: SystemRolePermission | undefined,
  role: UserRole,
) => boolean;

const SECTION_GATES: Record<string, SectionGate> = {
  DASHBOARD: (p) => p?.canViewDashboard ?? true,
  POPULATION: (p) => p?.canViewDashboard ?? true,
  LOCATIONS: (p) => p?.canViewDashboard ?? true,
  CHARTS: (p) => p?.canViewDashboard ?? true,
  // The register itself is read-only here; ProjectsView gates editing behind
  // canCreateProject/canApproveProjects and record scope.
  PROJECTS: (p) => p?.canViewDashboard ?? true,

  QUOTA: (p) => p?.canManageBudget ?? true,
  BUDGET_SOURCES: (p) => p?.canManageBudget ?? true,
  PRIORITIES: (p) => p?.canManagePriorities ?? true,
  CRISES_HARMS: (p) => p?.canManageCrises ?? true,
  DEPARTMENTS: (p) => p?.canEditDepartments ?? true,
  EXECUTORS: (p) => p?.canManageExecutors ?? true,
  CONTRACTORS: (p) => p?.canManageContractors ?? true,
  CREATE_PROJECT: (p) => p?.canCreateProject ?? true,
  ANALYSIS_SOURCES: (p) => p?.canApproveProjects ?? true,
  SETTINGS: (p) => p?.canManageBudget ?? true,

  // Admin-only page; auditors are admitted for its audit-trail sub-tab and
  // RolesAndAccessView keeps them there.
  ROLES_PERMISSIONS: (p, role) => role === 'SYSTEM_ADMIN' || (p?.canAuditLogs ?? false),
};

/** Page preference when a session's tab is off-limits: readable pages first,
 *  then the administrative ones, so a redirect always lands somewhere useful. */
const FALLBACK_ORDER = [
  'DASHBOARD',
  'PROJECTS',
  'POPULATION',
  'CHARTS',
  'LOCATIONS',
  'CREATE_PROJECT',
  'PRIORITIES',
  'CRISES_HARMS',
  'BUDGET_SOURCES',
  'QUOTA',
  'DEPARTMENTS',
  'EXECUTORS',
  'CONTRACTORS',
  'ANALYSIS_SOURCES',
  'SETTINGS',
  'ROLES_PERMISSIONS',
];

/** True when the effective permissions open `tab`. Unknown tabs are not
 *  destinations, so they are refused rather than rendered as a blank page. */
export function canAccessSection(
  tab: string,
  permissions: SystemRolePermission | undefined,
  role: UserRole,
): boolean {
  const gate = SECTION_GATES[tab];
  return gate ? gate(permissions, role) : false;
}

/** The first page this role may open, used when its current tab is denied. */
export function firstAccessibleSection(
  permissions: SystemRolePermission | undefined,
  role: UserRole,
): string {
  return FALLBACK_ORDER.find((tab) => canAccessSection(tab, permissions, role)) ?? 'DASHBOARD';
}
