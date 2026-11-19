/*
 * "Display name · role · badges · flair · time" line for posts and replies (Lane D owns Identity*; Lane C imports).
 * Badges are hidden for anonymous authors; the server already strips identity, this is belt-and-braces.
 */
import { Link } from 'react-router';
import type { AuthorView } from '@/Interfaces';
import { IdentityBadge } from '@/components/Identity/IdentityBadge';
import { IdentityFlair } from '@/components/Identity/IdentityFlair';

export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function IdentityAuthorLine({ author, createdAt }: { author: AuthorView; createdAt?: string }) {
  const initial = author.isAnonymous ? '🚂' : author.displayName.replace(/^Prof\.\s*/, '').charAt(0);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground"
      >
        {initial}
      </span>
      {!author.isAnonymous && author.memberId ? (
        <Link to={`/profile/${author.memberId}`} className="font-semibold text-foreground hover:underline">
          {author.displayName}
        </Link>
      ) : (
        <span className="font-semibold text-foreground">{author.displayName}</span>
      )}
      {author.roleLabel && <span className="text-muted-foreground">· {author.roleLabel}</span>}
      {!author.isAnonymous && author.badges?.map((b) => <IdentityBadge key={b} badge={b} />)}
      <IdentityFlair flair={author.flair} />
      {createdAt && <span className="text-muted-foreground">· {timeAgo(createdAt)}</span>}
    </div>
  );
}
