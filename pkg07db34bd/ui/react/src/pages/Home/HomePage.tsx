/*
 * Home (Lane C): sticky blurred header with feed tabs (+ department chips on the three space tabs), the composer,
 * and the feed.
 * Calls ForumApi.feed(actingMemberId, tab, dept); re-fetches when the tab, department, or persona changes.
 * A broken call surfaces as an inline error (no mock fallback).
 */
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ForumApi } from '@/api/boilerApi';
import type { FeedTab, PostView, Space } from '@/Interfaces';
import { ComposerBox } from '@/components/Composer/ComposerBox';
import { FeedPostCard } from '@/components/Feed/FeedPostCard';
import { FeedDeptChips, FeedTabs } from '@/components/Feed/FeedTabs';
import { usePersona } from '@/components/Persona/PersonaContext';
import { useShell } from '@/components/Shell/ShellContext';
import { ShellEmptyState, ShellErrorBox, ShellPageHeader, ShellSkeleton } from '@/components/Shell/ShellStatus';

const EMPTY_TEXT: Record<FeedTab, string> = {
  foryou: 'Be the first to ask Purdue something.',
  students: 'No peer or campus-life questions yet.',
  faculty: 'No academic or research posts here yet.',
  professors: 'No academic or research posts here yet.',
  alumni: 'No career or industry posts yet.',
  articles: 'Faculty and alumni articles will show up here.',
};

const SPACE_OF_TAB: Partial<Record<FeedTab, Space>> = {
  students: 'STUDENT',
  faculty: 'FACULTY',
  professors: 'FACULTY',
  alumni: 'ALUMNI',
};

/** Would a freshly created post appear in this tab? (Mirrors ForumApi.feed: spaces show questions + articles.) */
function belongsInTab(post: PostView, tab: FeedTab, dept: string | null): boolean {
  if (post.visibility !== 'PUBLIC') return false;
  if (dept && post.department !== dept) return false;
  if (tab === 'articles') return post.postType === 'ARTICLE';
  const space = SPACE_OF_TAB[tab];
  return space ? post.space === space : true;
}

export function HomePage() {
  const { actingMemberId } = usePersona();
  const { tagFilter, setTagFilter, requestCompose } = useShell();
  const [tab, setTab] = useState<FeedTab>('foryou');
  const [dept, setDept] = useState<string | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [posts, setPosts] = useState<PostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [newPostId, setNewPostId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ForumApi.feed(actingMemberId, tab, SPACE_OF_TAB[tab] ? dept : null)
      .then((list) => {
        if (cancelled) return;
        setPosts(list);
        setError(null);
        // Department chips come from the unfiltered results of the current space tab.
        if (SPACE_OF_TAB[tab] && !dept) {
          const seen = new Set<string>();
          list.forEach((p) => p.department && seen.add(p.department));
          setDepartments([...seen].sort((a, b) => a.localeCompare(b)));
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [actingMemberId, tab, dept, reloadKey]);

  // Fade the "just posted" highlight.
  useEffect(() => {
    if (!newPostId) return undefined;
    const t = window.setTimeout(() => setNewPostId(null), 2600);
    return () => window.clearTimeout(t);
  }, [newPostId]);

  const changeTab = (next: FeedTab) => {
    if (next === tab) return;
    setTab(next);
    setDept(null);
    setDepartments([]);
  };

  const onPosted = (post: PostView) => {
    if (!belongsInTab(post, tab, dept)) return;
    setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
    setNewPostId(post.id);
  };

  const visible = useMemo(
    () => (tagFilter ? posts.filter((p) => (p.tags ?? []).includes(tagFilter)) : posts),
    [posts, tagFilter]
  );

  return (
    <div className="bc-home">
      <ShellPageHeader title="Home">
        <FeedTabs value={tab} onChange={changeTab} />
        {SPACE_OF_TAB[tab] && <FeedDeptChips departments={departments} value={dept} onChange={setDept} />}
        {tagFilter && (
          <div className="bc-filterbar">
            <span>
              Showing posts about <strong className="bc-filterbar__tag">{tagFilter}</strong>
            </span>
            <button type="button" className="bc-iconbtn" aria-label="Clear tag filter" onClick={() => setTagFilter(null)}>
              <X size={18} aria-hidden />
            </button>
          </div>
        )}
      </ShellPageHeader>

      <ComposerBox onPosted={onPosted} />

      <div id="bc-feed-panel" role="tabpanel" aria-labelledby={`bc-tab-${tab}`} aria-busy={loading}>
        {loading ? (
          <ShellSkeleton />
        ) : error ? (
          <>
            <ShellErrorBox title="Couldn't load the feed" message={error} />
            <div className="bc-home__retry">
              <button type="button" className="bc-btn bc-btn--outline" onClick={() => setReloadKey((k) => k + 1)}>
                Try again
              </button>
            </div>
          </>
        ) : visible.length === 0 ? (
          <ShellEmptyState
            heading="Nothing here yet"
            text={tagFilter ? `No posts about ${tagFilter} in this tab.` : EMPTY_TEXT[tab]}
            actionLabel="Ask a question"
            onAction={requestCompose}
          />
        ) : (
          visible.map((p) => (
            <FeedPostCard key={p.id} post={p} highlight={p.id === newPostId} onTagClick={setTagFilter} />
          ))
        )}
      </div>
    </div>
  );
}
