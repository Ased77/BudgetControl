import { useEffect, useRef, useState } from 'react';

/**
 * Smootherstep easing — the C²-continuous counterpart of the old
 * easeInOutCubic. Its velocity *and* acceleration are both zero at 0 and 1,
 * so the figure glides out of 0 and settles onto the target without the faint
 * corner snap of a cubic, while the run still covers the same 0→1 range in
 * the same time.
 */
const easeSmootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

type FrameCallback = (now: number) => void;

/**
 * A single requestAnimationFrame loop shared by every count-up on screen.
 * Each hook used to schedule its own frame callback and its own timestamp, so
 * counters drifted a few milliseconds apart and a page full of figures woke
 * the browser dozens of times per frame. One loop hands every subscriber the
 * same clock time, so all of a page's figures — and the gauges that share the
 * same clock — advance on the same frame and React batches their state
 * updates into a single render pass.
 */
const frameCallbacks = new Set<FrameCallback>();
let frameHandle = 0;

function pump(now: number) {
  frameHandle = 0;
  // Iterate a copy so an unsubscribing component cannot skip its neighbour.
  for (const callback of [...frameCallbacks]) callback(now);
  if (frameCallbacks.size > 0) frameHandle = requestAnimationFrame(pump);
}

function subscribeToFrames(callback: FrameCallback): () => void {
  frameCallbacks.add(callback);
  if (frameHandle === 0) frameHandle = requestAnimationFrame(pump);
  return () => {
    frameCallbacks.delete(callback);
    if (frameCallbacks.size === 0 && frameHandle !== 0) {
      cancelAnimationFrame(frameHandle);
      frameHandle = 0;
    }
  };
}

/**
 * Fast count-up for KPI figures: on mount the value eases from 0 to `target`
 * in ~800ms on the shared frame clock (smootherstep — a soft start, fluid
 * middle and a landing that decelerates to a stop rather than hitting the
 * target). When `target` changes later it re-eases from the currently
 * displayed figure, so a live edit slides to the new value instead of
 * resetting to zero.
 *
 * `enabled=false` (or `prefers-reduced-motion`, or a non-finite target) jumps
 * straight to the final value with no animation. The hook owns per-frame
 * state, so it renders only the digits that read it.
 *
 * `resetKey` is the visibility epoch of a view that stays mounted (the
 * charts panel): changing it snaps the displayed figure back to 0 and replays
 * the entrance, as if the page had just loaded.
 *
 * `fractionDigits` is the display resolution the caller will render with.
 * When given, the hook skips state updates that would repaint the same
 * figure — an integer counter commits only on integer crossings — which cuts
 * the per-frame render work on pages with dozens of counts. It is purely a
 * rendering optimisation: the eased clock still runs at full resolution and
 * the resting value is always the exact target.
 */
export function useCountUp(
  target: number,
  durationMs = 800,
  enabled = true,
  resetKey = 0,
  fractionDigits?: number
): number {
  const [value, setValue] = useState(() =>
    enabled ? (prefersReducedMotion() ? target : 0) : target
  );
  const displayedRef = useRef(value);
  const lastResetKeyRef = useRef(resetKey);

  useEffect(() => {
    const reset = lastResetKeyRef.current !== resetKey;
    lastResetKeyRef.current = resetKey;
    if (!enabled || prefersReducedMotion() || !Number.isFinite(target)) {
      displayedRef.current = target;
      setValue(target);
      return;
    }
    if (reset) {
      // Snap the visible figure back to zero before replaying, even when the
      // display resolution would suppress the first few commits.
      displayedRef.current = 0;
      setValue(0);
    }
    const from = displayedRef.current;
    if (from === target) return;

    // 0 means "commit every frame" (continuous figures such as gauge arcs).
    const snap = fractionDigits === undefined ? 0 : 10 ** -fractionDigits;
    let lastCommitted = displayedRef.current;
    let startedAt = -1;

    const frame: FrameCallback = (now) => {
      // Start on the first painted frame instead of at effect time, so a heavy
      // first render cannot swallow the opening milliseconds of the run.
      if (startedAt < 0) startedAt = now;
      const t = Math.min(1, (now - startedAt) / durationMs);
      const next = t >= 1 ? target : from + (target - from) * easeSmootherstep(t);
      displayedRef.current = next;
      // Land exactly on the target even when it is finer than the display
      // resolution, so the resting figure is bit-identical to a static render.
      const rendered = t >= 1 || snap === 0 ? next : Math.round(next / snap) * snap;
      if (t >= 1 || rendered !== lastCommitted) {
        lastCommitted = rendered;
        setValue(rendered);
      }
    };

    return subscribeToFrames(frame);
  }, [target, durationMs, enabled, resetKey, fractionDigits]);

  return value;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
