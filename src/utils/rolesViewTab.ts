/**
 * Which sub-tab of مدیریت نقش‌ها و دسترسی‌ها is open.
 *
 * The page's two sub-tabs are mounted conditionally, so the audit trail's DOM —
 * every element id under `roles-and-access-view-sub-tab-2-audit-trail-logs` —
 * exists only while the audit sub-tab is the active one. A plain `useState`
 * made that choice invisible to the URL: a reload, a bookmark or a link
 * shared with a reviewer always landed back on the roles matrix, and anything
 * that addresses the table by id (review tooling, a handbook screenshot
 * recipe, the browser's own find-in-page) had nothing to find.
 *
 * Kept in its own module so `components/RolesAndAccessView.tsx` exports a
 * component and nothing else, which is what lets React Fast Refresh hot-swap
 * it. Storage may be unavailable (private mode, quota); every helper degrades
 * quietly and the page falls back to its default sub-tab.
 */

/** The roles page's two sub-tabs, in switcher order. */
export type RolesViewSubTab = 'ROLES_MATRIX' | 'AUDIT_LOGS';

export const DEFAULT_ROLES_SUB_TAB: RolesViewSubTab = 'ROLES_MATRIX';

/** Remembers the last sub-tab visited on this browser. */
const ROLES_SUB_TAB_KEY = 'csr.roles.subTab.v1';

/**
 * Canonical hash for each sub-tab. The default sub-tab has none: its URL stays
 * the bare page path, so only the non-default view adds anything to the address
 * the user is looking at — and `#audit-logs` is short enough to type.
 */
const ROLES_SUB_TAB_HASH: Record<RolesViewSubTab, string> = {
  ROLES_MATRIX: '',
  AUDIT_LOGS: '#audit-logs',
};

/** The sub-tab a URL hash names, or null when it names neither. */
export function rolesSubTabFromHash(hash: string): RolesViewSubTab | null {
  const target = hash.trim().toLowerCase();
  const match = (Object.keys(ROLES_SUB_TAB_HASH) as RolesViewSubTab[]).find(
    (tab) => ROLES_SUB_TAB_HASH[tab] !== '' && ROLES_SUB_TAB_HASH[tab].toLowerCase() === target
  );
  return match ?? null;
}

/** The hash that addresses a sub-tab (empty string for the default one). */
export function hashForRolesSubTab(tab: RolesViewSubTab): string {
  return ROLES_SUB_TAB_HASH[tab];
}

/** The sub-tab left open on this browser, or null on a first visit. */
export function readPersistedRolesSubTab(): RolesViewSubTab | null {
  try {
    const stored = window.localStorage.getItem(ROLES_SUB_TAB_KEY);
    return stored === 'ROLES_MATRIX' || stored === 'AUDIT_LOGS' ? stored : null;
  } catch {
    return null;
  }
}

/** Remember the open sub-tab, so a reload returns to the same view. */
export function persistRolesSubTab(tab: RolesViewSubTab): void {
  try {
    window.localStorage.setItem(ROLES_SUB_TAB_KEY, tab);
  } catch {
    /* storage unavailable — the page simply reopens on its default sub-tab */
  }
}
