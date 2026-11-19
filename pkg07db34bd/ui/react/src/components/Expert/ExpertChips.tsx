/*
 * "Experts tagged" summary on the post detail page (Lane D).
 * Lead rule: tagged experts are NEVER listed (it would de-anonymize anonymous 🎯 replies). Everyone sees the count;
 * a viewer who was tagged also sees why (`post.experts` holds only their own match).
 */
import { Target } from 'lucide-react';
import type { ExpertView } from '@/Interfaces';

export function ExpertChips({ count, mine }: { count: number; mine?: ExpertView | null }) {
  if (!count) return null;
  return (
    <section aria-label="Experts tagged" className="flex flex-col gap-1">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Target className="size-3.5" /> {count} {count === 1 ? 'expert' : 'experts'} tagged
      </h3>
      {mine && (
        <p className="text-sm text-foreground">
          <span className="font-semibold">You were tagged:</span> {mine.reason || 'your expertise matches this question.'}
        </p>
      )}
    </section>
  );
}
