/*
 * Right column (Lane C owns Shell*): decorative "Search BoilerConnect" pill and, for professors and alumni only,
 * a "Questions for you" panel (up to 5 questions they were tagged on, from ForumApi.inbox). Students are never
 * tagged, so they get no panel. No member lists, reputation, or topic tags (lead rules).
 */
import { Link } from 'react-router';
import { Search } from 'lucide-react';
import { ForumApi } from '@/api/boilerApi';
import { canBeTagged } from '@/Interfaces';
import { useApi } from '@/hooks/useApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import { useShell } from '@/components/Shell/ShellContext';

const MAX_ROWS = 5;

function QuestionsForYouCard() {
  const { actingMemberId } = usePersona();
  const { postsVersion } = useShell();
  const { data, loading, error } = useApi(() => ForumApi.inbox(actingMemberId), [actingMemberId, postsVersion]);
  const rows = (data ?? []).slice(0, MAX_ROWS);

  return (
    <section className="bc-card" aria-labelledby="bc-qfy">
      <h2 id="bc-qfy" className="bc-card__heading">
        Questions for you
      </h2>
      {loading && !data && <p className="bc-card__muted">Loading…</p>}
      {error && <p className="bc-card__muted">Couldn&apos;t load your questions: {error}</p>}
      {data && !rows.length && <p className="bc-card__muted">No one has tagged you yet.</p>}
      {rows.map((p) => (
        <Link key={p.id} to={`/post/${p.id}`} className="bc-card__row bc-card__row--stack">
          <span className="bc-card__row-title">{p.title}</span>
          <span className="bc-card__row-sub">
            {p.replyCount ?? 0} {p.replyCount === 1 ? 'comment' : 'comments'}
            {p.visibility === 'EXPERTS_ONLY' ? ' · experts only' : ''}
          </span>
        </Link>
      ))}
      {(data?.length ?? 0) > MAX_ROWS && (
        <Link to="/inbox" className="bc-card__row bc-card__row--stack">
          <span className="bc-card__row-sub">See all {data?.length}</span>
        </Link>
      )}
    </section>
  );
}

export function ShellRightRail() {
  const { actingMember } = usePersona();
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
        {canBeTagged(actingMember) && <QuestionsForYouCard />}
        <p className="bc-rail__footer">BoilerConnect · Built on the C3 Agentic AI Platform</p>
      </div>
    </aside>
  );
}
