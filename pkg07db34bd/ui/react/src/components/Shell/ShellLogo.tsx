/*
 * Purdue-style slanted block "P" mark (Lane C owns Shell*). Inline SVG, colored by CSS (`.bc-logo` uses --gold),
 * so it follows the theme. Used in the left-nav wordmark (full and collapsed) in place of the old train emoji.
 * A stylized stand-in: swap the path for the official Purdue Motion P asset if the team gets brand approval.
 */

export function ShellPurdueP({ className = '', title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`bc-logo ${className}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {/* Heavy P with a counter (evenodd), slanted forward like the Motion P. */}
      <path
        transform="translate(5.5 0) skewX(-12)"
        fillRule="evenodd"
        d="M5 3h15.5a8.5 8.5 0 0 1 0 17H14v9H5V3Zm9 6.5v4h5.5a2 2 0 0 0 0-4H14Z"
      />
    </svg>
  );
}
