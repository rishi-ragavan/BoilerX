/* Home: feed tabs + post list (Lane C). Step 0 placeholder wired to ForumApi.feed; Composer comes next. */
import { useState } from 'react';
import { ForumApi } from '@/api/boilerApi';
import type { FeedTab } from '@/Interfaces';
import { useApi } from '@/hooks/useApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import { FeedPostCard } from '@/components/Feed/FeedPostCard';
import { ShellPageHeader, ShellStatus } from '@/components/Shell/ShellStatus';

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'foryou', label: 'For You' },
  { id: 'students', label: 'Student' },
  { id: 'experts', label: 'Experts' },
  { id: 'alumni', label: 'Alumni' },
];

export function HomePage() {
  const { actingMemberId } = usePersona();
  const [tab, setTab] = useState<FeedTab>('foryou');
  const { data, loading, error } = useApi(() => ForumApi.feed(actingMemberId, tab, null), [actingMemberId, tab]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ShellPageHeader title="Home">
        <div role="tablist" className="flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm hover:bg-muted ${
                tab === t.id ? 'border-b-2 border-primary font-bold text-foreground' : 'text-muted-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </ShellPageHeader>
      <div className="border-b border-border p-4 text-sm text-muted-foreground">Composer goes here (Lane C).</div>
      <ShellStatus loading={loading} error={error} empty={!data?.length} emptyText="No posts in this tab yet.">
        {data?.map((p) => <FeedPostCard key={p.id} post={p} />)}
      </ShellStatus>
    </div>
  );
}
