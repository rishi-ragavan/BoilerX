/*
 * "Your profile" card (Lane D). Shows ONLY the acting member's own profile, and never their real name:
 * names are used on the backend for Purdue identity checks only. Shows how they appear to others (handle, Expert /
 * Alumni tag, flair), department or employer, and bio. Students have no tag and no listed expertise.
 */
import { Building2, EyeOff, ShieldCheck } from 'lucide-react';
import type { MemberView } from '@/Interfaces';
import { IdentityTag } from '@/components/Identity/IdentityBadge';

function publicHandle(m: MemberView): string {
  if (m.role === 'FACULTY') return 'Purdue professor';
  if (m.role === 'ALUMNI') return 'Purdue alum';
  return 'Boiler ····';
}

export function ProfileCard({ member: m }: { member: MemberView }) {
  const affiliation = m.role === 'ALUMNI' ? m.employer || m.department : m.department;
  return (
    <section className="flex flex-col gap-4 p-4">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex size-20 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <ShieldCheck className="size-9" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">You appear as</p>
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold text-foreground">
            {publicHandle(m)} <IdentityTag tag={m.tag} />
          </h2>
          {m.flair && <p className="text-sm text-muted-foreground">{m.flair}</p>}
          {m.role === 'STUDENT' && (
            <p className="text-sm text-muted-foreground">A new 4-character handle in every thread, so threads can&apos;t be linked.</p>
          )}
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden />
        Your name is only used to confirm you&apos;re part of Purdue. It is never shown to anyone, so you can ask and
        answer freely.
      </p>

      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        {affiliation && (
          <li className="inline-flex items-center gap-1">
            <Building2 className="size-4" /> {affiliation}
          </li>
        )}
      </ul>


      {m.bio && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">About (used for matching)</h3>
          <p className="text-[15px] leading-relaxed text-foreground">{m.bio}</p>
        </div>
      )}

      {m.role !== 'STUDENT' && m.tags && m.tags.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {m.role === 'FACULTY' ? 'Research interests' : 'Career'}
          </h3>
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
