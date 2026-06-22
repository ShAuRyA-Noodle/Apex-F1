'use client';

/**
 * Apex monogram. A wedge-A built from two strokes.
 * `animated` triggers a 1.1s stroke-draw on first paint (CSS keyframe, no JS).
 * Renders sharp at 16, 20, 28, 36px.
 */
export function ApexMonogram({
  size = 28,
  animated = false,
  className = '',
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={`${animated ? 'stroke-draw' : ''} ${className}`}
    >
      {/* Solid wedge backplate */}
      <path
        d="M16 4 L28 28 L4 28 Z"
        fill="var(--color-telemetry-red)"
        opacity={animated ? 0 : 1}
        style={animated ? { animation: 'apex-fade-in 400ms 900ms forwards' } : undefined}
      />
      {/* Cross-bar (the bar of the A) */}
      <path
        d="M10 21 L22 21"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="square"
      />
      {/* Outline strokes (the ones that animate) */}
      <path
        d="M16 4 L28 28"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="square"
      />
      <path
        d="M16 4 L4 28"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="square"
      />
    </svg>
  );
}
