import React from 'react';
import { ChevronDown, ExternalLink, RotateCcw, Search } from 'lucide-react';
import type { CsrPriority } from '../types';
import {
  CULTURAL_DELIVERY_MODE_LABELS,
  CULTURAL_DOMAINS,
  CULTURAL_FAMILY_LABELS,
  CULTURAL_INDICATORS_BY_ID,
  type CulturalDomain,
  type CulturalIndicatorFamily,
} from '../data/culturalTaxonomy';
import { toPersianDigits } from '../utils/numberUtils';
import { computeTaxonomyCoverage } from '../utils/taxonomyCoverage';
import {
  EMPTY_TAXONOMY_FILTERS,
  filterCulturalDomains,
  isTaxonomyFilterActive,
  type TaxonomyFilterState,
} from '../utils/taxonomyFilters';

const DIRECTION_LABELS: Record<'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER', string> = {
  HIGHER_IS_BETTER: 'بالاتر بهتر',
  LOWER_IS_BETTER: 'پایین‌تر بهتر',
};

const FAMILY_ORDER = Object.keys(CULTURAL_FAMILY_LABELS) as CulturalIndicatorFamily[];

const CHIP_BASE =
  'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/45 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900';
const CHIP_OFF =
  'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60';
const CHIP_ON =
  'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200';

/**
 * One domain card. The whole header is the expand button, so the card has a
 * single focus stop when collapsed and the accessible name carries the code and
 * the title. Detail stays in the DOM only while expanded — it is a reference,
 * not hidden-but-focusable content.
 *
 * `expanded` and `onToggle` are controlled by the list so the card itself stays
 * a pure render, and the suggested priority links are handed the live priority
 * map: an id that no longer exists is shown as an unresolvable reference rather
 * than a dead link.
 */
