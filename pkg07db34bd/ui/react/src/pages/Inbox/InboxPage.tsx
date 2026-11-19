/* "Questions for you" (Lane D). Route: /inbox. Calls ForumApi.inbox(actingMemberId): posts where the viewer is a matched expert. */
import { ForumApi } from '@/api/boilerApi';
import { useApi } from '@/hooks/useApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import { InboxRow } from '@/components/Inbox/InboxRow';
import { ShellPageHeader, ShellStatus } from '@/components/Shell/ShellStatus';

export function InboxPage() {
  const { actingMemberId } = usePersona();
  const { data, loading, error } = useApi(() => ForumApi.inbox(actingMemberId), [actingMemberId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ShellPageHeader title="Questions for you">
        <p className="px-4 pb-3 text-sm text-muted-foreground">The community thinks you can help with these.</p>
      </ShellPageHeader>
      <ShellStatus
        loading={loading}
        error={error}
        empty={!data?.length}
        emptyText="No one has tagged you yet. When a question matches your expertise, it shows up here."
      >
        {data?.map((p) => <InboxRow key={p.id} post={p} viewerId={actingMemberId} />)}
      </ShellStatus>
    </div>
  );
}
