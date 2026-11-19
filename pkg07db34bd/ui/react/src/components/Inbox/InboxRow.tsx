/*
 * One "Questions for you" row (Lane D): title, the asker's author line, why the viewer was matched
 * (their own entry in post.experts), and a 🔒 marker for experts-only posts. Clicking opens the post.
 */
import { Link } from 'react-router';
import { Lock, MessageCircle, Target } from 'lucide-react';
import type { PostView } from '@/Interfaces';
import { IdentityAuthorLine } from '@/components/Identity/IdentityAuthorLine';
import { PostSpacePill } from '@/components/Post/PostSpacePill';

export function InboxRow({ post, viewerId }: { post: PostView; viewerId: string }) {
  const me = post.experts?.find((e) => e.memberId === viewerId);
  return (
    <article className="border-b border-border px-4 py-3 hover:bg-muted/40">
      <IdentityAuthorLine author={post.author} createdAt={post.createdAt} />
      <Link to={`/post/${post.id}`} className="mt-1.5 block pl-10">
        <div className="flex flex-wrap items-center gap-1.5">
          <PostSpacePill post={post} />
          {post.visibility === 'EXPERTS_ONLY' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              <Lock className="size-3" /> Experts only
            </span>
          )}
        </div>
        <h2 className="mt-1 text-[15px] font-semibold text-foreground hover:underline">{post.title}</h2>
        {me?.reason && (
          <p className="mt-1.5 flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            <Target className="mt-0.5 size-3.5 shrink-0" />
            <span>
              <span className="font-semibold">Why you: </span>
              {me.reason}
            </span>
          </p>
        )}
        <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MessageCircle className="size-3.5" /> {post.replyCount ?? 0} replies
        </span>
      </Link>
    </article>
  );
}
