/* =========================================================================
   Public surface of the data-access layer.

   Business logic (and new code generally) imports from `server/db`:
     import { projectsRepository } from './db/index.js';

   The historical accessor surface (server/database.ts) delegates here —
   routes keep working unchanged while they migrate repo-by-repo.
   ========================================================================= */

export * from './client.js';
export * from './errors.js';
export * from './schema.js';
export * from './relations.js';
export * from './transactions.js';

export * as organizationRepository from './repositories/organization.repository.js';
export * as locationsRepository from './repositories/location.repository.js';
export * as prioritiesRepository from './repositories/priority.repository.js';
export * as projectRepository from './repositories/project.repository.js';
export * as projectLookupRepository from './repositories/lookup.repository.js';
export * as usersRepository from './repositories/user.repository.js';
export * as auditLogRepository from './repositories/audit-log.repository.js';
export * as analysisSourceRepository from './repositories/analysis-source.repository.js';
export * from './repositories/helpers.js';

export { initializeDatabase, legacyTablesRemaining } from './initialize.js';
