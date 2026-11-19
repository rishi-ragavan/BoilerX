/*
 * "Experts tagged" chips on the post detail page (Lane D).
 * One chip per matched expert: name, role label, department. The AI's one-line match reason shows in a tooltip.
 * Clicking a chip opens the expert's profile.
 */
import { Link } from 'react-router';
import { Target } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ExpertView } from '@/Interfaces';
import { IdentityBadge } from '@/components/Identity/IdentityBadge';

function initial(name: string): string {
  return name.replace(/^(Prof\.|Dr\.)\s*/, '').charAt(0).toUpperCase() || '?';
}

export function ExpertChip({ expert }: { expert: ExpertView }) {
  const sub = [expert.roleLabel, expert.department && !expert.roleLabel?.includes(expert.department) ? expert.department : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={`/profile/${expert.memberId}`}
          className="flex max-w-full items-center gap-2 rounded-full border border-border bg-card py-1 pr-3 pl-1 text-left transition-colors hover:bg-muted"
        >
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
          >
            {initial(expert.name)}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
              {expert.name}
              {expert.badges?.includes('PROFESSOR') && <IdentityBadge badge="PROFESSOR" />}
            </span>
            {sub && <span className="truncate text-xs text-muted-foreground">{sub}</span>}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="font-semibold">Why {expert.name} was tagged</p>
        <p>{expert.reason || 'Matched on department and expertise tags.'}</p>
        {typeof expert.score === 'number' && <p className="mt-1 opacity-80">Match score {Math.round(expert.score)}/100</p>}
      </TooltipContent>
    </Tooltip>
  );
}

export function ExpertChips({ experts }: { experts: ExpertView[] }) {
  if (!experts.length) return null;
  return (
    <section aria-label="Experts tagged" className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Target className="size-3.5" /> Experts tagged · {experts.length}
      </h3>
      <div className="flex flex-wrap gap-2">
        {experts.map((e) => (
          <ExpertChip key={e.memberId} expert={e} />
        ))}
      </div>
    </section>
  );
}
