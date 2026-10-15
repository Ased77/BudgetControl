/**
 * Utility functions for Persian number formatting, financial calculations,
 * and currency conversions (Toman/Rial).
 *
 * Formatting is fully deterministic (no locale-dependent output): every
 * figure in the app renders with Persian digits, the Arabic-comma thousands
 * separator «،» (e.g. ۱۴،۶۰۰) and the Arabic decimal separator «٫»
 * (e.g. ۶٫۸۵), so "۸٫۲۶۹" can never be misread.
 *
 * Money is displayed in ONE unit across the app: «همت» (= ۱٬۰۰۰ میلیارد
 * تومان). Smaller amounts fall back to میلیارد/میلیون/تومان tiers so a
 * project-level figure stays readable, but the trillion tier is always همت —
 * dashboard cards, chart axes and tooltips now agree.
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Thousands separator (U+060C ARABIC COMMA). */
const FA_THOUSANDS = '،';
/** Decimal separator (U+066B ARABIC DECIMAL SEPARATOR). */
const FA_DECIMAL = '٫';

export const TOMAN_BILLION = 1_000_000_000;
/** ۱ همت = ۱٬۰۰۰ میلیارد تومان = 10^12. */
export const ONE_HEMMAT_TOMAN = 1_000_000_000_000;

export function toPersianDigits(input: string | number): string {
  if (input === undefined || input === null) return '';
  const str = input.toString();
  return str.replace(/\d/g, (x) => PERSIAN_DIGITS[parseInt(x, 10)]);
}

/**
 * Core Persian formatter. Formats with en-US grouping first (unambiguous
 * separators), then swaps in the Persian separators and digits.
 */
function formatFaNumber(
  value: number,
  maximumFractionDigits = 2,
  minimumFractionDigits = 0
): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '۰';
  if (!Number.isFinite(value)) return '۰';
  const grouped = new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(value);
  return toPersianDigits(
    grouped.replace(/,/g, FA_THOUSANDS).replace(/\./g, FA_DECIMAL)
  );
}

/**
 * Plain number formatting: 14600 → «۱۴،۶۰۰», 6.851 → «۶٫۸۵».
 * `usePersian` kept for backwards compatibility — every caller in the app
 * renders Persian digits.
 */
export function formatNumber(num: number, usePersian = true, maximumFractionDigits = 2): string {
  const formatted = formatFaNumber(num, maximumFractionDigits);
  return usePersian ? formatted : formatted.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
}

/**
 * Percentage formatting: formatPercent(20.7, { signed: true }) → «+۲۰٫۷٪».
 * Render the result inside `<bdi dir="ltr">` (see `Num`) so the sign and the
 * ٪ stay glued to the digits in RTL text.
 */
export function formatPercent(
  value: number,
  opts: { signed?: boolean; fractionDigits?: number } = {}
): string {
  const { signed = false, fractionDigits = 1 } = opts;
  if (value === undefined || value === null || Number.isNaN(value)) return `۰٪`;
  const fixed = Number(value.toFixed(fractionDigits));
  const abs = formatFaNumber(Math.abs(fixed), fractionDigits);
  if (fixed < 0) return `−${abs}٪`;
  if (signed && fixed > 0) return `+${abs}٪`;
  return `${abs}٪`;
}

/** Parts of a monetary amount, so cards can print the unit in a smaller font. */
export type MoneyParts = { value: string; unit: string };

/**
 * Splits a Toman amount into { value, unit } — the app-wide standard.
 * Trillion-scale amounts are shown in همت (never «هزار میلیارد تومان»).
 */
export function formatMoneyParts(
  amountToman: number,
  opts: { maximumFractionDigits?: number } = {}
): MoneyParts {
  const { maximumFractionDigits = 2 } = opts;
  const a = Number(amountToman);
  if (!Number.isFinite(a) || a === 0) return { value: '۰', unit: 'تومان' };
  const abs = Math.abs(a);
  if (abs >= ONE_HEMMAT_TOMAN) {
    return { value: formatFaNumber(a / ONE_HEMMAT_TOMAN, maximumFractionDigits), unit: 'همت' };
  }
  if (abs >= TOMAN_BILLION) {
    return { value: formatFaNumber(a / TOMAN_BILLION, maximumFractionDigits), unit: 'میلیارد تومان' };
  }
  if (abs >= 1_000_000) {
    return { value: formatFaNumber(a / 1_000_000, 1), unit: 'میلیون تومان' };
  }
  return { value: formatFaNumber(Math.round(a), 0), unit: 'تومان' };
}

/** One-line monetary string: formatMoney(14_600_000_000_000) → «۱۴٫۶ همت». */
export function formatMoney(
  amountToman: number,
  opts: { maximumFractionDigits?: number } = {}
): string {
  const { value, unit } = formatMoneyParts(amountToman, opts);
  return `${value} ${unit}`;
}

/** Bare همت value for chart axis ticks: formatHemmat(3.5e12) → «۳٫۵». */
export function formatHemmat(amountToman: number, fractionDigits = 1): string {
  if (!Number.isFinite(amountToman)) return '۰';
  return formatFaNumber(amountToman / ONE_HEMMAT_TOMAN, fractionDigits);
}

/**
 * Legacy alias kept for the many views that call `formatToman`. Amounts at the
 * trillion tier now read «همت» instead of «هزار میلیارد تومان», which
 * standardizes the unit app-wide without touching those call sites.
 */
export function formatLargeBudgetPersian(amountInToman: number): string {
  if (Number.isNaN(amountInToman) || amountInToman === 0) return '۰ تومان';
  const { value, unit } = formatMoneyParts(amountInToman);
  return `${value} ${unit}`;
}

export function formatToman(amountInToman: number): string {
  return formatLargeBudgetPersian(amountInToman);
}

/**
 * Compact { value, unit } pair for dense table cells. Same tiers and
 * separators as `formatMoneyParts` (kept as a separate, shorter-unit variant
 * for narrow cells: «همت» without the currency suffix).
 */
export function compactToman(amountInToman: number): { value: string; unit: string } {
  if (!amountInToman || Number.isNaN(amountInToman)) return { value: '۰', unit: 'تومان' };
  const a = Number(amountInToman);
  const abs = Math.abs(a);
  if (abs >= ONE_HEMMAT_TOMAN) {
    return { value: formatFaNumber(a / ONE_HEMMAT_TOMAN, 2), unit: 'همت' };
  }
  if (abs >= TOMAN_BILLION) {
    return { value: formatFaNumber(a / TOMAN_BILLION, 2), unit: 'میلیارد' };
  }
  return { value: formatFaNumber(a / 1_000_000, 1), unit: 'میلیون' };
}

export function formatCurrency(amountInToman: number, unit: 'TOMAN' | 'RIAL' = 'TOMAN', usePersian = true): string {
  if (isNaN(amountInToman)) return '۰';
  const finalAmount = unit === 'RIAL' ? amountInToman * 10 : amountInToman;
  const unitLabel = unit === 'RIAL' ? 'ریال' : 'تومان';

  return `${formatNumber(finalAmount, usePersian)} ${unitLabel}`;
}

export function calculateAllocationAmount(totalBudgetToman: number, percentage: number): {
  toman: number;
  rial: number;
} {
  const toman = Math.round((totalBudgetToman * (percentage / 100)));
  const rial = toman * 10;
  return { toman, rial };
}

export function roundPercentage(val: number): number {
  return Math.round(val * 10) / 10;
}
