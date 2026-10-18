/* =========================================================================
   Organization repository — the single configured profile (1 row),
   stored flattened on typed columns instead of a JSON document.
   ========================================================================= */

import { eq } from 'drizzle-orm';
import type { OrganizationConfig } from '../../../src/types.js';
import { withDbErrorMapping } from '../errors.js';
import { db } from '../client.js';
import { organization } from '../schema.js';

/* Matches src/data/initialData.ts INITIAL_ORGANIZATION — returned on a fresh,
   empty database instead of failing (the legacy layer did the same). */
const DEFAULT_ID = 'org-national';

/** Read the organization row; empty database → built-in default. */
export async function getOrganization(): Promise<OrganizationConfig> {
  return withDbErrorMapping(async () => {
    const rows = await db.select().from(organization).limit(1);
    if (rows.length === 0) return { id: DEFAULT_ID, name: 'نظام ملی', orgType: 'GOVERNMENT', activitySector: '', province: '', city: '', county: '', district: '', totalBudget: 0, currencyUnit: 'TOMAN', budgetPeriod: '1_YEAR', fiscalYear: '', updatedAt: '' };
    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      orgType: row.orgType as OrganizationConfig['orgType'],
      activitySector: row.activitySector,
      nationalCode: row.nationalCode ?? undefined,
      province: row.province,
      city: row.city,
      county: row.county,
      district: row.district,
      totalBudget: row.totalBudget,
      currencyUnit: row.currencyUnit as OrganizationConfig['currencyUnit'],
      budgetPeriod: row.budgetPeriod as OrganizationConfig['budgetPeriod'],
      fiscalYear: row.fiscalYear,
      description: row.description ?? undefined,
      updatedAt: row.updatedAt,
    };
  });
}

/** Insert-or-replace the single organization row in one statement.
 *  `actorId` stamps `updated_by_user_id` with the verified operator. */
export async function saveOrganization(org: OrganizationConfig, actorId: string): Promise<void> {
  return withDbErrorMapping(async () => {
    const values = {
      id: org.id || DEFAULT_ID,
      name: org.name,
      orgType: org.orgType,
      activitySector: org.activitySector,
      nationalCode: org.nationalCode ?? null,
      province: org.province,
      city: org.city,
      county: org.county,
      district: org.district,
      totalBudget: Math.round(Number(org.totalBudget)) || 0,
      currencyUnit: org.currencyUnit,
      budgetPeriod: org.budgetPeriod,
      fiscalYear: org.fiscalYear,
      description: org.description ?? null,
      updatedAt: org.updatedAt,
      updatedByUserId: actorId,
    };
    await db
      .insert(organization)
      .values(values)
      .onConflictDoUpdate({ target: organization.id, set: values });
  });
}
