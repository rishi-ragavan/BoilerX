/*
 * Avatars (Lane C owns Shell*; Lane D may import). Named members: initials circle. Anonymous authors: black circle
 * with a gold ring and a gold "B" (for Boiler), so anonymity reads as intentional, not broken.
 */

export type ShellAvatarSize = 'xs' | 'sm' | 'md';

// eslint-disable-next-line react-refresh/only-export-components
export function initials(name?: string | null): string {
  if (!name) return '?';
  const words = name
    .replace(/^(Prof\.|Dr\.)\s*/i, '')
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '?').slice(0, 1);
  return letters.toUpperCase();
}

export function ShellAvatar({
  name,
  anonymous = false,
  size = 'md',
  className = '',
}: {
  name?: string | null;
  anonymous?: boolean;
  size?: ShellAvatarSize;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`bc-avatar bc-avatar--${size} ${anonymous ? 'bc-avatar--anon' : ''} ${className}`}
      title={anonymous ? 'Anonymous Boiler' : (name ?? undefined)}
    >
      {anonymous ? 'B' : size === 'xs' ? initials(name).slice(0, 1) : initials(name)}
    </span>
  );
}
