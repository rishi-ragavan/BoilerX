/* Badge pill next to a (non-anonymous) name (Lane D owns Identity*; Lane C imports it). */

const BADGE_LABELS: Record<string, string> = {
  PROFESSOR: '🎓 Professor',
  TA: '🧑‍🏫 TA',
  CLUB_PRESIDENT: '⭐ Club President',
  CAMPUS_AMBASSADOR: '🚂 Campus Ambassador',
};

export function IdentityBadge({ badge }: { badge: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
      {BADGE_LABELS[badge] ?? badge}
    </span>
  );
}
