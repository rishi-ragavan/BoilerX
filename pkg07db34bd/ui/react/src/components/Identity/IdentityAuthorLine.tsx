/*
 * Author line for posts, replies, and DMs: avatar · display name · role · badges · 🎯 flair · time.
 * Lane D owns Identity*; Lane C imports it. Props are frozen: IdentityAuthorLine({ author, createdAt? }).
 *
 * Anonymity: when `author.isAnonymous` is true, only displayName (+ roleLabel when it adds information) is shown,
 * with a verified-shield icon. The name never links to a profile, and badges are never rendered.
 * The server already strips identity, so this is a second safeguard.
 */
import { Link } from 'react-router';
import { ShieldCheck } from 'lucide-react';
import type { AuthorView } from '@/Interfaces';
import { IdentityBadge } from '@/components/Identity/IdentityBadge';
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

function avatarInitial(author: AuthorView): string {
  return author.displayName.replace(/^(Prof\.|Dr\.)\s*/, '').charAt(0).toUpperCase() || '?';
}

export function IdentityAuthorLine({ author, createdAt }: { author: AuthorView; createdAt?: string }) {
  const anon = author.isAnonymous;
  // Anonymous handles ("Expert · Finance", "Alum · Google") already carry the role; the API sends no roleLabel then.
  const showRole = !!author.roleLabel;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
      {anon ? (
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <ShieldCheck className="size-4" />
        </span>
      ) : (
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
        >
          {avatarInitial(author)}
        </span>
      )}

      {!anon && author.memberId ? (
        <Link to={`/profile/${author.memberId}`} className="truncate font-semibold text-foreground hover:underline">
          {author.displayName}
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 truncate font-semibold text-foreground">
          {author.displayName}
          {anon && (
            <ShieldCheck className="size-3.5 shrink-0 text-primary" aria-label="Anonymous Purdue member" />
          )}
        </span>
      )}

      {showRole && <span className="text-muted-foreground">· {author.roleLabel}</span>}
      {!anon && author.badges?.map((b) => <IdentityBadge key={b} badge={b} />)}
      <IdentityFlair flair={author.flair} />
      {createdAt && (
        <time dateTime={createdAt} title={fullTimestamp(createdAt)} className="text-muted-foreground">
          · {timeAgo(createdAt)}
        </time>
      )}
    </div>
  );
}