export const CulturalTaxonomyDomainCard: React.FC<{
  domain: CulturalDomain;
  expanded: boolean;
  onToggle: () => void;
  prioritiesById: Map<string, CsrPriority>;
  onOpenPriorities: () => void;
}> = ({ domain, expanded, onToggle, prioritiesById, onOpenPriorities }) => {
  const triggerId = `cultural-taxonomy-domain-${domain.code}-trigger`;
  const detailId = `cultural-taxonomy-domain-${domain.code}-detail`;

  const indicatorRefs = domain.indicators
    .map((id) => CULTURAL_INDICATORS_BY_ID[id])
    .filter((indicator): indicator is NonNullable<typeof indicator> => Boolean(indicator));

  const suggestions = domain.relatedPriorityIds.map((id) => ({
    id,
    priority: prioritiesById.get(id),
  }));

  return (
    <article
      id={`cultural-taxonomy-domain-${domain.code}`}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900"
    >
      <h3 className="m-0">
        <button
          id={triggerId}
          type="button"
          onClick={onToggle}
          onKeyDown={(event) => {
            // Escape folds the card and leaves focus on this trigger, the same
            // control the pointer uses.
            if (event.key === 'Escape' && expanded) {
              event.stopPropagation();
              onToggle();
            }
          }}
          aria-expanded={expanded}
          aria-controls={detailId}
          className="flex w-full items-start gap-3 p-4 text-right transition-colors hover:bg-slate-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-slate-800/40 dark:focus-visible:ring-offset-slate-900"
        >
          <span
            dir="ltr"
            className="mt-0.5 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black tracking-wide text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300"
          >
            {domain.code}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-slate-900 dark:text-slate-100">
              {domain.title}
            </span>
            <span className="mt-0.5 block text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {domain.shortTitle} · {toPersianDigits(domain.indicators.length)} شاخص ·{' '}
              {toPersianDigits(domain.actions.length)} اقدام
            </span>
            <span className="mt-1.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {domain.description}
            </span>
          </span>

          <ChevronDown
            aria-hidden="true"
            className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>
      </h3>

      {expanded && (
        <div
          id={detailId}
          role="region"
          aria-labelledby={triggerId}
          className="space-y-4 border-t border-slate-100 px-4 py-3.5 dark:border-slate-800"
        >
          <section>
            <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-200">شاخص‌ها</h4>
            <ul className="mt-1.5 space-y-1.5">
              {indicatorRefs.map((indicator) => (
                <li key={indicator.id} className="text-[11px] leading-relaxed">
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {indicator.label}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400"> — {indicator.unit}</span>
                  <span className="text-slate-400 dark:text-slate-500">
                    {' '}
                    · {DIRECTION_LABELS[indicator.direction]} ·{' '}
                    {CULTURAL_FAMILY_LABELS[indicator.family]}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-200">
              اقدام‌های استاندارد
            </h4>
            <ul className="mt-1.5 space-y-2">
              {domain.actions.map((action) => (
                <li key={action.id} className="text-[11px] leading-relaxed">
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {action.title}
                  </span>
                  <span className="ms-1.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                    {CULTURAL_DELIVERY_MODE_LABELS[action.mode]}
                  </span>
                  <span className="mt-0.5 block text-slate-500 dark:text-slate-400">
                    {action.description}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-200">
              پیامدهای مورد انتظار
            </h4>
            <ul className="mt-1.5 space-y-1">
              {domain.outcomes.map((outcome) => (
                <li
                  key={outcome}
                  className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300"
                >
                  <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                  {outcome}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-200">
              طبقه‌بندی بودجه
            </h4>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              {domain.budgetClassification}
            </p>
          </section>

          <section>
            <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-200">
              پیوندهای پیشنهادی اولویت
            </h4>
            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
              پیشنهاد مرجع برای مطالعه؛ پوشش محسوب نمی‌شود.
            </p>

            {suggestions.length === 0 ? (
              <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                اولویت پیشنهادی برای این حوزه ثبت نشده است.
              </p>
            ) : (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {suggestions.map(({ id, priority }) => (
                  <li key={id}>
                    {priority ? (
                      <button
                        type="button"
                        onClick={onOpenPriorities}
                        title={`رفتن به اولویت «${priority.title}»`}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-800 transition-colors hover:border-sky-300 hover:bg-sky-100 focus:outline-none focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400/40 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-300"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{priority.title}</span>
                      </button>
                    ) : (
                      <span
                        title="این شناسه در اولویت‌های فعلی پیدا نشد"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-500"
                      >
                        <bdi dir="ltr">{id}</bdi>
                        <span>یافت نشد</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </article>
  );
};

/** Search field, five family filters, the uncovered filter and reset. */
export const CulturalTaxonomyFilterBar: React.FC<{
  filters: TaxonomyFilterState;
  onChange: (next: TaxonomyFilterState) => void;
  onReset: () => void;
  visibleCount: number;
  totalCount: number;
  active: boolean;
}> = ({ filters, onChange, onReset, visibleCount, totalCount, active }) => {
  const statusText =
    visibleCount === 0
      ? 'هیچ حوزه‌ای با این جستجو و فیلترها یافت نشد.'
      : active
        ? `${toPersianDigits(visibleCount)} از ${toPersianDigits(totalCount)} حوزه نمایش داده می‌شود.`
        : `${toPersianDigits(totalCount)} حوزه نمایش داده می‌شود.`;

  const toggleFamily = (family: CulturalIndicatorFamily) =>
    onChange({
      ...filters,
      families: filters.families.includes(family)
        ? filters.families.filter((current) => current !== family)
        : [...filters.families, family],
    });

  return (
    <div
      id="cultural-taxonomy-filters"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="cultural-taxonomy-search"
            className="block text-[11px] font-bold text-slate-600 dark:text-slate-300"
          >
            جستجوی حوزه
          </label>
          <div className="relative mt-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-400"
            />
            <input
              id="cultural-taxonomy-search"
              type="search"
              value={filters.query}
              onChange={(event) => onChange({ ...filters, query: event.target.value })}
              placeholder="کد، عنوان، شاخص یا اقدام…"
              aria-describedby="cultural-taxonomy-result-count"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 ps-9 pe-3 text-xs text-slate-800 shadow-2xs outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={!active}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/45 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          بازنشانی
        </button>
      </div>

      <div role="group" aria-labelledby="cultural-taxonomy-family-filter-label" className="mt-3">
        <span
          id="cultural-taxonomy-family-filter-label"
          className="block text-[11px] font-bold text-slate-600 dark:text-slate-300"
        >
          خانواده شاخص
        </span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {FAMILY_ORDER.map((family) => {
            const pressed = filters.families.includes(family);
            return (
              <button
                key={family}
                type="button"
                aria-pressed={pressed}
                onClick={() => toggleFamily(family)}
                className={`${CHIP_BASE} ${pressed ? CHIP_ON : CHIP_OFF}`}
              >
                {CULTURAL_FAMILY_LABELS[family]}
              </button>
            );
          })}

          <button
            type="button"
            aria-pressed={filters.uncoveredOnly}
            onClick={() => onChange({ ...filters, uncoveredOnly: !filters.uncoveredOnly })}
            className={`${CHIP_BASE} ${filters.uncoveredOnly ? CHIP_ON : CHIP_OFF}`}
          >
            فقط حوزه‌های بدون پوشش
          </button>
        </div>
      </div>

      <p
        id="cultural-taxonomy-result-count"
        role="status"
        aria-live="polite"
        className="mt-3 text-[11px] font-bold text-slate-500 dark:text-slate-400"
      >
        {statusText}
      </p>
    </div>
  );
};

/** Explicit empty state — announced through the filter bar's live region too. */
export const CulturalTaxonomyEmptyState: React.FC<{ onReset: () => void }> = ({ onReset }) => (
  <div
    id="cultural-taxonomy-empty-state"
    className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center dark:border-slate-700 dark:bg-slate-950/30"
  >
    <Search aria-hidden="true" className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
    <h3 className="mt-3 text-sm font-black text-slate-800 dark:text-slate-100">
      نتیجه‌ای یافت نشد
    </h3>
    <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
      هیچ حوزه‌ای با جستجو یا فیلترهای فعلی هم‌خوانی ندارد. عبارت کوتاه‌تری را جستجو کنید یا
      فیلترها را بازنشانی کنید.
    </p>
    <button
      type="button"
      onClick={onReset}
      className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/45 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60"
    >
      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
      بازنشانی جستجو و فیلترها
    </button>
  </div>
);

/**
 * The twelve domain cards with their search and filters.
 *
 * One card is open at a time, and the open state is local and never persisted.
 * Coverage comes from the same helper the banner uses, so "uncovered" cannot
 * drift from the KPI strip.
 */
export const CulturalTaxonomyDomains: React.FC<{
  priorities: CsrPriority[];
  onOpenPriorities: () => void;
}> = ({ priorities, onOpenPriorities }) => {
  const [filters, setFilters] = React.useState<TaxonomyFilterState>(EMPTY_TAXONOMY_FILTERS);
  const [expandedCode, setExpandedCode] = React.useState<string | null>(null);

  const prioritiesById = React.useMemo(
    () => new Map(priorities.map((priority) => [priority.id, priority])),
    [priorities],
  );
  const uncoveredCodes = React.useMemo(
    () => new Set(computeTaxonomyCoverage(priorities).uncoveredDomainCodes),
    [priorities],
  );
  const visibleDomains = React.useMemo(
    () => filterCulturalDomains(CULTURAL_DOMAINS, filters, uncoveredCodes),
    [filters, uncoveredCodes],
  );

  const active = isTaxonomyFilterActive(filters);
  const reset = () => setFilters(EMPTY_TAXONOMY_FILTERS);
  const visibleExpandedCode = visibleDomains.some((domain) => domain.code === expandedCode)
    ? expandedCode
    : null;

  return (
    <section id="cultural-taxonomy-domains" aria-labelledby="cultural-taxonomy-domains-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="cultural-taxonomy-domains-title"
            className="text-sm font-black text-slate-900 dark:text-slate-100"
          >
            حوزه‌های مرجع
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            هر کارت یک حوزه را با شاخص‌ها، اقدام‌های استاندارد، پیامدها و طبقه‌بندی بودجه آن
            باز می‌کند.
          </p>
        </div>
      </div>

      <div className="mt-3">
        <CulturalTaxonomyFilterBar
          filters={filters}
          onChange={setFilters}
          onReset={reset}
          visibleCount={visibleDomains.length}
          totalCount={CULTURAL_DOMAINS.length}
          active={active}
        />
      </div>

      <div className="mt-3">
        {visibleDomains.length === 0 ? (
          <CulturalTaxonomyEmptyState onReset={reset} />
        ) : (
          <ul className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleDomains.map((domain) => (
              <li key={domain.code}>
                <CulturalTaxonomyDomainCard
                  domain={domain}
                  expanded={visibleExpandedCode === domain.code}
                  onToggle={() =>
                    setExpandedCode((current) => (current === domain.code ? null : domain.code))
                  }
                  prioritiesById={prioritiesById}
                  onOpenPriorities={onOpenPriorities}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
