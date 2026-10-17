import React from 'react';
import { useCountUp } from '../hooks/useCountUp';

type AnimatedGaugeProps = {
  /** Final fill level, 0–100. */
  value: number;
  /** Ring radius in viewBox units. */
  radius: number;
  /** Centre coordinate; the viewBox is always a `2 * center` square. */
  center?: number;
  strokeWidth?: number;
  /** Tailwind stroke-* class for the empty track. */
  trackClassName?: string;
  /** Tailwind stroke-* (or text-*) class for the filled arc. */
  toneClassName: string;
  /** Size classes for the gauge, e.g. «w-14 h-14». */
  className?: string;
  /** Optional label rendered over the ring (usually a `Num` figure). */
  children?: React.ReactNode;
  /**
   * Normalise the dash maths to 100 units, mirroring `pathLength="100"`.
   * Needed by rings whose circumference is not the dash basis.
   */
  pathLength?: number;
  /** Rotate the arc inside the SVG instead of rotating the SVG itself. */
  rotateArc?: boolean;
  svgId?: string;
  progressId?: string;
  ariaLabel?: string;
};

/**
 * Shared circular gauge. The arc fills from empty to `value` over 800ms on
 * mount, using the same `useCountUp` easing as the `Num` label inside it, so
 * the ring and the digits move as one instrument. Newly mounted cards replay
 * the entrance; a later value change re-eases from the current fill.
 *
 * `useCountUp` immediately returns the final value under
 * `prefers-reduced-motion`, and the ring is drawn with a colour-only
 * transition because the dash offset is driven frame-by-frame.
 */
export const AnimatedGauge: React.FC<AnimatedGaugeProps> = ({
  value,
  radius,
  center = 28,
  strokeWidth = 6,
  trackClassName = 'stroke-slate-200 dark:stroke-slate-700',
  toneClassName,
  className = '',
  children,
  pathLength,
  rotateArc = false,
  svgId,
  progressId,
  ariaLabel,
}) => {
  const animatedValue = useCountUp(value);
  const dashLength = pathLength ?? 2 * Math.PI * radius;
  const side = center * 2;

  return (
    <div className={`relative ${className}`}>
      <svg
        id={svgId}
        viewBox={`0 0 ${side} ${side}`}
        className={`${className} ${rotateArc ? '' : '-rotate-90'}`}
        role={ariaLabel ? 'img' : undefined}
        aria-label={ariaLabel}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={trackClassName}
        />
        <circle
          id={progressId}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={`transition-colors duration-500 ${toneClassName}`}
          strokeDasharray={dashLength}
          strokeDashoffset={dashLength * (1 - animatedValue / 100)}
          pathLength={pathLength}
          transform={rotateArc ? `rotate(-90 ${center} ${center})` : undefined}
        />
      </svg>
      {children}
    </div>
  );
};
