/*
 * One reply on the post detail page (Lane D): author line (Expert/Alumni tag + flair), body, and relative time.
 * A professor can click a student's handle here to DM them (DmAuthorLine).
 */
import type { ReplyView } from '@/Interfaces';
import { DmAuthorLine } from '@/components/Dm/DmAuthorLine';

interface ReplyCardProps {
  reply: ReplyView;
  postId: string;
  postTitle: string;
}

export function ReplyCard({ reply, postId, postTitle }: ReplyCardProps) {
  return (
    <article className="border-b border-border px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <DmAuthorLine
          author={reply.author}
          createdAt={reply.createdAt}
          postId={postId}
          postTitle={postTitle}
          replyId={reply.id}
          isMine={reply.isMine}
        />
        {reply.isMine && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">You</span>
        )}
      </div>
      <p className="mt-1.5 pl-10 text-[15px] leading-relaxed whitespace-pre-wrap text-foreground">{reply.body}</p>
    </article>
  );
}
