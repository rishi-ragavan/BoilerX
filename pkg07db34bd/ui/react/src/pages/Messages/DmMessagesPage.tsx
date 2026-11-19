/*
 * Messages (Lane D), X-DM style. Routes: /messages (list) and /messages/:conversationId (list + open thread).
 * Left: DmApi.listConversations(actingMemberId). Right: DmThread. On narrow screens only one pane shows.
 * No "new message" button anywhere: professors start DMs from a post ("Message asker privately").
 */
import { useParams } from 'react-router';
import { MessageSquareLock } from 'lucide-react';
import { DmApi } from '@/api/boilerApi';
import { useApi } from '@/hooks/useApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import { ShellPageHeader, ShellStatus } from '@/components/Shell/ShellStatus';
import { DmConversationList } from '@/components/Dm/DmConversationList';
import { DmThread } from '@/components/Dm/DmThread';

function DmEmpty({ isFaculty }: { isFaculty: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <MessageSquareLock className="size-8 text-muted-foreground" aria-hidden />
      <p className="text-base font-semibold text-foreground">No messages yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {isFaculty
          ? 'Open a question from "Questions for you" and choose "Message asker privately" to reach the asker.'
          : 'Professors can reach out to you here after you post a question.'}
      </p>
    </div>
  );
}

export function DmMessagesPage() {
  const { conversationId } = useParams();
  const { actingMemberId, actingMember } = usePersona();
  const { data, loading, error } = useApi(() => DmApi.listConversations(actingMemberId), [actingMemberId, conversationId]);
  const conversations = data ?? [];
  const selected = conversations.find((c) => c.id === conversationId);
  const isFaculty = actingMember?.role === 'FACULTY';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ShellPageHeader title="Messages">
        <p className="px-4 pb-2 text-xs text-muted-foreground">Private and anonymous: no names are shown on either side.</p>
      </ShellPageHeader>
      <ShellStatus loading={loading && !data} error={error}>
        {conversations.length === 0 ? (
          <DmEmpty isFaculty={isFaculty} />
        ) : (
          <div className="flex min-h-[70vh] flex-1">
            <div
              className={`w-full shrink-0 overflow-y-auto border-r border-border md:w-[42%] ${conversationId ? 'hidden md:block' : ''}`}
            >
              <DmConversationList conversations={conversations} selectedId={conversationId} />
            </div>
            <div className={`min-w-0 flex-1 flex-col ${conversationId ? 'flex' : 'hidden md:flex'}`}>
              {conversationId ? (
                <DmThread key={`${actingMemberId}:${conversationId}`} conversation={selected} conversationId={conversationId} />
              ) : (
                <p className="m-auto px-6 text-center text-sm text-muted-foreground">Select a conversation.</p>
              )}
            </div>
          </div>
        )}
      </ShellStatus>
    </div>
  );
}
