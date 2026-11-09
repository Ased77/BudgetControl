/* =========================================================================
   Taxonomy filters — text search and reference filters for the domain cards.

   Pure functions only: the page owns the filter state, this module decides
   whether a domain matches it. Search is tolerant of the Persian/Arabic
   orthographic variants and of the zero-width non-joiner people type instead of
   a space, because the same word reaches the box in several shapes.

   Nothing here reads coverage from the reference map's suggestions — the
   "uncovered" filter is given the codes the coverage calculation produced, so
   the two features cannot disagree.
   ========================================================================= */
import {
  CULTURAL_INDICATORS_BY_ID,
  type CulturalDomain,
  type CulturalIndicatorFamily,
} from '../data/culturalTaxonomy';

export interface TaxonomyFilterState {
  /** Free text over code, titles, description, keywords, outcomes, indicators and actions. */
  query: string;
  /** Selected indicator families; an empty list means "every family". */
  families: CulturalIndicatorFamily[];
  /** Keep only domains with no explicit priority mapping. */
  uncoveredOnly: boolean;
}

export const EMPTY_TAXONOMY_FILTERS: TaxonomyFilterState = {
  query: '',
  families: [],
  uncoveredOnly: false,
};

/** Comparison form: Persian letters, no ZWNJ, no harakat, single spaces. */
export function normalizeTaxonomyText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u064A\u0649]/g, '\u06CC') // Arabic yeh/alef maksura → Persian yeh
    .replace(/\u0643/g, '\u06A9') // Arabic kaf → Persian kaf
    .replace(/[\u200B-\u200D\uFEFF]/g, ' ') // ZWNJ/ZWJ/BOM act as a word break
    .replace(/[\u064B-\u0652\u0670]/g, '') // harakat
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** True when the operator has narrowed the list in any way. */
export function isTaxonomyFilterActive(filters: TaxonomyFilterState): boolean {
  return (
    normalizeTaxonomyText(filters.query).length > 0 ||
    filters.families.length > 0 ||
    filters.uncoveredOnly
  );
}

function domainHaystack(domain: CulturalDomain): string {
  const indicatorTerms: string[] = [];
  for (const id of domain.indicators) {
    const indicator = CULTURAL_INDICATORS_BY_ID[id];
    if (!indicator) continue;
    indicatorTerms.push(indicator.label, indicator.unit);
  }

  return normalizeTaxonomyText(
    [
      domain.code,
      domain.title,
      domain.shortTitle,
      domain.description,
      ...domain.keywords,
      ...domain.outcomes,
      ...indicatorTerms,
      ...domain.actions.map((action) => action.title),
      ...domain.actions.map((action) => action.description),
    ].join(' '),
  );
}

/** Every whitespace-separated term must appear; families are a union. */
export function matchesTaxonomyFilters(
  domain: CulturalDomain,
  filters: TaxonomyFilterState,
  uncoveredCodes: ReadonlySet<string>,
): boolean {
  if (filters.uncoveredOnly && !uncoveredCodes.has(domain.code)) return false;

  if (filters.families.length > 0) {
    const domainFamilies = new Set<CulturalIndicatorFamily>();
    for (const id of domain.indicators) {
      const indicator = CULTURAL_INDICATORS_BY_ID[id];
      if (indicator) domainFamilies.add(indicator.family);
    }
    if (!filters.families.some((family) => domainFamilies.has(family))) return false;
  }

  const query = normalizeTaxonomyText(filters.query);
  if (!query) return true;

  const haystack = domainHaystack(domain);
  return query.split(' ').every((term) => haystack.includes(term));
}

export function filterCulturalDomains(
  domains: readonly CulturalDomain[],
  filters: TaxonomyFilterState,
  uncoveredCodes: ReadonlySet<string>,
): CulturalDomain[] {
  return domains.filter((domain) => matchesTaxonomyFilters(domain, filters, uncoveredCodes));
}
