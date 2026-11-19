/* Feed card (Lane C owns Feed*). Step 0 version: author line, title, tags, experts, counts. */
import { Link } from 'react-router';
import { MessageCircle, Lock } from 'lucide-react';
import { SPACE_LABELS, type PostView } from '@/Interfaces';
import { IdentityAuthorLine } from '@/components/Identity/IdentityAuthorLine';

export function FeedPostCard({ post }: { post: PostView }) {
  return (
    <article className="border-b border-border px-4 py-3 hover:bg-muted/40">
      <IdentityAuthorLine author={post.author} createdAt={post.createdAt} />
      <Link to={`/post/${post.id}`} className="mt-1 block">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {`${post.space ? SPACE_LABELS[post.space] : ''}${post.department ? ' · ' + post.department : ''}`}
          {post.visibility === 'EXPERTS_ONLY' && (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3" /> Experts only
            </span>
          )}
        </div>
        <h2 className="text-[15px] font-semibold text-foreground">{post.title}</h2>
        {post.body && <p className="mt-0.5 line-clamp-3 text-sm text-foreground">{post.body}</p>}
      </Link>
      {post.tags && post.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {post.tags.map((t) => (
            <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      )}
      {(post.expertCount ?? 0) > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">🎯 {post.expertCount} experts tagged</p>
      )}
      <Link
        to={`/post/${post.id}`}
        className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
      >
        <MessageCircle className="size-4" /> View {post.replyCount ?? 0} comments
      </Link>
    </article>
  );
}
