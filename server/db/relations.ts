/* =========================================================================
   Drizzle relations — the declarative graph used by the relational query
   API (`db.query.projects.findMany({ with: { department: true } })`).

   The repositories use explicit select/leftJoin statements for
   performance-critical listing (one round trip, custom DTO shapes) — these
   declarations are the machine-checked source of truth for *how* the
   entities connect, and they make the N+1-safe `with:` eager loading
   available anywhere else in the codebase.
   ========================================================================= */

import { relations } from 'drizzle-orm';
import {
  analysisSources,
  auditLogs,
  budgetSources,
  contractors,
  crisesHarms,
  departments,
  executors,
  locationIndicators,
  locations,
  priorities,
  projectContributions,
  projects,
  rolesPermissions,
  users,
} from './schema.js';

export const locationsRelations = relations(locations, ({ one, many }) => ({
  /** 1:1 — the deprivation indicators owned by this location. */
  indicators: one(locationIndicators, {
    fields: [locations.id],
    references: [locationIndicators.locationId],
  }),
  usersScoped: many(users),
}));

export const locationIndicatorsRelations = relations(locationIndicators, ({ one }) => ({
  location: one(locations, {
    fields: [locationIndicators.locationId],
    references: [locations.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  /** 1:N — projects this department ultimately owns. */
  ownedProjects: many(projects),
  /** 1:N — staff members assigned to the department. */
  users: many(users),
  /** 1:N — contribution rows in the projects ↔ departments junction. */
  contributions: many(projectContributions),
  requestingFor: many(projects),
}));

export const prioritiesRelations = relations(priorities, ({ many }) => ({
  projects: many(projects),
}));

export const budgetSourcesRelations = relations(budgetSources, ({ many }) => ({
  projects: many(projects),
}));

export const crisesHarmsRelations = relations(crisesHarms, ({ many }) => ({
  projects: many(projects),
}));

export const executorsRelations = relations(executors, ({ many }) => ({
  projects: many(projects),
}));

export const contractorsRelations = relations(contractors, ({ many }) => ({
  projects: many(projects),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  /** N:1 — the department a user belongs to (nullable). */
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  allowedLocation: one(locations, {
    fields: [users.allowedLocationId],
    references: [locations.id],
  }),
  /** 1:N — projects this user created (the OFFICE_HEAD "own records" scope). */
  createdProjects: many(projects),
}));

export const projectContributionsRelations = relations(projectContributions, ({ one }) => ({
  project: one(projects, {
    fields: [projectContributions.projectId],
    references: [projects.id],
  }),
  department: one(departments, {
    fields: [projectContributions.departmentId],
    references: [departments.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  priority: one(priorities, { fields: [projects.priorityId], references: [priorities.id] }),
  department: one(departments, { fields: [projects.departmentId], references: [departments.id] }),
  requestingDepartment: one(departments, {
    fields: [projects.requestingDepartmentId],
    references: [departments.id],
  }),
  budgetSource: one(budgetSources, { fields: [projects.budgetSourceId], references: [budgetSources.id] }),
  executor: one(executors, { fields: [projects.executorId], references: [executors.id] }),
  contractor: one(contractors, { fields: [projects.contractorId], references: [contractors.id] }),
  crisisHarm: one(crisesHarms, { fields: [projects.crisisHarmId], references: [crisesHarms.id] }),
  createdByUser: one(users, { fields: [projects.createdByUserId], references: [users.id] }),
  /** N:M, with attributes (share %, amount, role) — see project_contributions. */
  contributions: many(projectContributions),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({}));

export const analysisSourcesRelations = relations(analysisSources, ({ one }) => ({}));

export const rolesPermissionsRelations = relations(rolesPermissions, ({}) => ({}));
