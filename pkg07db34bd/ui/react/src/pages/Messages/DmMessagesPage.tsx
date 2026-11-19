/* Messages (Lane D). Step 0 placeholder wired to DmApi.listConversations (stub data). */
import { DmApi } from '@/api/boilerApi';
import { useApi } from '@/hooks/useApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import { IdentityAuthorLine } from '@/components/Identity/IdentityAuthorLine';
import { ShellPageHeader, ShellStatus } from '@/components/Shell/ShellStatus';

export function DmMessagesPage() {
  const { actingMemberId } = usePersona();
  const { data, loading, error } = useApi(() => DmApi.listConversations(actingMemberId), [actingMemberId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ShellPageHeader title="Messages" />
      <ShellStatus loading={loading} error={error} empty={!data?.length} emptyText="No conversations yet.">
        {data?.map((c) => (
          <div key={c.id} className="border-b border-border px-4 py-3">
            <IdentityAuthorLine author={c.otherParty} createdAt={c.createdAt} />
            {c.postTitle && <p className="mt-1 text-xs text-muted-foreground">Re: {c.postTitle}</p>}
            <p className="mt-1 text-sm text-foreground">{c.lastMessage}</p>
          </div>
        ))}
      </ShellStatus>
    </div>
  );
}
