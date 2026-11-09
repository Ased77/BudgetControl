import React from 'react';
import { Landmark, Lock } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { CulturalTaxonomyCoverage } from './CulturalTaxonomyCoverage';
import { CulturalTaxonomyDomains } from './CulturalTaxonomyDomains';
import { useAppContext } from '../context/AppContext';
import {
  CULTURAL_DOMAINS,
  CULTURAL_INDICATORS,
  CULTURAL_TAXONOMY_REVIEW_STATUS,
  CULTURAL_TAXONOMY_VERSION,
} from '../data/culturalTaxonomy';
import { toPersianDigits } from '../utils/numberUtils';

/** Standard actions belong to their domain, so they are counted once here. */
const CULTURAL_ACTION_COUNT = CULTURAL_DOMAINS.reduce(
  (total, domain) => total + domain.actions.length,
  0,
);

/**
 * Cultural taxonomy — the read-only reference section.
 *
 * The page states the shared vocabulary, derives its coverage banner and KPI
 * strip from the live priority list, and lists the twelve domains with their
 * indicators, standard actions, outcomes, budget classification and suggested
 * priority links. Coverage is the only live figure; the dataset is static and
 * `CT-xx` codes are the join key every other page stores, with titles as display
 * text only.
 *
 * Nothing here writes: no selector, mutation or automatic mapping may be added
 * to this view — assigning a domain to a priority or project happens on that
 * record's own form. Access is the `canViewDashboard` baseline for every role
 * (see `utils/sectionAccess`), so opening the page never grants a write.
 */
export const CulturalTaxonomyView: React.FC = () => {
  const { priorities, setActiveTab } = useAppContext();

  return (
    <div id="cultural-taxonomy-view" className="space-y-6">
      <PageHeader
        id="cultural-taxonomy-page-header"
        icon={Landmark}
        tone="text-amber-600 dark:text-amber-400"
        title="حوزه‌های فرهنگی"
        subtitle="نقشه مرجع حوزه‌های فرهنگی که نیازسنجی، اولویت‌ها، ثبت پروژه و گزارش‌ها به آن ارجاع می‌دهند."
      />

      <CulturalTaxonomyCoverage priorities={priorities} />

      <section
        id="cultural-taxonomy-summary"
        aria-labelledby="cultural-taxonomy-summary-title"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
      >
        <h2
          id="cultural-taxonomy-summary-title"
          className="text-sm font-black text-slate-900 dark:text-slate-100"
        >
          نقشه مرجع مشترک
        </h2>

        <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          این بخش واژگان مشترک بودجه فرهنگی است. هر حوزه یک کد پایدار{' '}
          <span dir="ltr" className="font-bold text-slate-700 dark:text-slate-200">
            CT-01
          </span>{' '}
          …{' '}
          <span dir="ltr" className="font-bold text-slate-700 dark:text-slate-200">
            CT-12
          </span>{' '}
          دارد که کلید اتصال نیازها، اولویت‌ها و پروژه‌هاست؛ عنوان‌های فارسی فقط متن نمایشی‌اند و
          تغییرشان کد را جابه‌جا نمی‌کند.
        </p>

        <p
          id="cultural-taxonomy-reference-size"
          className="mt-3 text-[11px] font-black text-slate-700 dark:text-slate-200"
        >
          {toPersianDigits(CULTURAL_DOMAINS.length)} حوزه ·{' '}
          {toPersianDigits(CULTURAL_INDICATORS.length)} شاخص ·{' '}
          {toPersianDigits(CULTURAL_ACTION_COUNT)} اقدام استاندارد
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3.5 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span id="cultural-taxonomy-version">
            نسخه{' '}
            <bdi className="text-slate-800 dark:text-slate-200">{CULTURAL_TAXONOMY_VERSION}</bdi>
          </span>
          <span id="cultural-taxonomy-review-status">
            وضعیت بازبینی:{' '}
            <bdi className="text-slate-800 dark:text-slate-200">
              {CULTURAL_TAXONOMY_REVIEW_STATUS}
            </bdi>
          </span>
          <span
            id="cultural-taxonomy-read-only"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            فقط‌خواندنی — بدون عملیات نوشتن
          </span>
        </div>
      </section>

      <CulturalTaxonomyDomains
        priorities={priorities}
        onOpenPriorities={() => setActiveTab('PRIORITIES')}
      />
    </div>
  );
};
