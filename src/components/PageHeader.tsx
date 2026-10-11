import React, { useLayoutEffect, useRef } from 'react';

interface PageHeaderProps {
  /** Element id for the title block, following the `<page>-<element>` convention. */
  id: string;
  /** Lucide icon shown beside the title. */
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  /** One short line under the title — a full paragraph belongs in the banner below. */
  subtitle?: string;
  /** Tailwind classes for the icon colour only (e.g. `text-emerald-600`). */
  tone?: string;
  /** Optional node pinned beside the title itself (help tooltips, live badges). */
  adornment?: React.ReactNode;
  /** Optional trailing actions, pushed to the far side of the title. */
  children?: React.ReactNode;
}

/**
 * Per-page title block, rendered at the very top of a page's own content and
 * above that page's banner/stat strip.
 *
 * Bare by design: the icon, title and one-line description sit directly on the
 * page canvas — no card, no border, no tinted icon tile — so the banner below
 * stays the only panel in the page's header area and nothing competes with the
 * title for attention. Because there is no tile, `tone` carries a *text* colour
 * for the icon only.
 *
 * Replaces the old workspace header: the title now belongs to the page that
 * owns it. The mobile sidebar toggle that used to ride in the title row has
 * moved to the shell's identity bar, level with the account chip, so this block
 * is title only — it renders the same with or without a shell above it.
 *
 * The block also publishes the room it takes at the top of a page's content —
 * its own height plus the margin that separates it from the first block below —
 * as the `--app-page-header-space` custom property on `<html>`. The sidebar
 * reserves exactly that, so its panel starts on the line where the page's
 * content begins rather than level with the title's last baseline. Measuring
 * beats a constant here — the subtitle wraps on narrow columns and pages carry
 * different adornments — and it keeps the alignment inside CSS, with no shell
 * re-render on every resize. A header that is mounted but hidden (the charts
 * view stays in the DOM) measures zero, which is ignored so it cannot clobber
 * the token set by the visible page.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  id,
  icon: Icon,
  title,
  subtitle,
  tone = 'text-blue-600',
  adornment,
  children,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const publish = () => {
      // Fractional on purpose: `offsetHeight` would round, leaving the sidebar
      // half a pixel out. The trailing margin belongs to the title block too, so
      // the sidebar lines up with what follows it, not with the title itself.
      const { height } = el.getBoundingClientRect();
      if (height === 0) return; // mounted but hidden — a page the user cannot see
      const gap = parseFloat(getComputedStyle(el).marginBottom) || 0;
      document.documentElement.style.setProperty('--app-page-header-space', `${height + gap}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div id={id} ref={rootRef} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={`w-6 h-6 shrink-0 ${tone}`} aria-hidden="true" />

          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            {title}
          </h1>

          {adornment}
        </div>

        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{subtitle}</p>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">{children}</div>
      )}
    </div>
  );
};
