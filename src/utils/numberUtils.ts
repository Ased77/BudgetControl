/**
 * Utility functions for Persian number formatting, financial calculations,
 * and currency conversions (Toman/Rial).
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  if (input === undefined || input === null) return '';
  const str = input.toString();
  return str.replace(/\d/g, (x) => PERSIAN_DIGITS[parseInt(x, 10)]);
}

export function formatNumber(num: number, usePersian = true): string {
  if (isNaN(num)) return '۰';
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(num);
  return usePersian ? toPersianDigits(formatted) : formatted;
}

export function formatCurrency(amountInToman: number, unit: 'TOMAN' | 'RIAL' = 'TOMAN', usePersian = true): string {
  if (isNaN(amountInToman)) return '۰';
  const finalAmount = unit === 'RIAL' ? amountInToman * 10 : amountInToman;
  const unitLabel = unit === 'RIAL' ? 'ریال' : 'تومان';
  
  return `${formatNumber(finalAmount, usePersian)} ${unitLabel}`;
}

export function formatLargeBudgetPersian(amountInToman: number): string {
  if (isNaN(amountInToman) || amountInToman === 0) return '۰ تومان';

  const TOMAN_BILLION = 1_000_000_000;
  const TOMAN_TRILLION = 1_000_000_000_000; // 1,000 Billion = 1 Trillion (همت)

  if (amountInToman >= TOMAN_TRILLION) {
    const valueInHemmat = amountInToman / TOMAN_TRILLION;
    return `${toPersianDigits(valueInHemmat.toLocaleString('fa-IR', { maximumFractionDigits: 3 }))} هزار میلیارد تومان (همت)`;
  } else if (amountInToman >= TOMAN_BILLION) {
    const valueInBillion = amountInToman / TOMAN_BILLION;
    return `${toPersianDigits(valueInBillion.toLocaleString('fa-IR', { maximumFractionDigits: 2 }))} میلیارد تومان`;
  } else if (amountInToman >= 1_000_000) {
    const valueInMillion = amountInToman / 1_000_000;
    return `${toPersianDigits(valueInMillion.toLocaleString('fa-IR', { maximumFractionDigits: 1 }))} میلیون تومان`;
  }

  return formatCurrency(amountInToman, 'TOMAN', true);
}

export function formatToman(amountInToman: number): string {
  return formatLargeBudgetPersian(amountInToman);
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
