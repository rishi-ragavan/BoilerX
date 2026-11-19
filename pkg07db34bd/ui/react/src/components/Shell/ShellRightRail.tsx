/*
 * Right column (Lane C owns Shell*): decorative "Search BoilerConnect" pill, "Top experts" card (top 5 members by
 * reputation from ForumApi.listMembers), and "Trending tags" (most common tags across the For You feed).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import { ForumApi } from '@/api/boilerApi';
import type { PostView } from '@/Interfaces';
import { IdentityBadge } from '@/components/Identity/IdentityBadge';
import { personaSubtitle, usePersona } from '@/components/Persona/PersonaContext';
import { ShellAvatar } from '@/components/Shell/ShellAvatar';
import { useShell } from '@/components/Shell/ShellContext';

const TOP_EXPERTS = 5;
const TOP_TAGS = 6;

function TopExpertsCard() {
  const { members, loading, error } = usePersona();
  const top = useMemo(
    () => [...members].sort((a, b) => (b.reputation ?? 0) - (a.reputation ?? 0)).slice(0, TOP_EXPERTS),
    [members]
  );

  return (
    <section className="bc-card" aria-labelledby="bc-top-experts">
      <h2 id="bc-top-experts" className="bc-card__heading">
        Top experts
      </h2>
      {loading && !members.length && <p className="bc-card__muted">Loading…</p>}
      {error && <p className="bc-card__muted">Couldn&apos;t load members: {error}</p>}
      {top.map((m) => (
        <Link key={m.id} to={`/profile/${m.id}`} className="bc-card__row">
          <ShellAvatar name={m.name} />
          <span className="bc-card__row-text">
            <span className="bc-card__row-title">
              <span className="bc-card__name">{m.name}</span>
              {m.badges?.slice(0, 1).map((b) => <IdentityBadge key={b} badge={b} />)}
            </span>
            <span className="bc-card__row-sub">{m.department || personaSubtitle(m)}</span>
          </span>
          <span className="bc-card__rep" title="Reputation (likes received on replies)">
            {m.reputation ?? 0}
          </span>
        </Link>
      ))}
    </section>
  );
}

function TrendingTagsCard() {
  const { actingMemberId } = usePersona();
  const { postsVersion, setTagFilter } = useShell();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ForumApi.feed(actingMemberId, 'foryou', null)
      .then((list) => {
        if (cancelled) return;
        setPosts(list);
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [actingMemberId, postsVersion]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    (posts ?? []).forEach((p) => (p.tags ?? []).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, TOP_TAGS);
  }, [posts]);

  const openTag = (tag: string) => {
    setTagFilter(tag);
    navigate('/');
  };

  return (
    <section className="bc-card" aria-labelledby="bc-trending">
      <h2 id="bc-trending" className="bc-card__heading">
        Trending tags
      </h2>
      {posts === null && !error && <p className="bc-card__muted">Loading…</p>}
      {error && <p className="bc-card__muted">Couldn&apos;t load the feed: {error}</p>}
      {posts !== null && !tags.length && <p className="bc-card__muted">No tags yet.</p>}
      {tags.map(([tag, count]) => (
        <button key={tag} type="button" className="bc-card__row bc-card__row--stack" onClick={() => openTag(tag)}>
          <span className="bc-card__row-title">#{tag}</span>
          <span className="bc-card__row-sub">
            {count} {count === 1 ? 'post' : 'posts'}
          </span>
        </button>
      ))}
    </section>
  );
}

export function ShellRightRail() {
  return (
    <aside className="bc-rail" aria-label="Discover">
      <div className="bc-rail__inner">
        <div className="bc-search">
          <Search size={18} aria-hidden className="bc-search__icon" />
          <label htmlFor="bc-search-input" className="bc-visually-hidden">
            Search BoilerConnect
          </label>
          <input id="bc-search-input" type="search" className="bc-search__input" placeholder="Search BoilerConnect" />
        </div>
        <TopExpertsCard />
        <TrendingTagsCard />
        <p className="bc-rail__footer">BoilerConnect · Built on the C3 Agentic AI Platform</p>
      </div>
    </aside>
  );
}
