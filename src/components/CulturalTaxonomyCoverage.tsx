import React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { CsrPriority } from '../types';
import { computeTaxonomyCoverage, type TaxonomyCoverage } from '../utils/taxonomyCoverage';
import { toPersianDigits } from '../utils/numberUtils';

/** The rule every state repeats: only an explicit mapping counts. */
const COVERAGE_RULE =
  'پوشش فقط از نگاشت صریح کد حوزه در اولویت‌ها محاسبه می‌شود؛ پیوندهای پیشنهادی نقشه مرجع پوشش محسوب نمی‌شوند و این صفحه هیچ نگاشتی ایجاد یا تغییر نمی‌دهد.';

type CoverageState = 'none' | 'partial' | 'full';

interface BannerTone {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  section: string;
  iconWrap: string;
}

const BANNERS: Record<CoverageState, BannerTone> = {
  none: {
    icon: AlertTriangle,
    title: 'هیچ اولویتی به حوزه‌های فرهنگی نگاشت نشده است',
    section:
      'border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200',
    iconWrap: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  },
  partial: {
    icon: Info,
    title: 'پوشش فعلی حوزه‌های فرهنگی',
    section:
      'border-sky-200 bg-sky-50/80 text-sky-900 dark:border-sky-800/70 dark:bg-sky-950/30 dark:text-sky-200',
    iconWrap: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  },
  full: {
    icon: CheckCircle2,
    title: 'همه حوزه‌های فرهنگی پوشش دارند',
    section:
      'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-200',
    iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
};

function coverageState(coverage: TaxonomyCoverage): CoverageState {
  if (coverage.coveredCount === 0) return 'none';
  if (coverage.coveredCount === coverage.totalDomains) return 'full';
  return 'partial';
}

/**
 * Coverage banner and KPI strip for the cultural taxonomy page.
 *
 * Both read the live priority list and nothing else: the reference map's
 * suggested links (`relatedPriorityIds`) never contribute, so the figures cannot
 * overstate coverage. The strip is presentational — no control, no write — and
 * the banner carries the progressbar so the count is announced as a value, not
 * only drawn.
 */
export const CulturalTaxonomyCoverage: React.FC<{ priorities: CsrPriority[] }> = ({
  priorities,
}) => {
  const coverage = computeTaxonomyCoverage(priorities);
  const tone = BANNERS[coverageState(coverage)];
  const Icon = tone.icon;

  const kpiItems = [
    {
      id: 'percent',
      label: 'درصد پوشش',
      value: `${toPersianDigits(coverage.percent)}٪`,
      hint: `از ${toPersianDigits(coverage.totalDomains)} حوزه`,
    },
    {
      id: 'covered',
      label: 'حوزه‌های پوشش‌داده‌شده',
      value: toPersianDigits(coverage.coveredCount),
      hint: `از ${toPersianDigits(coverage.totalDomains)} حوزه`,
    },
    {
      id: 'mapped',
      label: 'اولویت‌های نگاشت‌شده',
      value: toPersianDigits(coverage.mappedPriorityCount),
      hint: `از ${toPersianDigits(coverage.totalPriorityCount)} اولویت`,
    },
    {
      id: 'uncovered',
      label: 'حوزه‌های بدون پوشش',
      value: toPersianDigits(coverage.uncoveredCount),
      hint: 'نیازمند نگاشت صریح',
    },
  ];

  return (
    <>
      <section
        id="cultural-taxonomy-coverage"
        role="note"
        aria-labelledby="cultural-taxonomy-coverage-title"
        className={`rounded-2xl border p-5 shadow-2xs ${tone.section}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.iconWrap}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 id="cultural-taxonomy-coverage-title" className="text-sm font-black">
              {tone.title}
            </h2>

            <p className="mt-1 max-w-3xl text-xs leading-relaxed opacity-90">{COVERAGE_RULE}</p>

            <div className="mt-3.5 flex items-center gap-3">
              <div
                role="progressbar"
                aria-label="پوشش حوزه‌های فرهنگی"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={coverage.percent}
                aria-valuetext={`${toPersianDigits(coverage.coveredCount)} از ${toPersianDigits(coverage.totalDomains)} حوزه`}
                className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/70 ring-1 ring-inset ring-current/10 dark:bg-slate-950/40"
              >
                <span
                  aria-hidden="true"
                  className="block h-full rounded-full bg-current transition-[width] duration-500"
                  style={{ width: `${coverage.percent}%` }}
                />
              </div>

              <span aria-hidden="true" className="shrink-0 text-xs font-black tabular-nums">
                {toPersianDigits(coverage.percent)}٪
              </span>
            </div>
          </div>
        </div>
      </section>

      <dl
        id="cultural-taxonomy-kpi"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {kpiItems.map((item) => (
          <div
            key={item.id}
            id={`cultural-taxonomy-kpi-${item.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
          >
            <dt className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {item.label}
            </dt>
            <dd className="mt-1.5 text-xl font-black tabular-nums text-slate-900 dark:text-slate-100">
              {item.value}
            </dd>
            <dd className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
              {item.hint}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
};
