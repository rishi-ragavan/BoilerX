/*
 * "Questions for you" (Lane D). Route: /inbox. Calls ForumApi.inbox(actingMemberId): questions the viewer was tagged on.
 * Only professors and alumni are tagged; students see a short note instead.
 */
import { ForumApi } from '@/api/boilerApi';
import { canBeTagged } from '@/Interfaces';
import { useApi } from '@/hooks/useApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import { InboxRow } from '@/components/Inbox/InboxRow';
import { ShellPageHeader, ShellStatus } from '@/components/Shell/ShellStatus';

export function InboxPage() {
  const { actingMemberId, actingMember } = usePersona();
  const { data, loading, error } = useApi(() => ForumApi.inbox(actingMemberId), [actingMemberId]);

  if (actingMember && !canBeTagged(actingMember)) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ShellPageHeader title="Questions for you" />
        <p className="p-6 text-center text-sm text-muted-foreground">
          Only professors and alumni are tagged on questions, so students don&apos;t have a &quot;Questions for you&quot; list.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ShellPageHeader title="Questions for you">
        <p className="px-4 pb-3 text-sm text-muted-foreground">The community thinks you can help with these.</p>
      </ShellPageHeader>
      <ShellStatus
        loading={loading}
        error={error}
        empty={!data?.length}
        emptyText="No one has tagged you yet. When a question matches your department or interests, it shows up here."
      >
        {data?.map((p) => <InboxRow key={p.id} post={p} viewerId={actingMemberId} />)}
      </ShellStatus>
    </div>
  );
}
