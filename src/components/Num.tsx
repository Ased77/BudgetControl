import React, { useContext } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { useInViewOnce } from '../hooks/useInViewOnce';
import { formatNumber } from '../utils/numberUtils';

/**
 * Count-up is on for every rendered figure and is switched off inside
 * transient hover surfaces — the chart tooltip shells (see `TooltipShell`
 * and the dashboard's own tooltip), where re-animating on every hover would
 * read as lag rather than polish.
 */
export const NumCountUpContext = React.createContext(true);

/**
 * Visibility epoch for views that stay mounted in the DOM (the charts panel):
 * the app bumps it each time such a view is activated, replaying the
 * 0 → value entrance for its figures as if the page had just loaded.
 */
export const NumCountUpTriggerContext = React.createContext(0);

type NumProps = {
  /** Pre-formatted Persian string from formatNumber / formatMoneyParts / formatPercent. */
  value: string;
  /** Optional unit label («همت», «نفر», «٪») rendered after the value at reduced size. */
  unit?: string;
  className?: string;
  unitClassName?: string;
  title?: string;
  /**
   * Hold the count-up at its opening figure for this long after mount, so a
   * card grid can stagger its figures in a ripple (see `utils/gaugeStagger`).
   * Gauge labels pass the same value their ring receives.
   */
  countUpDelayMs?: number;
};

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/**
 * Strict shape of a countable figure: an optional sign / «×» prefix, one digit
 * run (Persian or Latin, with the app's «،» / «٫» separators) and an optional
 * «٪» suffix. Compound strings («۲۰٪ / ۱٫۵», timestamps, unit words inside the
 * value) never match and render statically.
 */
const NUMERAL_RE = /^([+\u2212\u002d\u00d7]*)([\d\u06f0-\u06f9][\d\u06f0-\u06f9\u060c\u066b.,]*)(\u066a)?$/;

function parseNumeral(
  value: string
): { prefix: string; suffix: string; target: number; fractionDigits: number } | null {
  const match = NUMERAL_RE.exec(value);
  if (!match) return null;
  const [, prefix, core, suffix] = match;
  const latin = core
    .replace(/[\u06f0-\u06f9]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[\u060c,]/g, '')
    .replace(/[\u066b.]/g, '.');
  const target = Number(latin);
  if (!Number.isFinite(target)) return null;
  const dot = latin.indexOf('.');
  return {
    prefix: prefix ?? '',
    suffix: suffix ?? '',
    target,
    fractionDigits: dot === -1 ? 0 : Math.min(20, latin.length - dot - 1),
  };
}

/**
 * Shared numeric value renderer — the single place that solves the RTL bidi
 * problem for figures:
 *
 *  - `<bdi dir="ltr">` isolates the digit run (`unicode-bidi: isolate`), so
 *    signed values and percentages like «+۲۰٫۷٪» / «−۱٫۴ همت» keep the sign
 *    and the percent sign beside the number instead of jumping to the wrong
 *    side of the line in RTL text. (`<bdi>` alone follows a first-strong
 *    heuristic that resolves to RTL for digit-only runs, hence the explicit
 *    `dir="ltr"`.)
 *  - `tabular-nums` keeps columns of figures aligned and, with the project's
 *    IRANSansX face, keeps the Persian zero «۰» unmistakable. No
 *    letter-spacing is ever applied, so large numerals stay tight and legible.
 *  - The optional unit prints in a smaller, lighter size next to the number,
 *    per the dashboard's single-unit («همت») convention.
 *
 * Count-up: a countable figure eases from 0 to its value the first time it
 * scrolls into the app's workspace viewport (see `useCountUp` and
 * `useInViewOnce`), so a long page counts its figures in as they arrive rather
 * than spending them all above the fold. Animated
 * frames re-format with the same digit count as the final string, so the last
 * frame is bit-identical to a static render; the unit label stays put the
 * whole time. `NumCountUpContext` disables the entrance in tooltip shells,
 * and `NumCountUpTriggerContext` replays it when a kept-mounted view is
 * activated (see `App.tsx`'s charts panel).
 *
 * Usage: `<Num value={formatPercent(growth, { signed: true })} />` or
 * `<Num {...formatMoneyParts(total)} className="text-2xl font-black" />`.
 */
export const Num: React.FC<NumProps> = ({
  value,
  unit,
  className = '',
  unitClassName = 'text-[0.6em] font-bold text-slate-500 ms-1',
  title,
  countUpDelayMs = 0,
}) => {
  const countUpEnabled = useContext(NumCountUpContext);
  const trigger = useContext(NumCountUpTriggerContext);
  const [ref, inView] = useInViewOnce<HTMLSpanElement>();
  const parsed = parseNumeral(value);
  const animate = countUpEnabled && parsed !== null;
  const animated = useCountUp(
    parsed?.target ?? 0,
    800,
    animate,
    trigger,
    parsed?.fractionDigits,
    countUpDelayMs,
    inView
  );
  const display =
    countUpEnabled && parsed
      ? `${parsed.prefix}${formatNumber(animated, true, parsed.fractionDigits)}${parsed.suffix}`
      : value;

  return (
    <span ref={ref} className={`tabular-nums ${className}`} title={title}>
      <bdi dir="ltr">{display}</bdi>
      {unit ? <span className={unitClassName}>{unit}</span> : null}
    </span>
  );
};
