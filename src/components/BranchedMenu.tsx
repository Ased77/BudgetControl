import React, { isValidElement, useLayoutEffect, useRef, useState } from 'react';
import './BranchedMenu.css';

/**
 * React Bits' BranchedMenu, ported to this project.
 *
 * Three deliberate changes from the published source:
 *  - the hugeicons dependency is gone. `renderIcon` takes a ready element *or*
 *    any icon component, so the menu runs on the lucide-react icons the rest of
 *    the app already uses (lucide accepts the same `size`/`strokeWidth` props).
 *  - the bundled sample items are gone; `items` is required.
 *  - the stylesheet mirrors itself under `dir="rtl"`, which is how this app
 *    renders (Persian shell).
 *  - `active` and `open` may be passed to drive the menu from outside; left
 *    undefined it keeps its own state exactly as published, so the app can put
 *    navigation in its own store without losing the accent-line animation (a
 *    remount would reset that animation).
 * `onToggle` also fires from outside the state updater, so React's StrictMode
 * double-invocation cannot report the same fold twice.
 */

/** A ready element, or any icon component (lucide-react's accept `size`). */
type IconSpec =
  | React.ComponentType<{ size?: number | string; strokeWidth?: number | string }>
  | React.ReactElement;

export type BranchedMenuLeaf = {
  value: string;
  label: string;
  icon?: IconSpec;
};

export type BranchedMenuItem = {
  /** Leaf value — used when the item carries no children of its own. */
  value?: string;
  label: string;
  icon?: IconSpec;
  children?: BranchedMenuLeaf[];
};

export type BranchedMenuProps = {
  /** Sections (label plus children) and leaves (a value that gets selected). */
  items: BranchedMenuItem[];
  /** The section, or sections, open at first. -1 for none. */
  defaultOpen?: number | number[];
  /** Value selected at first. Empty picks the open section's first child. */
  defaultActive?: string;
  /** Controlled selection — pass to drive the menu from outside. */
  active?: string;
  /** Controlled open sections, by index. Pass to drive the menu from outside. */
  open?: number[];
  onSelect?: (value: string, item: BranchedMenuLeaf | BranchedMenuItem) => void;
  onToggle?: (index: number, open: boolean) => void;
  /**
   * The pointer entered or left a section — the whole section, head and rows
   * together, which is what makes a hover preview usable. Leaves never fire it.
   */
  onSectionHover?: (index: number, hovering: boolean) => void;
  /** The ink. Lines and idle text are mixes of it. */
  color?: string;
  /** The active line, the active label and the marker. */
  accentColor?: string;
  /** The rail, trunk and branches. Solid, so joints never darken. */
  lineColor?: string;
  width?: number;
  rowHeight?: number;
  indent?: number;
  trunk?: number;
  radius?: number;
  lineWidth?: number;
  fontSize?: number;
  drawDuration?: number;
  foldDuration?: number;
  className?: string;
};

const PAD = 6;
const MARK = 16;

/** A ready element keeps its own size; a component is drawn at `size`. */
const renderIcon = (icon: IconSpec, size: number) => {
  if (isValidElement(icon)) return icon;
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
    const Icon = icon as React.ComponentType<{ size?: number; strokeWidth?: number }>;
    return <Icon size={size} strokeWidth={1.8} />;
  }
  return null;
};

const toSet = (open: number | number[]) => new Set(Array.isArray(open) ? open : open >= 0 ? [open] : []);

