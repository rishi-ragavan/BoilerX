/*
 * Feed row (Lane C owns Feed*). X-style flat row: 40px avatar left; content column right with Lane D's
 * IdentityAuthorLine (+ relative time), space label, title, 3-line body, #tags, tagged experts, action row.
 * The whole row opens the post (stretched title link); buttons and links inside sit above it.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Heart, Lock, MessageCircle } from 'lucide-react';
import { ForumApi } from '@/api/boilerApi';
import type { PostView } from '@/Interfaces';
import { IdentityAuthorLine } from '@/components/Identity/IdentityAuthorLine';
import { usePersona } from '@/components/Persona/PersonaContext';
import { ShellAvatar } from '@/components/Shell/ShellAvatar';
import { useShell } from '@/components/Shell/ShellContext';
import './FeedStyles.css';

const EXPERT_AVATARS = 3;

// eslint-disable-next-line react-refresh/only-export-components
export function spaceLabel(post: Pick<PostView, 'space' | 'department'>): string {
  switch (post.space) {
    case 'STUDENT':
      return 'Students';
    case 'FACULTY':
      return post.department ? `Faculty · ${post.department}` : 'Faculty';
    case 'ALUMNI':
      return 'Alumni';
    default:
      return '';
  }
}

export function FeedPostCard({
  post,
  highlight = false,
  onTagClick,
}: {
  post: PostView;
  /** Brief gold left-border flash for a post the user just created. */
  highlight?: boolean;
  onTagClick?: (tag: string) => void;
}) {
  const { actingMemberId } = usePersona();
  const { toast } = useShell();
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [liking, setLiking] = useState(false);

  // Server data wins whenever the feed is re-fetched.
  useEffect(() => {
    setLiked(!!post.likedByMe);
    setLikeCount(post.likeCount ?? 0);
  }, [post.likedByMe, post.likeCount]);

  const toggleLike = async () => {
    if (liking) return;
    const prev = { liked, likeCount };
    setLiked(!liked);
    setLikeCount(likeCount + (liked ? -1 : 1));
    setLiking(true);
    try {
      const res = await ForumApi.toggleLike(actingMemberId, post.id, null);
      setLiked(res.liked);
      setLikeCount(res.count);
    } catch (err) {
      setLiked(prev.liked);
      setLikeCount(prev.likeCount);
      toast(`Couldn't update like: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLiking(false);
    }
  };

  const isArticle = post.postType === 'ARTICLE';
  const experts = post.experts ?? [];
  const tags = post.tags ?? [];
  const space = spaceLabel(post);
  const replyCount = post.replyCount ?? 0;

  return (
    <article className={`bc-post ${highlight ? 'bc-post--new' : ''}`} aria-labelledby={`bc-post-title-${post.id}`}>
      <ShellAvatar name={post.author.displayName} anonymous={post.author.isAnonymous} />

      <div className="bc-post__content">
        <div className="bc-post__author">
          <IdentityAuthorLine author={post.author} createdAt={post.createdAt} />
        </div>

        {(isArticle || space) && (
          <p className="bc-post__space">
            {isArticle && <span className="bc-post__article">Article</span>}
            {isArticle && space && <span aria-hidden> · </span>}
            {space}
          </p>
        )}

        <h2 id={`bc-post-title-${post.id}`} className={`bc-post__title ${isArticle ? 'bc-post__title--article' : ''}`}>
          <Link to={`/post/${post.id}`} className="bc-post__link">
            {post.title}
          </Link>
        </h2>
        {post.body && <p className="bc-post__body">{post.body}</p>}

        {tags.length > 0 && (
          <p className="bc-post__tags">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                className="bc-post__tag"
                onClick={() => onTagClick?.(t)}
                aria-label={`Show posts tagged ${t}`}
              >
                #{t}
              </button>
            ))}
          </p>
        )}

        {experts.length > 0 && (
          <p className="bc-post__experts" title={experts.map((e) => e.name).join(', ')}>
            <span className="bc-post__expert-stack" aria-hidden>
              {experts.slice(0, EXPERT_AVATARS).map((e) => (
                <ShellAvatar key={e.memberId} name={e.name} size="xs" className="bc-post__expert-avatar" />
              ))}
            </span>
            <span>
              +{experts.length} {experts.length === 1 ? 'expert' : 'experts'} tagged
            </span>
          </p>
        )}

        <div className="bc-post__actions">
          <Link
            to={`/post/${post.id}`}
            className="bc-action bc-action--reply"
            aria-label={`${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}. Open post`}
          >
            <span className="bc-action__icon">
              <MessageCircle size={18} aria-hidden />
            </span>
            <span className="bc-action__count">{replyCount || ''}</span>
          </Link>

          <button
            type="button"
            className={`bc-action bc-action--like ${liked ? 'bc-action--liked' : ''}`}
            aria-pressed={liked}
            aria-label={`${liked ? 'Unlike' : 'Like'} (${likeCount} ${likeCount === 1 ? 'like' : 'likes'})`}
            onClick={toggleLike}
          >
            <span className="bc-action__icon">
              <Heart size={18} aria-hidden />
            </span>
            <span className="bc-action__count">{likeCount || ''}</span>
          </button>

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
