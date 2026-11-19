/*
 * The post in X's "focused tweet" style (Lane D): author line, space pill, large title + full body,
 * full timestamp, comment count, and the "N experts tagged" summary (no likes; tagged experts never listed).
 */
import { Lock, MessageCircle } from 'lucide-react';
import type { PostView } from '@/Interfaces';
import { IdentityAuthorLine, fullTimestamp } from '@/components/Identity/IdentityAuthorLine';
import { ExpertChips } from '@/components/Expert/ExpertChips';
import { PostSpacePill } from '@/components/Post/PostSpacePill';

interface PostFocusedProps {
  post: PostView;
  replyCount: number;
}

export function PostFocused({ post, replyCount }: PostFocusedProps) {
  return (
    <article className="flex flex-col gap-3 border-b border-border px-4 pt-3 pb-2">
      <div className="flex items-start justify-between gap-2">
        <IdentityAuthorLine author={post.author} />
        {post.isMine && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Your post</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <PostSpacePill post={post} />
        {post.visibility === 'EXPERTS_ONLY' && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            <Lock className="size-3" /> Experts only
          </span>
        )}
      </div>

      <h2 className="text-2xl leading-snug font-bold text-foreground">{post.title}</h2>
      {post.body && <p className="text-[17px] leading-relaxed whitespace-pre-wrap text-foreground">{post.body}</p>}


      {post.createdAt && (
        <time dateTime={post.createdAt} className="text-sm text-muted-foreground">
          {fullTimestamp(post.createdAt)}
        </time>
      )}

      {(post.expertCount ?? 0) > 0 && (
        <div className="border-t border-border pt-3">
          <ExpertChips count={post.expertCount ?? 0} mine={post.viewerIsMatchedExpert ? post.experts?.[0] : null} />
        </div>
      )}

      <div className="flex items-center gap-6 border-t border-border pt-1">
        <span className="inline-flex items-center gap-1 px-1 text-xs text-muted-foreground">
          <span className="p-1.5">
            <MessageCircle className="size-4" />
          </span>
          {replyCount} {replyCount === 1 ? 'comment' : 'comments'}
        </span>
      </div>
    </article>
  );
}
