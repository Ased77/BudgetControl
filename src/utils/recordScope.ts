import { Contractor, ExecutiveProject, UserProfile, UserRole } from '../types';

/**
 * Record-level scoping for roles that own the records they create.
 *
 * Role permissions describe *what* a user may do (register a project, manage
 * contractors); they say nothing about *which rows* the user may see. «رئیس
 * اداره» is the first role that needs both: it registers projects, then works
 * with only those projects and the contractors assigned to them. Keeping the
 * rule here — instead of in each view — means the projects list and the
 * contractors list can never disagree about whose records are in scope.
 */
const SELF_SCOPED_PROJECT_ROLES: readonly UserRole[] = ['OFFICE_HEAD', 'PROJECT_MANAGER'];

/** Whether this role only sees the project records it created itself. */
export function hasOwnProjectScope(role: UserRole): boolean {
  return SELF_SCOPED_PROJECT_ROLES.includes(role);
}

/**
 * The projects a user may work with. Every other role keeps the full,
 * location-scoped portfolio the context already handed it.
 *
 * Records without a creator (imported or older than this field) are not
 * attributed to anyone, so they never appear in a personal list.
 */
export function projectsForUser(
  projects: ExecutiveProject[],
  user: Pick<UserProfile, 'id' | 'role'>
): ExecutiveProject[] {
  if (!hasOwnProjectScope(user.role)) return projects;
  return projects.filter((project) => project.createdByUserId === user.id);
}

/**
 * The contractors this user may work with: those assigned to at least one of
 * the projects in scope, plus the full list for every other role.
 *
 * Contractors are matched by the project's `contractorId`; a contractor with
 * no assignment never appears on a self-scoped user's list.
 */
export function contractorsForUser(
  contractors: Contractor[],
  projects: ExecutiveProject[],
  user: Pick<UserProfile, 'id' | 'role'>
): Contractor[] {
  if (!hasOwnProjectScope(user.role)) return contractors;
  const assignedIds = new Set(
    projectsForUser(projects, user)
      .map((project) => project.contractorId)
      .filter((id): id is string => Boolean(id))
  );
  return contractors.filter((contractor) => assignedIds.has(contractor.id));
}
