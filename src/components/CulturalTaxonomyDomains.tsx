import React from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import type { CsrPriority } from '../types';
import {
  CULTURAL_DELIVERY_MODE_LABELS,
  CULTURAL_DOMAINS,
  CULTURAL_FAMILY_LABELS,
  CULTURAL_INDICATORS_BY_ID,
  type CulturalDomain,
} from '../data/culturalTaxonomy';
import { toPersianDigits } from '../utils/numberUtils';

const DIRECTION_LABELS: Record<'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER', string> = {
  HIGHER_IS_BETTER: 'بالاتر بهتر',
  LOWER_IS_BETTER: 'پایین‌تر بهتر',
};

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

/**
 * The twelve domain cards. One card is open at a time, which keeps a long
 * reference page readable; the open state is local to this section and nothing
 * is persisted, because a card is a view of static reference data.
 */
export const CulturalTaxonomyDomains: React.FC<{
  priorities: CsrPriority[];
  onOpenPriorities: () => void;
}> = ({ priorities, onOpenPriorities }) => {
  const [expandedCode, setExpandedCode] = React.useState<string | null>(null);
  const prioritiesById = React.useMemo(
    () => new Map(priorities.map((priority) => [priority.id, priority])),
    [priorities],
  );

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
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
          {toPersianDigits(CULTURAL_DOMAINS.length)} حوزه
        </span>
      </div>

      <ul className="mt-3 grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CULTURAL_DOMAINS.map((domain) => (
          <li key={domain.code}>
            <CulturalTaxonomyDomainCard
              domain={domain}
              expanded={expandedCode === domain.code}
              onToggle={() =>
                setExpandedCode((current) => (current === domain.code ? null : domain.code))
              }
              prioritiesById={prioritiesById}
              onOpenPriorities={onOpenPriorities}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};
