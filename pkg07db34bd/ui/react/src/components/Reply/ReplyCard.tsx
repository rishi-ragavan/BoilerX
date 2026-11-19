/*
 * One reply on the post detail page (Lane D): author line (with 🎯 IdentityFlair when the replier is a matched
 * expert), body, relative time, and ♥ like toggle. Expert replies get a subtle gold left rule.
 */
import type { LikeResult, ReplyView } from '@/Interfaces';
import { IdentityAuthorLine } from '@/components/Identity/IdentityAuthorLine';
import { PostLikeButton } from '@/components/Post/PostLikeButton';

interface ReplyCardProps {
  reply: ReplyView;
  onLikeChange: (replyId: string, result: LikeResult) => void;
}

export function ReplyCard({ reply, onLikeChange }: ReplyCardProps) {
  const isExpert = !!reply.author.flair;
  return (
    <article
      className={`border-b border-border px-4 py-3 ${isExpert ? 'border-l-4 border-l-amber-400 bg-amber-50/40 dark:bg-amber-950/20' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <IdentityAuthorLine author={reply.author} createdAt={reply.createdAt} />
        {reply.isMine && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">You</span>
        )}
      </div>
      <p className="mt-1.5 pl-10 text-[15px] leading-relaxed whitespace-pre-wrap text-foreground">{reply.body}</p>
      <div className="mt-1 pl-9">
        <PostLikeButton
          replyId={reply.id}
          liked={!!reply.likedByMe}
          count={reply.likeCount ?? 0}
          onChange={(res) => onLikeChange(reply.id, res)}
        />
      </div>
    </article>
  );
}
