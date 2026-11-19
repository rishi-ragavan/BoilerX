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
            {post.experts && post.experts.length > 0 && (
              <div className="mt-3 flex flex-col gap-1">
                <p className="text-xs font-semibold text-muted-foreground">🎯 Experts tagged</p>
                {post.experts.map((e) => (
                  <p key={e.memberId} className="text-sm text-foreground">
                    <span className="font-semibold">{e.name}</span>{' '}
                    <span className="text-muted-foreground">
                      · {e.roleLabel} — {e.reason}
                    </span>
                  </p>
                ))}
              </div>
            )}
          </article>
        )}
        {data?.replies?.map((r) => (
          <div key={r.id} className="border-b border-border px-4 py-3">
            <IdentityAuthorLine author={r.author} createdAt={r.createdAt} />
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{r.body}</p>
          </div>
        ))}
        <p className="p-4 text-sm text-muted-foreground">Reply box, likes, and DM button come next (Lane D).</p>
      </ShellStatus>
    </div>
  );
}
