import React from 'react';
import { Layers } from 'lucide-react';

/**
 * The app's chart shell — one card, one tooltip and one axis-tick convention,
 * shared by every analytics surface (the dashboard panel and the charts page)
 * so a chart looks the same wherever it is rendered.
 *
 * Colours, labels and units are NOT decided here: this module only owns the
 * chrome. Each chart keeps its own semantic palette and reads its figures
 * through the `numberUtils` formatters.
 */

/** Shorten a long Persian title for an axis tick; the full text stays in the tooltip. */
export const shortLabel = (text: string, max = 24): string =>
  text.length > max ? `${text.slice(0, max)}…` : text;

/**
 * One-line category tick for horizontal bar charts. Recharts wraps a category
 * label across several lines when it does not fit the axis width, which makes
 * multi-line Persian titles overlap their neighbours and clip at the card edge.
 * This draws a single truncated line instead; the untruncated text belongs in
 * the tooltip.
 */
export const OneLineCategoryTick: React.FC<any> = ({ x, y, payload, maxChars = 22 }) => (
  <text x={x} y={y} dy={4} textAnchor="end" fill="#475569" fontSize={10}>
    {shortLabel(String(payload?.value ?? ''), maxChars)}
  </text>
);

/** Card shell: title row with icon + tone, optional control, then the chart. */
export const ChartCard: React.FC<{
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  subtitle?: string;
  control?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ id, icon: Icon, tone, title, subtitle, control, className = '', children }) => (
  <div
    id={id}
    className={`bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4 min-w-0 ${className}`}
  >
    {/* Title block and control always stack: a wide control (status chips, a
        metric toggle) beside the title would squeeze the heading into a narrow
        column and wrap it over several lines. */}
    <div id={`${id}-header`} className="flex flex-col gap-3 pb-3 border-b border-slate-100">
      <div id={`${id}-header-title`} className="flex items-start gap-2 min-w-0">
        <span className={`p-1.5 rounded-lg bg-slate-50 border border-slate-200 shrink-0 ${tone}`}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </span>
        <div id={`${id}-header-title-text`} className="min-w-0">
          <h3 className="font-bold text-sm text-slate-900 leading-snug">{title}</h3>
          {subtitle ? (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {control ? (
        <div id={`${id}-header-control`} className="shrink-0">
          {control}
        </div>
      ) : null}
    </div>
    {children}
  </div>
);

/** Quiet empty state — used instead of drawing an axis with nothing on it. */
export const ChartEmptyState: React.FC<{
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}> = ({ children, icon: Icon = Layers }) => (
  <div className="h-[240px] flex flex-col items-center justify-center gap-2 text-center">
    <span className="p-2.5 rounded-full bg-slate-100">
      <Icon className="w-4 h-4 text-slate-500" aria-hidden="true" />
    </span>
    <span className="text-xs font-bold text-slate-500 max-w-xs leading-relaxed">{children}</span>
  </div>
);

/** Tooltip shell — one RTL card so every chart's tooltip reads identically. */
export const TooltipShell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-xl text-xs space-y-1.5 z-50 max-w-xs ${className}`}
    dir="rtl"
  >
    {children}
  </div>
);

/** A labelled figure row inside a tooltip. */
export const TooltipRow: React.FC<{
  label: string;
  color?: string;
  children: React.ReactNode;
}> = ({ label, color, children }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="flex items-center gap-1.5 text-slate-600">
      {color ? (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      ) : null}
      {label}:
    </span>
    <span className="font-bold text-slate-800">{children}</span>
  </div>
);

/** Tooltip heading — the subject the tooltip's rows describe. */
export const TooltipHeading: React.FC<{
  title: string;
  meta?: string;
  color?: string;
}> = ({ title, meta, color }) => (
  <div className="pb-1 border-b border-slate-100">
    <div className="flex items-center gap-1.5">
      {color ? (
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      ) : null}
      <span className="font-black text-slate-900">{title}</span>
    </div>
    {meta ? <div className="text-[11px] text-slate-500 mt-0.5">{meta}</div> : null}
  </div>
);
