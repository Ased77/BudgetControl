import { useEffect, useRef, useState } from 'react';

/**
 * Fast count-up for KPI figures: on mount the value eases from 0 to `target`
 * in ~800ms (easeInOutCubic — gentle start, fluid middle, soft landing, so
 * the digits move steadily through the whole run instead of bursting at the
 * start and crawling at the end); when `target` changes later it re-eases
 * from the currently displayed figure, so a live edit slides to the new value
 * instead of resetting to zero.
 *
 * `enabled=false` (or `prefers-reduced-motion`, or a non-finite target) jumps
 * straight to the final value with no animation. The hook owns per-frame
 * state, so it renders only the digits that read it.
 *
 * `resetKey` is the visibility epoch of a view that stays mounted (the
 * charts panel): changing it snaps the displayed figure back to 0 and replays
 * the entrance, as if the page had just loaded.
 */
export function useCountUp(target: number, durationMs = 800, enabled = true, resetKey = 0): number {
  const [value, setValue] = useState(() =>
    enabled ? (prefersReducedMotion() ? target : 0) : target
  );
  const displayedRef = useRef(value);
  const frameRef = useRef(0);
  const lastResetKeyRef = useRef(resetKey);

  useEffect(() => {
    const reset = lastResetKeyRef.current !== resetKey;
    lastResetKeyRef.current = resetKey;
    if (!enabled || prefersReducedMotion() || !Number.isFinite(target)) {
      displayedRef.current = target;
      setValue(target);
      return;
    }
    if (reset) displayedRef.current = 0;
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
  }, [target, durationMs, enabled, resetKey]);

  return value;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
