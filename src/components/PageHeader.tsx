import React from 'react';
import { Menu } from 'lucide-react';
import { useShellChrome } from '../context/ShellContext';

interface PageHeaderProps {
  /** Element id for the title card, following the `<page>-<element>` convention. */
  id: string;
  /** Lucide icon shown in the tinted tile beside the title. */
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  /** Tailwind classes for the icon tile (background, text and border colours). */
  tone?: string;
  /** Optional trailing actions, pushed to the far side of the title. */
  children?: React.ReactNode;
}

/**
 * Per-page title block, rendered at the very top of a page's own content.
 *
 * Replaces the old workspace header: the title now belongs to the page that
 * owns it, which also lets the mobile sidebar toggle ride along in the title
 * row instead of occupying a permanent bar. When no shell provider is present
 * the toggle is simply omitted, so the block stays testable in isolation.
 *
 * The toggle is drawn as a bordered square so it reads as a control even at
 * rest. Three states carry the design:
 *   • active (pressed) — the tile sinks (scale-95), drops its shadow and flushes
 *     blue, so the press reads as "this is opening the blue nav panel";
 *   • focus-visible — the border turns blue and a soft ring lifts off the card;
 *   • hover — a neutral slate tint that stays quieter than both of the above.
 * Declaring `active:` after `hover:` matters: all three are equally specific, so
 * the pressed look must come last in the class list to win while pressed.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  id,
  icon: Icon,
  title,
  subtitle,
  tone = 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  children,
}) => {
  const chrome = useShellChrome();

  return (
    <div
      id={id}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3 min-w-0">
        {chrome && (
          <button
            id={`${id}-menu-button`}
            type="button"
            onClick={chrome.openSidebar}
            title="باز کردن منوی دسترسی"
            aria-label="باز کردن منوی دسترسی"
            className="lg:hidden shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 shadow-2xs transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100 active:scale-95 active:border-blue-300 active:bg-blue-50 active:text-blue-700 active:shadow-none dark:active:border-blue-800 dark:active:bg-blue-950/50 dark:active:text-blue-300 focus:outline-none focus-visible:border-blue-500 dark:focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <span className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${tone}`}>
          <Icon className="w-5 h-5" />
        </span>

        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>

      {children && (
        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">{children}</div>
      )}
    </div>
  );
};
