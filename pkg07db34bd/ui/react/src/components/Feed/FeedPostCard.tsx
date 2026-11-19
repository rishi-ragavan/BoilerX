/*
 * Feed row (Lane C owns Feed*). X-style flat row: 40px avatar left; content column right with Lane D's
 * IdentityAuthorLine (+ relative time), space label, title, 3-line body, topic chips, and the action row.
 * The whole row opens the post (stretched title link); buttons and links inside sit above it.
 *
 * Lead rules: no likes; no topic tags; tagged experts are never listed — only `expertCount`
 * (plus a gold "You were tagged" marker when the viewer is one of them).
 */
import { Link } from 'react-router';
import { Lock, MessageCircle, Target, UsersRound } from 'lucide-react';
import type { PostView } from '@/Interfaces';
import { IdentityAuthorLine } from '@/components/Identity/IdentityAuthorLine';
import { ShellAvatar } from '@/components/Shell/ShellAvatar';
import './FeedStyles.css';

// eslint-disable-next-line react-refresh/only-export-components
export function spaceLabel(post: Pick<PostView, 'space' | 'department'>): string {
  const dept = post.department ? ` · ${post.department}` : '';
  switch (post.space) {
    case 'STUDENT':
      return `Student${dept}`;
    case 'EXPERTS':
      return `Experts${dept}`;
    case 'ALUMNI':
      return `Alumni${dept}`;
    default:
      return post.department ?? '';
  }
}

export function FeedPostCard({
  post,
  highlight = false,
}: {
  post: PostView;
  /** Brief gold left-border flash for a post the user just created. */
  highlight?: boolean;
}) {
  const space = spaceLabel(post);
  const replyCount = post.replyCount ?? 0;
  const expertCount = post.expertCount ?? 0;

  return (
    <article className={`bc-post ${highlight ? 'bc-post--new' : ''}`} aria-labelledby={`bc-post-title-${post.id}`}>
      <ShellAvatar name={post.author.displayName} anonymous={post.author.isAnonymous} />

      <div className="bc-post__content">
        <div className="bc-post__author">
          <IdentityAuthorLine author={post.author} createdAt={post.createdAt} />
        </div>

        {space && (
          <p className="bc-post__space">
            {space}
          </p>
        )}

        <h2 id={`bc-post-title-${post.id}`} className="bc-post__title">
          <Link to={`/post/${post.id}`} className="bc-post__link">
            {post.title}
          </Link>
        </h2>
        {post.body && <p className="bc-post__body">{post.body}</p>}


        {post.viewerIsMatchedExpert && (
          <p className="bc-post__tagged">
            <Target size={14} aria-hidden />
            Question for you
          </p>
        )}

        <div className="bc-post__actions">
          <Link
            to={`/post/${post.id}`}
            className="bc-action"
            aria-label={`View ${replyCount} ${replyCount === 1 ? 'comment' : 'comments'}`}
          >
            <span className="bc-action__icon">
              <MessageCircle size={18} aria-hidden />
            </span>
            <span className="bc-action__count">
              {replyCount ? `View ${replyCount} ${replyCount === 1 ? 'comment' : 'comments'}` : 'Reply'}
            </span>
          </Link>

          {expertCount > 0 ? (
            <span className="bc-action bc-action--static" title="Tagged experts stay private to protect anonymous answers">
              <span className="bc-action__icon">
                <UsersRound size={18} aria-hidden />
              </span>
              <span className="bc-action__count">
                {expertCount} {expertCount === 1 ? 'expert' : 'experts'} tagged
              </span>
            </span>
          ) : (
            <span className="bc-action bc-action--spacer" aria-hidden />
          )}

          {post.visibility === 'EXPERTS_ONLY' ? (
            <span className="bc-action bc-action--static" title="Visible only to you and the matched experts">
              <span className="bc-action__icon">
                <Lock size={18} aria-hidden />
              </span>
              <span className="bc-action__count">Experts only</span>
            </span>
          ) : (
            <span className="bc-action bc-action--spacer" aria-hidden />
          )}
        </div>
      </div>
    </article>
  );
}
