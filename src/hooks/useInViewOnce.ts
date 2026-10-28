import { useEffect, useRef, useState } from 'react';

/**
 * The app scrolls inside `#app-scrollable-main-workspace`, not the document, so
 * visibility has to be measured against that box; the viewport (`root: null`)
 * is only a fallback for figures rendered outside the shell.
 */
const SCROLLER_ID = 'app-scrollable-main-workspace';

type Watcher = () => void;

const watchers = new WeakMap<Element, Watcher>();
let observer: IntersectionObserver | undefined;

/**
 * One observer shared by every figure on the page. A dashboard renders dozens
 * of numbers, and giving each its own IntersectionObserver would register
 * dozens of observations against the same scroll container to answer the same
 * question — the same reasoning behind the single frame clock in `useCountUp`.
 *
 * `rootMargin` bottom of -5% so a figure commits to counting once it is
 * genuinely inside the view rather than peeking over the bottom edge;
 * `threshold: 0.01` accepts whatever sliver is actually visible for very short
 * figures.
 */
function sharedObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  if (!observer) {
    const scroller = typeof document === 'undefined' ? null : document.getElementById(SCROLLER_ID);
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const watcher = watchers.get(entry.target);
          if (!watcher) continue;
          watchers.delete(entry.target);
          observer?.unobserve(entry.target);
          watcher();
        }
      },
      { root: scroller ?? null, rootMargin: '0px 0px -5% 0px', threshold: 0.01 }
    );
  }
  return observer;
}

/**
 * Reports `true` once the element has been on screen inside the app's scroll
 * container. It latches — scrolling away does not reset it — so a figure counts
 * up the first time it is seen and then holds its value. Environments without
 * `IntersectionObserver` fall back to latching immediately, which reproduces
 * the old count-on-mount behaviour rather than leaving a figure at zero.
 */
export function useInViewOnce<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (inView || !element) return undefined;

    const io = sharedObserver();
    if (!io) {
      setInView(true);
      return undefined;
    }

    watchers.set(element, () => setInView(true));
    io.observe(element);
    return () => {
      watchers.delete(element);
      io.unobserve(element);
    };
  }, [inView]);

  return [ref, inView] as const;
}
