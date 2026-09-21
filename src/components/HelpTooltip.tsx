import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
  label?: string;
  size?: 'sm' | 'md';
  widthClassName?: string;
  variant?: 'button' | 'ghost';
  portal?: boolean;
}

/**
 * Small info icon that opens a click-to-dismiss popover with a (long)
 * description. Used project-wide instead of cluttering the layout with
 * inline description text.
 *
 * - `variant="ghost"` renders a span (not a button) so it can be nested
 *   inside existing clickable card/row buttons without invalid markup.
 * - `portal` renders the bubble in a body portal with fixed positioning,
 *   so it is never clipped by scrollable / overflow-hidden containers
 *   (tables, dropdowns, accordion items). It auto-flips above the icon
 *   when there is not enough room below.
 */
export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  text,
  label = 'مشاهده توضیحات',
  size = 'md',
  widthClassName = 'w-72',
  variant = 'button',
  portal = false,
}) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; up: boolean; caretLeft: number } | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || bubbleRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    const close = () => setOpen(false);
    if (portal) {
      document.addEventListener('scroll', close, true);
      window.addEventListener('resize', close);
    }
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      if (portal) {
        document.removeEventListener('scroll', close, true);
        window.removeEventListener('resize', close);
      }
    };
  }, [open, portal]);

  if (!text) return null;

  const iconSizeClass = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';

  const toggle = (event: React.SyntheticEvent) => {
    event.stopPropagation();
    if (!open && portal && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const approxWidth = 300;
      const viewWidth = window.innerWidth;
      let left = rect.left;
      if (left + approxWidth > viewWidth - 8) {
        left = Math.max(8, rect.right - approxWidth);
      }
      const up = rect.bottom + 180 > window.innerHeight;
      setCoords({
        top: up ? rect.top - 8 : rect.bottom + 8,
        left,
        up,
        caretLeft: Math.min(Math.max(rect.left - left + rect.width / 2, 14), approxWidth - 14),
      });
    }
    setOpen((value) => !value);
  };

  const handleKeyToggle = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle(event);
    }
  };

  const controlClass = `inline-flex items-center justify-center shrink-0 -m-1 p-1 rounded-lg cursor-pointer transition-colors ${
    open ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
  }`;

  const control = variant === 'button' ? (
    <button type="button" onClick={toggle} aria-expanded={open} aria-label={label} title={label} className={controlClass}>
      <Info className={iconSizeClass} />
    </button>
  ) : (
    <span
      role="button"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={handleKeyToggle}
      aria-expanded={open}
      aria-label={label}
      title={label}
      className={controlClass}
    >
      <Info className={iconSizeClass} />
    </span>
  );

  const bubbleClass = `z-50 ${widthClassName} max-w-[80vw] dir-rtl bg-slate-900 text-slate-100 text-sm leading-relaxed rounded-xl p-3.5 shadow-xl border border-slate-700`;

  let bubble: React.ReactNode = null;
  if (open && portal && coords) {
    bubble = createPortal(
      <span
        ref={bubbleRef}
        dir="rtl"
        className={`${bubbleClass} fixed ${coords.up ? '-translate-y-full' : ''}`}
        style={{ top: coords.top, left: coords.left }}
      >
        <span
          className="absolute w-2 h-2 bg-slate-900 rotate-45 border-slate-700"
          style={
            coords.up
              ? { bottom: '-5px', left: coords.caretLeft, borderBottomWidth: 1, borderLeftWidth: 1 }
              : { top: '-5px', left: coords.caretLeft, borderTopWidth: 1, borderRightWidth: 1 }
          }
        />
        {text}
      </span>,
      document.body
    );
  } else if (open) {
    bubble = (
      <span ref={bubbleRef} dir="rtl" className={`${bubbleClass} absolute top-full left-0 mt-1.5`}>
        <span className="absolute -top-1 left-3.5 w-2 h-2 bg-slate-900 border-t border-r border-slate-700 rotate-45" />
        {text}
      </span>
    );
  }

  return (
    <span ref={rootRef} className="relative inline-flex shrink-0 align-middle">
      {control}
      {bubble}
    </span>
  );
};
