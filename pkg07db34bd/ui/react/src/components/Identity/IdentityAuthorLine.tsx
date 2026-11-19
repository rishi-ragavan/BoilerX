/*
 * Author line for posts, replies, and DMs: anonymous avatar · handle · role · 🎯 flair · time.
 * Lane D owns Identity*; Lane C imports it. Props are frozen: IdentityAuthorLine({ author, createdAt? }).
 *
 * Product rule: the frontend NEVER shows a real name. Names exist only on the backend for Purdue identity checks.
 *  - Anonymous authors show their handle ("Boiler a3f1", "Expert · Finance", "Alum · Google").
 *  - If the API ever sends a named author (isAnonymous=false), the name is NOT rendered: we fall back to the
 *    role label ("Expert · Finance"), so a server regression can't leak a name.
 *  - No profile links and no badges (a "Professor" badge next to a department narrows who it is).
 */
import { ShieldCheck } from 'lucide-react';
import type { AuthorView } from '@/Interfaces';
import { IdentityFlair } from '@/components/Identity/IdentityFlair';

/** Compact relative time like X: "now", "5m", "3h", "2d", then "Mar 4". */
// eslint-disable-next-line react-refresh/only-export-components
export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d`;
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Full timestamp, e.g. "3:42 PM · Nov 19, 2026". */
// eslint-disable-next-line react-refresh/only-export-components
export function fullTimestamp(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${time} · ${date}`;
}

/**
 * The only text the UI may show for a person: their anonymous handle, never a real name.
 * Lane C: use this for avatars/labels too (e.g. ShellAvatar) instead of `author.displayName`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function anonymousHandle(author: AuthorView): { handle: string; role: string | null } {
  if (author.isAnonymous) return { handle: author.displayName, role: author.roleLabel ?? null };
  return { handle: author.roleLabel || 'Purdue member', role: null };
}

export function IdentityAuthorLine({ author, createdAt }: { author: AuthorView; createdAt?: string }) {
  const { handle, role } = anonymousHandle(author);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <ShieldCheck className="size-4" />
      </span>
      <span className="inline-flex min-w-0 items-center gap-1 truncate font-semibold text-foreground">
        {handle}
        <ShieldCheck className="size-3.5 shrink-0 text-primary" aria-label="Anonymous Purdue member" />
      </span>
      {role && <span className="text-muted-foreground">· {role}</span>}
      <IdentityFlair flair={author.flair} />
      {createdAt && (
        <time dateTime={createdAt} title={fullTimestamp(createdAt)} className="text-muted-foreground">
          · {timeAgo(createdAt)}
        </time>
      )}
    </div>
  );
}
