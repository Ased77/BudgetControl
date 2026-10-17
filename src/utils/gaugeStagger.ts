/**
 * Lead-in pacing for the card-grid gauge entrance.
 *
 * Every ring starts its 800ms fill on mount, so without a lead-in a page of a
 * dozen cards opens as one block. Offsetting each card's start by a few dozen
 * milliseconds lets the rings fill as a single ripple travelling across the
 * grid, which reads as the page assembling rather than a mass repaint.
 *
 * The offset is capped instead of wrapped. A wrapped (modulo) offset makes the
 * cards past the wave start *before* the cards just ahead of them, which looks
 * like a glitch; capping means the tail of a long grid starts together, and a
 * batch revealed later by infinite scroll waits at most one short beat. The
 * offsets are relative to a batch, so callers that page their grid pass the
 * position within the batch (see `DepartmentsView`).
 */
export const GAUGE_STAGGER_STEP_MS = 50;
export const GAUGE_STAGGER_MAX_STEPS = 8;

/** Start delay for the ring at `index` within its batch, in milliseconds. */
export function gaugeStaggerDelay(index: number): number {
  if (!Number.isFinite(index) || index <= 0) return 0;
  return Math.min(Math.floor(index), GAUGE_STAGGER_MAX_STEPS) * GAUGE_STAGGER_STEP_MS;
}
