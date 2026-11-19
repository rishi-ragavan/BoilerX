/*
 * Badge pill next to a (non-anonymous) name. Lane D owns Identity*; Lane C imports it.
 * Props are frozen: IdentityBadge({ badge }).
 * Colors: PROFESSOR = purple, TA = blue, CLUB_PRESIDENT = green, CAMPUS_AMBASSADOR = gold.
 */

interface BadgeStyle {
  label: string;
  icon: string;
  className: string;
}

const BADGE_STYLES: Record<string, BadgeStyle> = {
  PROFESSOR: {
    label: 'Professor',
    icon: '🎓',
    className:
      'border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-200',
  },
  TA: {
    label: 'TA',
    icon: '🧑‍🏫',
    className: 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200',
  },
  CLUB_PRESIDENT: {
    label: 'Club President',
    icon: '⭐',
    className:
      'border-green-300 bg-green-100 text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-200',
  },
  CAMPUS_AMBASSADOR: {
    label: 'Campus Ambassador',
    icon: '🚂',
    className:
      'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200',
  },
};

const FALLBACK_CLASS = 'border-border bg-muted text-foreground';

export function IdentityBadge({ badge }: { badge: string }) {
  const style = BADGE_STYLES[badge];
  const label = style?.label ?? badge.replace(/_/g, ' ').toLowerCase();
  return (
    <span
      title={label}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4 font-medium ${
        style?.className ?? FALLBACK_CLASS
      }`}
    >
      {style && <span aria-hidden>{style.icon}</span>}
      {label}
    </span>
  );
}
