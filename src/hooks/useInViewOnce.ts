import { useEffect, useRef, useState } from 'react';

/**
 * The app scrolls inside `#app-scrollable-main-workspace`, not the document, so
 * counting starts once a figure is genuinely inside that box. But fixed
 * overlays — the drill-down modals — are DOM descendants of the scroller while
 * never reporting intersection against its root in every engine, which used to
 * leave a modal's figures at their opening zero for the record's lifetime.
 * Each figure is therefore observed against BOTH roots and latches on the
 * first report: for figures inside the workspace the reports agree, and for a
 * modal overlay the viewport report is the only one that arrives — so the
 * modal's figures settle on their value instead of holding zero.
 */
const SCROLLER_ID = 'app-scrollable-main-workspace';

type Watcher = () => void;

const watchersFor = new WeakMap<Element, Watcher>();

let scrollerObserver: IntersectionObserver | undefined;
let viewportObserver: IntersectionObserver | undefined;

/** Latch on the first intersection report; reporting is terminal per figure. */
function latchEntries(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const watcher = watchersFor.get(entry.target);
    if (!watcher) continue;
    watchersFor.delete(entry.target);
    scrollerObserver?.unobserve(entry.target);
    viewportObserver?.unobserve(entry.target);
    watcher();
  }
}

const OBSERVER_OPTIONS: { rootMargin: string; threshold: number } = {
  rootMargin: '0px 0px -5% 0px',
  threshold: 0.01,
};

/**
 * One observer shared by every figure on the page, per root. A dashboard
 * renders dozens of numbers, and giving each its own IntersectionObserver
 * would register dozens of observations against the same scroll container to
 * answer the same question — the same reasoning behind the single frame clock
 * in `useCountUp`.
 *
 * `rootMargin` bottom of -5% so a figure commits to counting once it is
 * genuinely inside the view rather than peeking over the bottom edge;
 * `threshold: 0.01` accepts whatever sliver is actually visible for very short
 * figures.
 */
function pickObserver(root: Element | null): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  const create = (): IntersectionObserver =>
    new IntersectionObserver(latchEntries, { ...OBSERVER_OPTIONS, root });
  if (!root) {
    if (!viewportObserver) viewportObserver = create();
    return viewportObserver;
  }
  if (!scrollerObserver) scrollerObserver = create();
  return scrollerObserver;
}

/**
 * Observes `element` with both roots and returns the unobserve cleanup, or
 * null when the environment has no IntersectionObserver (the caller then
 * latches immediately, reproducing count-on-mount).
 */
function observeFigure(element: Element, watcher: Watcher): (() => void) | null {
  if (typeof IntersectionObserver === 'undefined') return null;

  const scroller =
    typeof document === 'undefined' ? null : document.getElementById(SCROLLER_ID);

  watchersFor.set(element, watcher);
  const observers: IntersectionObserver[] = [];
  if (scroller) {
    const scrollerIo = pickObserver(scroller);
    if (scrollerIo) {
      scrollerIo.observe(element);
      observers.push(scrollerIo);
    }
  }
  const viewportIo = pickObserver(null);
  if (viewportIo) {
    viewportIo.observe(element);
    observers.push(viewportIo);
  }

  return () => {
    for (const io of observers) io.unobserve(element);
    watchersFor.delete(element);
  };
}

/**
 * Reports `true` once the element has been on screen. It latches — scrolling
 * away does not reset it — so a figure counts up the first time it is seen and
 * then holds its value. Environments without `IntersectionObserver` fall back
 * to latching immediately, which reproduces the old count-on-mount behaviour
 * rather than leaving a figure at zero.
 */
export function useInViewOnce<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (inView || !element) return undefined;

    const unobserve = observeFigure(element, () => setInView(true));
    if (!unobserve) {
      setInView(true);
      return undefined;
    }
    return unobserve;
  }, [inView]);

  return [ref, inView] as const;
}
