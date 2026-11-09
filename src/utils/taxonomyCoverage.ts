/* =========================================================================
   Taxonomy coverage — how much of the cultural taxonomy live priorities cover.

   The single rule (E0-TAX-7 in docs/BACKLOG.md): a domain counts as covered only
   when at least one priority carries that domain's `CT-xx` code in its
   `taxonomyDomainId`. Nothing else counts — not a title, not a category, and not
   the static `relatedPriorityIds` suggestions that the reference map carries.

   The DTO field is optional and may be absent entirely (a build or an API
   response that predates it), so the mapping is read defensively: anything that
   is not a known code means "not mapped". This module is read-only — it inspects
   the records it is handed and returns a summary; it never assigns, repairs or
   persists a classification.
   ========================================================================= */
import { CULTURAL_DOMAINS, CULTURAL_DOMAINS_BY_CODE } from '../data/culturalTaxonomy';
import type { CsrPriority } from '../types';

export interface TaxonomyCoverage {
  /** Domains in the reference map (12 today). */
  totalDomains: number;
  /** Codes with at least one explicit priority mapping, in map order. */
  coveredDomainCodes: string[];
  /** Codes with no explicit mapping, in map order. */
  uncoveredDomainCodes: string[];
  coveredCount: number;
  uncoveredCount: number;
  /** Whole-percent coverage for the progressbar and the KPI strip. */
  percent: number;
  /** Priorities carrying a valid code; one priority counts once. */
  mappedPriorityCount: number;
  totalPriorityCount: number;
}

/** The explicit mapping a priority carries, or `null` when it carries none.
 *  Absent, blank, non-string and unknown-code values all mean "not mapped";
 *  trimming is tolerated because the code itself is the join key. */
export function readTaxonomyDomainCode(
  priority: Pick<CsrPriority, 'id'> | null | undefined,
): string | null {
  const raw = (priority as { taxonomyDomainId?: unknown } | null | undefined)?.taxonomyDomainId;
  if (typeof raw !== 'string') return null;
  const code = raw.trim();
  if (!code) return null;
  return CULTURAL_DOMAINS_BY_CODE[code] ? code : null;
}

/** Coverage summary for the current priority list. */
export function computeTaxonomyCoverage(
  priorities: readonly (Pick<CsrPriority, 'id'> | null | undefined)[],
): TaxonomyCoverage {
  const mappedCodes = new Set<string>();
  let mappedPriorityCount = 0;

  for (const priority of priorities) {
    const code = readTaxonomyDomainCode(priority);
    if (!code) continue;
    mappedPriorityCount += 1;
    mappedCodes.add(code);
  }

  const totalDomains = CULTURAL_DOMAINS.length;
  const coveredDomainCodes = CULTURAL_DOMAINS.filter((domain) => mappedCodes.has(domain.code)).map(
    (domain) => domain.code,
  );
  const uncoveredDomainCodes = CULTURAL_DOMAINS.filter(
    (domain) => !mappedCodes.has(domain.code),
  ).map((domain) => domain.code);

  return {
    totalDomains,
    coveredDomainCodes,
    uncoveredDomainCodes,
    coveredCount: coveredDomainCodes.length,
    uncoveredCount: uncoveredDomainCodes.length,
    percent: totalDomains === 0 ? 0 : Math.round((coveredDomainCodes.length / totalDomains) * 100),
    mappedPriorityCount,
    totalPriorityCount: priorities.length,
  };
}
