/**
 * The one colour scale every circular gauge in the app reads from.
 *
 * Before this module, each view carried its own `*GaugeTone` helper with its
 * own cut-offs (۷۰/۵۰ on departments and crises, ۹۰/۸۴ on contractors, ۹۲/۸۸
 * on executors, ۹۰/۵۰ on budget sources), so the same colour could mean
 * different things on different pages. Now there is a single palette and a
 * single pair of shared cut-offs, and callers only declare the *direction* of
 * their metric:
 *
 *  - `HIGHER_IS_BETTER` — absorption rate, contractor quality, executor
 *    success: ≥ ۷۰ green, ۵۰–۶۹ amber, below ۵۰ red.
 *  - `HIGHER_IS_WORSE` — crisis severity, deprivation: ≥ ۷۰ red, ۵۰–۶۹ amber,
 *    below ۵۰ green.
 *  - `UTILIZATION` — budget commitment, where both extremes deserve a look:
 *    below ۵۰ still-uncommitted blue, ۵۰–۸۹ healthy green, ≥ ۹۰ nearly
 *    exhausted amber.
 *
 * Two ring families are deliberately not "tone" rings and keep their own
 * colours: a department's category identity ring (`catStyle.ring`) and the
 * comparative table's province/national columns, which colour by column, not
 * by score. Everything threshold-based goes through `gaugeTone`.
 */

/** The shared palette, one Tailwind stroke pair per semantic band. */
export const GAUGE_TONES = {
  good: 'stroke-emerald-500 dark:stroke-emerald-400',
  warning: 'stroke-amber-500 dark:stroke-amber-400',
  risk: 'stroke-rose-500 dark:stroke-rose-400',
  info: 'stroke-blue-500 dark:stroke-blue-400',
} as const;

/** Filled share at which a higher-is-better / higher-is-worse metric is healthy. */
export const GAUGE_GOOD_AT = 70;
/** Filled share below which a metric leaves its middle band. */
export const GAUGE_WARNING_AT = 50;
/** Commitment at which a budget source counts as nearly exhausted. */
export const GAUGE_UTILIZATION_LIMIT = 90;

export type GaugeDirection = 'HIGHER_IS_BETTER' | 'HIGHER_IS_WORSE' | 'UTILIZATION';

/**
 * Stroke classes for a 0–100 gauge value on the shared scale. Non-finite
 * values read as 0 rather than throwing away the ring.
 */
export function gaugeTone(value: number, direction: GaugeDirection = 'HIGHER_IS_BETTER'): string {
  const v = Number.isFinite(value) ? value : 0;

  if (direction === 'UTILIZATION') {
    if (v >= GAUGE_UTILIZATION_LIMIT) return GAUGE_TONES.warning;
    if (v >= GAUGE_WARNING_AT) return GAUGE_TONES.good;
    return GAUGE_TONES.info;
  }

  if (direction === 'HIGHER_IS_WORSE') {
    if (v >= GAUGE_GOOD_AT) return GAUGE_TONES.risk;
    if (v >= GAUGE_WARNING_AT) return GAUGE_TONES.warning;
    return GAUGE_TONES.good;
  }

  if (v >= GAUGE_GOOD_AT) return GAUGE_TONES.good;
  if (v >= GAUGE_WARNING_AT) return GAUGE_TONES.warning;
  return GAUGE_TONES.risk;
}
