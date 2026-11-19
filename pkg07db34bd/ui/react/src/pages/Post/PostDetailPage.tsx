/* Post detail (Lane D). Step 0 placeholder wired to ForumApi.getPost: post, expert chips, replies with flair. */
import { useParams } from 'react-router';
import { ForumApi } from '@/api/boilerApi';
import { useApi } from '@/hooks/useApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import { IdentityAuthorLine } from '@/components/Identity/IdentityAuthorLine';
import { ShellPageHeader, ShellStatus } from '@/components/Shell/ShellStatus';

export function PostDetailPage() {
  const { postId = '' } = useParams();
  const { actingMemberId } = usePersona();
  const { data, loading, error } = useApi(() => ForumApi.getPost(actingMemberId, postId), [actingMemberId, postId]);
  const post = data?.post;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ShellPageHeader title="Post" />
      <ShellStatus loading={loading} error={error}>
        {post && (
          <article className="border-b border-border p-4">
            <IdentityAuthorLine author={post.author} createdAt={post.createdAt} />
            <h2 className="mt-2 text-xl font-bold text-foreground">{post.title}</h2>
            {post.body && <p className="mt-2 whitespace-pre-wrap text-[15px] text-foreground">{post.body}</p>}
            {(post.expertCount ?? 0) > 0 && (
              <p className="mt-3 text-xs font-semibold text-muted-foreground">🎯 {post.expertCount} experts tagged</p>
            )}
            {post.experts?.[0] && (
              <p className="mt-1 text-sm text-foreground">You were tagged: {post.experts[0].reason}</p>
            )}
          </article>
        )}
        {data?.replies?.map((r, i, all) => (
          <div key={r.id} className="border-b border-border px-4 py-3">
            {(i === 0 || all[i - 1].authorGroup !== r.authorGroup) && (
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                {r.authorGroup === 'EXPERTS' ? 'Experts' : r.authorGroup === 'ALUMNI' ? 'Alumni' : 'Students'}
              </p>
            )}
            <IdentityAuthorLine author={r.author} createdAt={r.createdAt} />
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{r.body}</p>
          </div>
        ))}
        <p className="p-4 text-sm text-muted-foreground">Reply box and DM button come next (Lane D).</p>
      </ShellStatus>
    </div>
  );
}
