import React from 'react';

type NumProps = {
  /** Pre-formatted Persian string from formatNumber / formatMoneyParts / formatPercent. */
  value: string;
  /** Optional unit label («همت», «نفر», «٪») rendered after the value at reduced size. */
  unit?: string;
  className?: string;
  unitClassName?: string;
  title?: string;
};

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
 * Usage: `<Num value={formatPercent(growth, { signed: true })} />` or
 * `<Num {...formatMoneyParts(total)} className="text-2xl font-black" />`.
 */
export const Num: React.FC<NumProps> = ({
  value,
  unit,
  className = '',
  unitClassName = 'text-[0.6em] font-bold text-slate-500 ms-1',
  title,
}) => (
  <span className={`tabular-nums ${className}`} title={title}>
    <bdi dir="ltr">{value}</bdi>
    {unit ? <span className={unitClassName}>{unit}</span> : null}
  </span>
);