export default function BranchedMenu({
  items,
  defaultOpen = 0,
  defaultActive = '',
  active: activeProp,
  open: openProp,
  onSelect,
  onToggle,
  onSectionHover,
  color = '#f5f5f5',
  accentColor = '#f5f5f5',
  lineColor = '#3f3f46',
  width = 240,
  rowHeight = 36,
  indent = 40,
  trunk = 14,
  radius = 10,
  lineWidth = 1.5,
  fontSize = 14,
  drawDuration = 400,
  foldDuration = 300,
  className = '',
}: BranchedMenuProps) {
  const [internalOpen, setInternalOpen] = useState<Set<number>>(() => toSet(defaultOpen));
  const [internalActive, setInternalActive] = useState<string>(() => {
    if (defaultActive) return defaultActive;
    const first = items.find((it, i) => it.children && toSet(defaultOpen).has(i));
    return first?.children?.[0]?.value ?? '';
  });
  // Uncontrolled unless the caller supplies the matching prop.
  const driven = { open: openProp !== undefined, active: activeProp !== undefined };
  const open = driven.open ? new Set(openProp) : internalOpen;
  const active = driven.active ? (activeProp as string) : internalActive;
  const navRef = useRef<HTMLElement | null>(null);
  const heads = useRef<(HTMLButtonElement | null)[]>([]);
  const markerRef = useRef<HTMLSpanElement | null>(null);
  const latest = useRef<{ onSelect?: BranchedMenuProps['onSelect']; onToggle?: BranchedMenuProps['onToggle'] }>({});
  latest.current = { onSelect, onToggle };

  const activeSection = items.findIndex(it => it.children?.some(kid => kid.value === active));
  const markerShown = activeSection >= 0 && open.has(activeSection);

  useLayoutEffect(() => {
    const place = (glide: boolean) => {
      const m = markerRef.current;
      const el = heads.current[activeSection];
      if (!m) return;
      const on = markerShown && el;
      if (!glide) m.style.transition = 'none';
      if (on) m.style.top = `${el.offsetTop + (el.offsetHeight - MARK) / 2}px`;
      m.toggleAttribute('data-on', Boolean(on));
      if (!glide) {
        void m.offsetHeight;
        m.style.transition = '';
      }
    };
    place(true);
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      place(false);
    });
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [activeSection, markerShown, items, fontSize, rowHeight]);

  const select = (value: string, item: BranchedMenuLeaf | BranchedMenuItem) => {
    if (!driven.active) setInternalActive(value);
    latest.current.onSelect?.(value, item);
  };

  const toggle = (i: number) => {
    const isOpen = !open.has(i);
    if (!driven.open) {
      setInternalOpen(prev => {
        const next = new Set(prev);
        if (isOpen) next.add(i);
        else next.delete(i);
        return next;
      });
    }
    latest.current.onToggle?.(i, isOpen);
  };

  // Glyphs track the type size, so raising `fontSize` lifts the whole menu.
  const iconSize = Math.max(14, Math.round(fontSize * 1.15));

  const r = Math.min(radius, rowHeight / 2 - 2);
  const endX = indent - 8;
  const rowY = (k: number) => PAD + k * rowHeight + rowHeight / 2;
  const branch = (k: number) => `M ${trunk} ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const reach = (k: number) => `M ${trunk} 0 V ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const length = (k: number) => rowY(k) - r + (Math.PI * r) / 2 + (endX - trunk - r);

  return (
    <nav
      ref={navRef}
      className={`branched-menu${className ? ` ${className}` : ''}`}
      style={
        {
          '--bm-w': `${width}px`,
          '--bm-ink': color,
          '--bm-accent': accentColor,
          '--bm-line': lineColor,
          '--bm-font': `${fontSize}px`,
          '--bm-row': `${rowHeight}px`,
          '--bm-indent': `${indent}px`,
          '--bm-line-w': lineWidth,
          '--bm-draw': `${drawDuration}ms`,
          '--bm-fold': `${foldDuration}ms`,
        } as React.CSSProperties
      }
    >
      <span ref={markerRef} className="branched-menu__marker" aria-hidden="true" />
      {items.map((item, i) => {
        const kids = item.children;
        const isOpen = kids ? open.has(i) : false;
        const leafValue = item.value ?? item.label;
        const leafActive = !kids && leafValue === active;
        const bodyH = kids ? PAD * 2 + kids.length * rowHeight : 0;
        return (
          <div
            key={item.value ?? item.label}
            className="branched-menu__section"
            data-open={isOpen ? '' : undefined}
            onMouseEnter={kids ? () => onSectionHover?.(i, true) : undefined}
            onMouseLeave={kids ? () => onSectionHover?.(i, false) : undefined}
          >
            <button
              ref={el => {
                heads.current[i] = el;
              }}
              type="button"
              className="branched-menu__head"
              aria-expanded={kids ? isOpen : undefined}
              aria-current={leafActive ? 'true' : undefined}
              data-active={leafActive ? '' : undefined}
              onClick={() => (kids ? toggle(i) : select(leafValue, item))}
            >
              {item.icon ? (
                <span className="branched-menu__icon" aria-hidden="true">
                  {renderIcon(item.icon, iconSize)}
                </span>
              ) : null}
              {item.label}
            </button>
            {kids ? (
              <div className="branched-menu__body">
                {/* `inert` keeps a folded section's rows out of the tab order and
                    out of the accessibility tree, matching what the fold shows. */}
                <div className="branched-menu__fold" inert={!isOpen}>
                  <div className="branched-menu__tree" style={{ height: bodyH }}>
                    <svg className="branched-menu__lines" width={indent} height={bodyH} aria-hidden="true">
                      <path className="branched-menu__base" d={`M ${trunk} 0 V ${rowY(kids.length - 1) - r}`} />
                      {kids.map((kid, k) => (
                        <path key={kid.value} className="branched-menu__base" d={branch(k)} />
                      ))}
                      {kids.map((kid, k) => (
                        <path
                          key={kid.value}
                          className="branched-menu__reach"
                          d={reach(k)}
                          style={{
                            strokeDasharray: length(k),
                            strokeDashoffset: kid.value === active ? 0 : length(k),
                          }}
                        />
                      ))}
                    </svg>
                    {kids.map(kid => (
                      <button
                        key={kid.value}
                        type="button"
                        className="branched-menu__item"
                        aria-current={kid.value === active ? 'true' : undefined}
                        data-active={kid.value === active ? '' : undefined}
                        tabIndex={isOpen ? 0 : -1}
                        onClick={() => select(kid.value, kid)}
                      >
                        {kid.icon ? (
                          <span className="branched-menu__icon" aria-hidden="true">
                            {renderIcon(kid.icon, iconSize)}
                          </span>
                        ) : null}
                        <span className="branched-menu__label">{kid.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
