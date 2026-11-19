/*
 * Member profile card (Lane D): name, role, level, department/employer, badges, bio,
 * expertise tags, and reputation. Data comes from ForumApi.getMember (a MemberView, never the entity).
 */
import { Building2, GraduationCap, Star } from 'lucide-react';
import type { MemberView } from '@/Interfaces';
import { IdentityBadge } from '@/components/Identity/IdentityBadge';

const ROLE_LABEL: Record<string, string> = { STUDENT: 'Student', FACULTY: 'Expert', ALUMNI: 'Alum' };
const LEVEL_LABEL: Record<string, string> = {
  UG: 'Undergraduate',
  MS: "Master's student",
  PHD: 'PhD student',
  FACULTY: 'Expert',
  ALUMNI: 'Alumni',
};

function initial(name: string): string {
  return name.replace(/^(Prof\.|Dr\.)\s*/, '').charAt(0).toUpperCase() || '?';
}

export function ProfileCard({ member: m, isMe }: { member: MemberView; isMe: boolean }) {
  const affiliation = m.role === 'ALUMNI' ? m.employer || m.department : m.department;
  return (
    <section className="flex flex-col gap-4 p-4">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex size-20 shrink-0 items-center justify-center rounded-full bg-accent text-3xl font-bold text-accent-foreground"
        >
          {initial(m.name)}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold text-foreground">
            {m.name}
            {isMe && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">You</span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">{m.roleLabel ?? ROLE_LABEL[m.role] ?? m.role}</p>
        </div>
      </div>

      {m.badges && m.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {m.badges.map((b) => (
            <IdentityBadge key={b} badge={b} />
          ))}
        </div>
      )}

      {m.bio && <p className="text-[15px] leading-relaxed text-foreground">{m.bio}</p>}

      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <li className="inline-flex items-center gap-1">
          <GraduationCap className="size-4" /> {LEVEL_LABEL[m.level] ?? m.level}
        </li>
        {affiliation && (
          <li className="inline-flex items-center gap-1">
            <Building2 className="size-4" /> {affiliation}
          </li>
        )}
        <li className="inline-flex items-center gap-1">
          <Star className="size-4" /> <span className="font-semibold text-foreground">{m.reputation ?? 0}</span> reputation
        </li>
      </ul>

      {m.tags && m.tags.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Expertise</h3>
          <div className="flex flex-wrap gap-1.5">
            {m.tags.map((t) => (
              <span key={t} className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-sm text-foreground">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
