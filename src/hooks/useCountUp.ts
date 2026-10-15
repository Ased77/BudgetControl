import { useEffect, useRef, useState } from 'react';

/**
 * Fast count-up for KPI figures: on mount the value eases from 0 to `target`
 * in ~800ms (easeInOutCubic — gentle start, fluid middle, soft landing, so
 * the digits move steadily through the whole run instead of bursting at the
 * start and crawling at the end); when `target` changes later it re-eases
 * from the currently displayed figure, so a live edit slides to the new value
 * instead of resetting to zero.
 *
 * The hook owns per-frame state — keep it in a small leaf component so only
 * the digits re-render while the rest of the page stays put.
 * `prefers-reduced-motion` users (and non-finite targets) get the final value
 * immediately, with no animation at all.
 */
export function useCountUp(target: number, durationMs = 800): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const displayedRef = useRef(value);
  const frameRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion() || !Number.isFinite(target)) {
      displayedRef.current = target;
      setValue(target);
      return;
    }
    const from = displayedRef.current;
    if (from === target) return;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / durationMs);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      // Land exactly on the target so the resting figure is bit-identical to
      // a static render — no last-frame rounding drift.
      const next = t >= 1 ? target : from + (target - from) * eased;
      displayedRef.current = next;
      setValue(next);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, durationMs]);

  return value;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
