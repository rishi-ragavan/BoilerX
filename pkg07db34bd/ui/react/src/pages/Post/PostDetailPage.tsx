/*
 * Post detail (Lane D). Route: /post/:postId. Calls ForumApi.getPost(actingMemberId, postId) and renders the
 * focused post, "Experts tagged" chips, the reply box, and replies (🎯 expert-flaired first, then by time).
 * EXPERTS_ONLY posts the viewer can't see show the 🔒 notice.
 */
import { useMemo, useState } from 'react';
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
import { sortReplies } from '@/components/Reply/replySort';
import type { LikeResult, PostDetailView, PostView, ReplyView } from '@/Interfaces';

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

/** Holds local post/replies state so replies and likes update without a refetch. Remounted per load. */
function PostDetailBody({ detail }: { detail: PostDetailView }) {
  const [post, setPost] = useState<PostView>(detail.post);
  const [replies, setReplies] = useState<ReplyView[]>(detail.replies ?? []);
  const sorted = useMemo(() => sortReplies(replies), [replies]);

  const onPostLike = (res: LikeResult) => setPost((p) => ({ ...p, likedByMe: res.liked, likeCount: res.count }));
  const onReplyLike = (replyId: string, res: LikeResult) =>
    setReplies((rs) => rs.map((r) => (r.id === replyId ? { ...r, likedByMe: res.liked, likeCount: res.count } : r)));
  const onReplied = (reply: ReplyView) => setReplies((rs) => [...rs, reply]);

  return (
    <>
      <PostFocused post={post} replyCount={replies.length} onLikeChange={onPostLike} />
      <ReplyComposer postId={post.id} onReplied={onReplied} />
      {sorted.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">No replies yet. Be the first to help.</p>
      ) : (
        sorted.map((r) => <ReplyCard key={r.id} reply={r} onLikeChange={onReplyLike} />)
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
