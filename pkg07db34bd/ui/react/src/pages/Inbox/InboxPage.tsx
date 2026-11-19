/* "Questions for you" (Lane D). Step 0 placeholder wired to ForumApi.inbox. */
import { ForumApi } from '@/api/boilerApi';
import { useApi } from '@/hooks/useApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import { FeedPostCard } from '@/components/Feed/FeedPostCard';
import { ShellPageHeader, ShellStatus } from '@/components/Shell/ShellStatus';

export function InboxPage() {
  const { actingMemberId } = usePersona();
  const { data, loading, error } = useApi(() => ForumApi.inbox(actingMemberId), [actingMemberId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ShellPageHeader title="Questions for you" />
      <ShellStatus loading={loading} error={error} empty={!data?.length} emptyText="No one has tagged you yet.">
        {data?.map((p) => <FeedPostCard key={p.id} post={p} />)}
      </ShellStatus>
    </div>
  );
}
