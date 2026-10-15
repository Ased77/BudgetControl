import { useState } from 'react';
import RubberSegment from '../RubberSegment/RubberSegment';

import './FilterBadges.css';

/**
 * Reusable pill-shaped filter bar built on RubberSegment.
 *
 * - Uncontrolled: keeps its own state seeded from `defaultFilter` (or the
 *   first filter's value) and reports changes through `onChange`.
 * - Controlled: pass `value` and the internal state is bypassed entirely.
 * - Each optional `count` renders as a subtle muted number next to the label.
 * - The wrapper scrolls horizontally on narrow screens (scrollbar hidden via
 *   the project's `scrollbar-none` utility); the theme comes from CSS
 *   variables in FilterBadges.css, which the app's `.dark` class switches.
 */
export default function FilterBadges({
  filters,
  defaultFilter,
  value,
  onChange,
  size = 'md',
  className = ''
}) {
  const [inner, setInner] = useState(defaultFilter ?? filters[0]?.value);
  const active = value !== undefined ? value : inner;

  const handleChange = (next, index) => {
    if (value === undefined) setInner(next);
    onChange?.(next, index);
  };

  const items = filters.map((filter) => ({
    value: filter.value,
    icon: filter.icon,
    label: (
      <span className="filter-badges__label">
        {filter.label}
        {typeof filter.count === 'number' && (
          <span className="filter-badges__count">{filter.count}</span>
        )}
      </span>
    )
  }));

  return (
    <div className={`filter-badges scrollbar-none${className ? ` ${className}` : ''}`}>
      <RubberSegment
        aria-label="Filter results"
        items={items}
        value={active}
        defaultValue={defaultFilter ?? filters[0]?.value}
        onChange={handleChange}
        size={size}
        trackColor="var(--fb-track)"
        thumbColor="var(--fb-thumb)"
        textColor="var(--fb-ink)"
        activeTextColor="var(--fb-ink-active)"
        equalSlots={false}
        radius={999}
        draggable
        speed={1}
      />
    </div>
  );
}
