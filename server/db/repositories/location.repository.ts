/* =========================================================================
   Location repository — provinces/counties/districts/villages with their
   deprivation indicators (the one-to-one companion table) restored into
   the flat LocationData DTO the API serves.
   ========================================================================= */

import { asc, eq } from 'drizzle-orm';
import type { AdministrativeLevel, LocationData, LocalIndicators } from '../../../src/types.js';
import { withDbErrorMapping } from '../errors.js';
import { db, type DrizzleDb, type Tx } from '../client.js';
import { locationIndicators, locations } from '../schema.js';
import type { LocationRow } from '../schema.js';

type LocationExecutor = DrizzleDb | Tx;

/** Restore the nested indicator object from its 1:1 table (or absence). */
function toDto(row: LocationRow, indicators: LocalIndicators | undefined): LocationData {
  return {
    id: row.id,
    level: row.level as AdministrativeLevel,
    province: row.province,
    county: row.county,
    city: row.city,
    district: row.district,
    population: row.population,
    indicators,
    coordinates:
      row.coordinatesLat !== null && row.coordinatesLng !== null
        ? { lat: row.coordinatesLat, lng: row.coordinatesLng }
        : undefined,
  };
}

const SELECTION = {
  location: locations,
  indicators: locationIndicators,
};

/** Left join keeps indicator-less rows — they are legal in the DTO. */
function composeRow(joined: { location: LocationRow | null; indicators: typeof locationIndicators.$inferSelect | null } | undefined): LocationData | undefined {
  const { location, indicators } = joined ?? {};
  if (!location) return undefined;
  return toDto(location, indicators === null ? undefined : indicators);
}

export async function listLocations(): Promise<LocationData[]> {
  return withDbErrorMapping(async () => {
    const rows = await db
      .select(SELECTION)
      .from(locations)
      .leftJoin(locationIndicators, eq(locationIndicators.locationId, locations.id))
      .orderBy(asc(locations.id));
    return rows.flatMap((row) => {
      const dto = composeRow(row);
      return dto ? [dto] : [];
    });
  });
}

export async function getLocation(id: string): Promise<LocationData | undefined> {
  return withDbErrorMapping(async () => {
    const [row] = await db
      .select(SELECTION)
      .from(locations)
      .leftJoin(locationIndicators, eq(locationIndicators.locationId, locations.id))
      .where(eq(locations.id, id))
      .limit(1);
    return composeRow(row);
  });
}

/**
 * Upsert a location and its indicators in one transaction — the indicator
 * row is the owned half of the 1:1, so it is replaced together with its
 * parent. `onConflictDoUpdate` buys idempotence for fix-up scripts.
 */
export async function upsertLocation(loc: LocationData, executor: LocationExecutor = db): Promise<void> {
  return withDbErrorMapping(() => insertLocationWithIndicators(loc, executor));
}

async function insertLocationWithIndicators(loc: LocationData, executor: LocationExecutor): Promise<void> {
  await executor.transaction(async (tx) => {
    const locationValues = {
      id: loc.id,
      level: loc.level,
      province: loc.province,
      county: loc.county,
      city: loc.city,
      district: loc.district,
      population: Math.round(Number(loc.population)) || 0,
      coordinatesLat: loc.coordinates?.lat ?? null,
      coordinatesLng: loc.coordinates?.lng ?? null,
    };
    await tx.insert(locations).values(locationValues).onConflictDoUpdate({
      target: locations.id,
      set: locationValues,
    });

    if (loc.indicators) {
      const indicatorValues = {
        locationId: loc.id,
        povertyRate: loc.indicators.povertyRate,
        marginalizationRate: loc.indicators.marginalizationRate,
        unemploymentRate: loc.indicators.unemploymentRate,
        socialHarmsIndex: loc.indicators.socialHarmsIndex,
        vulnerableGroupsPopulation: Math.round(Number(loc.indicators.vulnerableGroupsPopulation)) || 0,
        infrastructureDeficit: loc.indicators.infrastructureDeficit,
        crisisVulnerabilityScore: loc.indicators.crisisVulnerabilityScore,
        healthAccessDeficit: loc.indicators.healthAccessDeficit,
        educationDropOutRate: loc.indicators.educationDropOutRate,
        culturalDeficitScore: loc.indicators.culturalDeficitScore,
        environmentalRiskScore: loc.indicators.environmentalRiskScore,
      };
      await tx.insert(locationIndicators).values(indicatorValues).onConflictDoUpdate({
        target: locationIndicators.locationId,
        set: indicatorValues,
      });
    } else {
      await tx.delete(locationIndicators).where(eq(locationIndicators.locationId, loc.id));
    }
  });
}
