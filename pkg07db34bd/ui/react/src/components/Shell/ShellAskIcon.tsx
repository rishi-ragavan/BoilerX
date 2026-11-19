/*
 * "Ask" mark (Lane C owns Shell*): a hammer raised over an anvil (Boilermakers forge answers). Built from the
 * lucide Anvil + Hammer outlines (ISC license), scaled into one 24x24 glyph so it sits with the other nav icons.
 * Stroke stays at the theme's icon weight (non-scaling stroke). Color = currentColor.
 */

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
};

export function ShellAskIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`bc-askicon ${className}`}
      aria-hidden
      focusable="false"
    >
      {/* Anvil, bottom-left */}
      <g transform="translate(0.6 7.4) scale(0.72)">
        <path {...STROKE} d="M7 10H6a4 4 0 0 1-4-4 1 1 0 0 1 1-1h4" />
        <path {...STROKE} d="M7 5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1 7 7 0 0 1-7 7H8a1 1 0 0 1-1-1z" />
        <path {...STROKE} d="M9 12v5" />
        <path {...STROKE} d="M15 12v5" />
        <path {...STROKE} d="M5 20a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3 1 1 0 0 1-1 1H6a1 1 0 0 1-1-1" />
      </g>
      {/* Hammer, top-right, mirrored so the head swings down over the anvil face */}
      <g transform="translate(23.4 0.4) scale(-0.6 0.6)">
        <path {...STROKE} d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
        <path {...STROKE} d="m18 15 4-4" />
        <path
          {...STROKE}
          d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"
        />
      </g>
    </svg>
  );
}
