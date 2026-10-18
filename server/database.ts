/* =========================================================================
   The legacy accessor surface, now a thin FACADE over repositories.

   Every function here keeps its historical name, signature and answer
   shape, so `server/app.ts` (the API routes), `server.ts` (bootstrap) and
   the CLI scripts continue to work byte-for-byte. Internally each one
   delegates to `server/db/repositories/*` — the layer where SQL now lives.

   Concurrently, this file shrank from 853 lines of SQL to pure
   delegation: the data-access boundary is `server/db`, and routes are
   expected to import repositories directly in new code (see
   server/db/README.md). This facade is the compatibility seam, not the
   destination.

   `initializeDatabase` runs migrations → seed-if-empty → idempotent
   repairs, carried over from the old boot contract. Seeding happens only
   on a fresh (empty) database; migrated legacy bases keep their data.
   ========================================================================= */

import type { ExecutiveProject } from '../src/types.js';
import {
  checkDatabase,
  closePool,
  getDatabaseTarget,
  getPoolStats,
  waitForDatabase,
} from './db/client.js';
import { initializeDatabase } from './db/initialize.js';
import * as organizationRepository from './db/repositories/organization.repository.js';
import * as locationsRepository from './db/repositories/location.repository.js';
import * as prioritiesRepository from './db/repositories/priority.repository.js';
import * as projectRepository from './db/repositories/project.repository.js';
import * as lookupRepository from './db/repositories/lookup.repository.js';
import * as usersRepository from './db/repositories/user.repository.js';
import * as auditLogRepository from './db/repositories/audit-log.repository.js';
import * as analysisSourceRepository from './db/repositories/analysis-source.repository.js';

export {
  checkDatabase,
  closePool,
  getDatabaseTarget,
  getPoolStats,
  waitForDatabase,
  initializeDatabase,
};

// --- Organization -----------------------------------------------------------

export const getOrganization = organizationRepository.getOrganization;
export const saveOrganization = organizationRepository.saveOrganization;

// --- Locations --------------------------------------------------------------

export const listLocations = locationsRepository.listLocations;
export const getLocation = locationsRepository.getLocation;
export const upsertLocation = locationsRepository.upsertLocation;

// --- Priorities -------------------------------------------------------------

export const listPriorities = prioritiesRepository.listPriorities;
export const getPriority = prioritiesRepository.getPriority;
export const upsertPriority = prioritiesRepository.upsertPriority;
export const deletePriority = prioritiesRepository.deletePriority;
export const replaceAllPriorities = prioritiesRepository.replaceAllPriorities;

// --- Projects ---------------------------------------------------------------

export const listProjects = projectRepository.listProjects;
export const getProject = projectRepository.getProject;
export const upsertProject = projectRepository.upsertProject;
export const deleteProject = projectRepository.deleteProject;
export const updateProjectStatus = (
  id: string,
  status: ExecutiveProject['status'],
): Promise<ExecutiveProject | undefined> => projectRepository.updateProjectStatus(id, status);

/**
 * The SQL-side filtered page the legacy layer could not serve (it loaded
 * every row and filtered in JavaScript). New dashboard endpoints should
 * build on this instead of listProjects().
 */
export const listProjectsPage = projectRepository.listProjectsPage;
export const countProjectsByStatus = projectRepository.countProjectsByStatus;

// --- Departments ------------------------------------------------------------

export const listDepartments = lookupRepository.listDepartments;
export const upsertDepartment = lookupRepository.upsertDepartment;
export const deleteDepartment = lookupRepository.deleteDepartment;

// --- Budget Sources ---------------------------------------------------------

export const listBudgetSources = lookupRepository.listBudgetSources;
export const upsertBudgetSource = lookupRepository.upsertBudgetSource;
export const deleteBudgetSource = lookupRepository.deleteBudgetSource;

// --- Crises & Harms ---------------------------------------------------------

export const listCrisesHarms = lookupRepository.listCrisesHarms;
export const upsertCrisisHarm = lookupRepository.upsertCrisisHarm;
export const deleteCrisisHarm = lookupRepository.deleteCrisisHarm;

// --- Executors --------------------------------------------------------------

export const listExecutors = lookupRepository.listExecutors;
export const upsertExecutor = lookupRepository.upsertExecutor;
export const deleteExecutor = lookupRepository.deleteExecutor;

// --- Contractors ------------------------------------------------------------

export const listContractors = lookupRepository.listContractors;
export const upsertContractor = lookupRepository.upsertContractor;
export const deleteContractor = lookupRepository.deleteContractor;

// --- Users & Roles ----------------------------------------------------------

export const listUsers = usersRepository.listUsers;
export const upsertUser = usersRepository.upsertUser;
export const listRolesPermissions = usersRepository.listRolesPermissions;
export const upsertRole = usersRepository.upsertRole;

// --- Audit Logs -------------------------------------------------------------

export const listAuditLogs = auditLogRepository.listAuditLogs;
export const addAuditLog = auditLogRepository.addAuditLog;
export const pageAuditLogs = auditLogRepository.pageAuditLogs;

// --- Analysis Sources -------------------------------------------------------

export const listAnalysisSources = analysisSourceRepository.listAnalysisSources;
export const upsertAnalysisSource = analysisSourceRepository.upsertAnalysisSource;
export const deleteAnalysisSource = analysisSourceRepository.deleteAnalysisSource;
