/**
 * First-run guided-tour progress.
 *
 * Kept in its own module so `components/SystemTour.tsx` exports a component and
 * nothing else: a component file that also exports plain values cannot be
 * hot-swapped by React Fast Refresh, and editing the tour would force a full
 * page reload in development.
 *
 * Storage may be unavailable (private mode, quota, SSR); every helper degrades
 * quietly, and the tour simply offers itself again next session.
 */

/**
 * The tour has been shown and left, however it was left. Keeping the original
 * key string means an operator who dismissed the walkthrough before this flag
 * was renamed is not offered it a second time.
 */
const TOUR_SEEN_KEY = 'csr.tour.completed.v1';

/** The one-time "you can relaunch this" hint has been shown. */
const RELAUNCH_HINT_KEY = 'csr.tour.relaunchHint.v1';

/** True once the tour has been shown and left on this browser. */
export function hasSeenSystemTour(): boolean {
  try {
    return window.localStorage.getItem(TOUR_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Remember that the tour has been seen, so it stops auto-launching. Set on any
 * close — finishing the walkthrough and dismissing it count the same here; only
 * the hint below cares which one happened.
 */
export function markSystemTourSeen(): void {
  try {
    window.localStorage.setItem(TOUR_SEEN_KEY, '1');
  } catch {
    /* storage unavailable — the tour simply offers itself again next session */
  }
}

/** True once the relaunch hint has been shown — it is deliberately one-time. */
export function hasSeenRelaunchHint(): boolean {
  try {
    return window.localStorage.getItem(RELAUNCH_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

/** Remember that the relaunch hint has been shown, so it is never shown twice. */
export function markRelaunchHintShown(): void {
  try {
    window.localStorage.setItem(RELAUNCH_HINT_KEY, '1');
  } catch {
    /* storage unavailable — the hint may reappear next session, harmlessly */
  }
}
