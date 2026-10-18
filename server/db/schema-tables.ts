/* The table registry for operational tooling (order = FK-safe parents first).
   Kept out of the drizzle schema module so `bun run db:generate` never
   considers tooling-only exports part of the schema. */

export const TABLE_NAMES = [
  'organization',
  'locations',
  'location_indicators',
  'priorities',
  'departments',
  'budget_sources',
  'crises_harms',
  'executors',
  'contractors',
  'users',
  'roles_permissions',
  'projects',
  'project_contributions',
  'audit_logs',
  'analysis_sources',
  'app_meta',
] as const;
