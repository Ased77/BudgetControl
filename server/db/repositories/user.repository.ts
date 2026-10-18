/* =========================================================================
   Users & role-permission repositories.

   Users carry FK references (departmentId, allowedLocationId) so a person
   can be scoped to both an agency and a location; the roles table is the
   flattened access matrix keyed by the role enum.
   ========================================================================= */

import { asc, eq } from 'drizzle-orm';
import type { SystemRolePermission, UserProfile, UserRole } from '../../../src/types.js';
import { withDbErrorMapping } from '../errors.js';
import { db, type DrizzleDb, type Tx } from '../client.js';
import { rolesPermissions, users } from '../schema.js';

type Executor = DrizzleDb | Tx;

export async function listUsers(): Promise<UserProfile[]> {
  return withDbErrorMapping(async () => {
    const rows = await db.select().from(users).orderBy(asc(users.id));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role as UserRole,
      roleFa: row.roleFa,
      roleTitleFa: row.roleTitleFa,
      avatar: row.avatar,
      organization: row.organization,
      departmentId: row.departmentId ?? undefined,
      allowedLocationId: row.allowedLocationId ?? undefined,
      province: row.province ?? undefined,
      county: row.county ?? undefined,
    }));
  });
}

function userToRow(u: UserProfile): typeof users.$inferInsert {
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    roleFa: u.roleFa,
    roleTitleFa: u.roleTitleFa,
    avatar: u.avatar,
    organization: u.organization,
    departmentId: u.departmentId ?? null,
    allowedLocationId: u.allowedLocationId ?? null,
    province: u.province ?? null,
    county: u.county ?? null,
  };
}

export async function upsertUser(u: UserProfile, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    const row = userToRow(u);
    await executor.insert(users).values(row).onConflictDoUpdate({ target: users.id, set: row });
  });
}

export async function listRolesPermissions(): Promise<SystemRolePermission[]> {
  return withDbErrorMapping(async () => {
    const rows = await db.select().from(rolesPermissions).orderBy(asc(rolesPermissions.role));
    return rows.map((row) => ({
      role: row.role as UserRole,
      roleTitleFa: row.roleTitleFa,
      description: row.description,
      canViewDashboard: row.canViewDashboard,
      canEditDepartments: row.canEditDepartments,
      canManageBudget: row.canManageBudget,
      canManageCrises: row.canManageCrises,
      canManagePriorities: row.canManagePriorities,
      canCreateProject: row.canCreateProject,
      canApproveProjects: row.canApproveProjects,
      canManageExecutors: row.canManageExecutors,
      canManageContractors: row.canManageContractors,
      canExportReports: row.canExportReports,
      canAuditLogs: row.canAuditLogs,
      scopeLevel: row.scopeLevel as SystemRolePermission['scopeLevel'],
    }));
  });
}

export async function upsertRole(r: SystemRolePermission, executor: Executor = db): Promise<void> {
  return withDbErrorMapping(async () => {
    const row: typeof rolesPermissions.$inferInsert = {
      role: r.role,
      roleTitleFa: r.roleTitleFa,
      description: r.description,
      canViewDashboard: r.canViewDashboard ?? true,
      canEditDepartments: r.canEditDepartments ?? false,
      canManageBudget: r.canManageBudget ?? false,
      canManageCrises: r.canManageCrises ?? false,
      canManagePriorities: r.canManagePriorities ?? false,
      canCreateProject: r.canCreateProject ?? false,
      canApproveProjects: r.canApproveProjects ?? false,
      canManageExecutors: r.canManageExecutors ?? false,
      canManageContractors: r.canManageContractors ?? false,
      canExportReports: r.canExportReports ?? false,
      canAuditLogs: r.canAuditLogs ?? false,
      scopeLevel: r.scopeLevel,
    };
    await executor.insert(rolesPermissions).values(row).onConflictDoUpdate({ target: rolesPermissions.role, set: row });
  });
}
