/*
 * Post detail (Lane D). Route: /post/:postId. Calls ForumApi.getPost(actingMemberId, postId) and renders the
 * focused post, the "N experts tagged" summary, the reply box, and replies grouped Experts → Alumni → Students
 * (order comes from the API; a header is shown per group).
 * EXPERTS_ONLY posts the viewer can't see show the 🔒 notice.
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { ForumApi } from '@/api/boilerApi';
import { useApi } from '@/hooks/useApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import { ShellStatus } from '@/components/Shell/ShellStatus';
import { PostFocused } from '@/components/Post/PostFocused';
import { PostLockedNotice, isAccessError } from '@/components/Post/PostLockedNotice';
import { ReplyCard } from '@/components/Reply/ReplyCard';
import { ReplyComposer } from '@/components/Reply/ReplyComposer';
import { REPLY_GROUP_LABEL, insertReply } from '@/components/Reply/replySort';
import type { PostDetailView, ReplyGroup, ReplyView } from '@/Interfaces';

function PostDetailHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-6 border-b border-border bg-background/90 px-4 py-2 backdrop-blur">
      <Link to="/" aria-label="Back to feed" className="rounded-full p-2 text-foreground hover:bg-muted">
        <ArrowLeft className="size-5" />
      </Link>
      <h1 className="text-lg font-bold text-foreground">Post</h1>
    </header>
  );
}

/** Holds local replies state so a new reply shows without a refetch. Remounted per load. */
function PostDetailBody({ detail }: { detail: PostDetailView }) {
  const post = detail.post;
  const [replies, setReplies] = useState<ReplyView[]>(detail.replies ?? []);
  const onReplied = (reply: ReplyView) => setReplies((rs) => insertReply(rs, reply));

  return (
    <>
      <PostFocused post={post} replyCount={replies.length} />
      <ReplyComposer postId={post.id} onReplied={onReplied} />
      {replies.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">No replies yet. Be the first to help.</p>
      ) : (
        replies.map((r, i) => (
          <div key={r.id}>
            {(i === 0 || replies[i - 1].authorGroup !== r.authorGroup) && (
              <h3 className="border-b border-border bg-muted/40 px-4 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {REPLY_GROUP_LABEL[(r.authorGroup ?? 'STUDENT') as ReplyGroup] ?? 'Replies'}
              </h3>
            )}
            <ReplyCard reply={r} postId={post.id} postTitle={post.title} />
          </div>
        ))
      )}
    </>
  );
}

export function PostDetailPage() {
  const { postId = '' } = useParams();
  const { actingMemberId } = usePersona();
  const { data, loading, error } = useApi(() => ForumApi.getPost(actingMemberId, postId), [actingMemberId, postId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PostDetailHeader />
      {error && isAccessError(error) ? (
        <PostLockedNotice />
      ) : (
        <ShellStatus loading={loading} error={error}>
          {data?.post && <PostDetailBody key={`${actingMemberId}:${data.post.id}`} detail={data} />}
        </ShellStatus>
      )}
    </div>
  );
}
