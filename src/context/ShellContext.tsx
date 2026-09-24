import { createContext, useContext } from 'react';

/**
 * Chrome-level actions that page content occasionally needs to reach.
 *
 * The sidebar lives in `App`, but its mobile toggle belongs inside each page's
 * title block (the old workspace header used to own it). This context lets the
 * shell hand that action down without threading a prop through every view.
 */
export interface ShellChrome {
  /** Opens the off-canvas sidebar — only meaningful below the `lg` breakpoint. */
  openSidebar: () => void;
}

export const ShellChromeContext = createContext<ShellChrome | null>(null);

export const useShellChrome = (): ShellChrome | null => useContext(ShellChromeContext);
