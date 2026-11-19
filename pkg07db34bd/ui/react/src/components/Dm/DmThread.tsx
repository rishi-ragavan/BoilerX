/*
 * One DM thread (Lane D): messages from DmApi.getConversation (oldest first) and a send box (DmApi.sendMessage).
 * Mine = right-aligned blue bubbles; theirs = left-aligned gray. MessageView has no sender identity, only isMine.
 * No realtime (cut from scope): the refresh button re-fetches; switching persona re-fetches automatically.
 * The professor who started the conversation can END it (DmApi.endConversation): it becomes read-only for both.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, CircleStop, LoaderCircle, RefreshCw, SendHorizontal } from 'lucide-react';
import { DmApi } from '@/api/boilerApi';
import { useApi } from '@/hooks/useApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import { ShellStatus } from '@/components/Shell/ShellStatus';
import { IdentityAuthorLine, fullTimestamp, timeAgo } from '@/components/Identity/IdentityAuthorLine';
import type { ConversationView, MessageView } from '@/Interfaces';

const MAX_LEN = 2000;

function DmBubble({ message }: { message: MessageView }) {
  const mine = !!message.isMine;
  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <p
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap ${
          mine ? 'rounded-br-sm bg-sky-600 text-white' : 'rounded-bl-sm bg-muted text-foreground'
        }`}
      >
        {message.body}
      </p>
      {message.createdAt && (
        <time dateTime={message.createdAt} title={fullTimestamp(message.createdAt)} className="mt-0.5 px-1 text-[11px] text-muted-foreground">
          {timeAgo(message.createdAt)}
        </time>
      )}
    </div>
  );
}

function DmMessages({
  initial,
  conversationId,
  ended,
}: {
  initial: MessageView[];
  conversationId: string;
  ended: boolean;
}) {
  const { actingMemberId } = usePersona();
  const [messages, setMessages] = useState<MessageView[]>(initial);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const m = await DmApi.sendMessage(actingMemberId, conversationId, text);
      setMessages((ms) => [...ms, m]);
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the message');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-4">
        {messages.length === 0 && <p className="text-center text-sm text-muted-foreground">No messages yet.</p>}
        {messages.map((m) => (
          <DmBubble key={m.id} message={m} />
        ))}
        <div ref={endRef} />
      </div>
      {ended ? (
        <p role="status" className="border-t border-border px-4 py-3 text-center text-sm text-muted-foreground">
          This conversation has ended. No more messages can be sent.
        </p>
      ) : (
      <form
        className="flex flex-col gap-1 border-t border-border p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="flex items-end gap-2">
          <label htmlFor="dm-send-body" className="sr-only">
            Message
          </label>
          <textarea
            id="dm-send-body"
            rows={1}
            maxLength={MAX_LEN}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Start a new message"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-input bg-muted/40 px-3 py-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!body.trim() || sending}
            className="bc-iconbtn text-sky-500 disabled:opacity-40"
          >
            {sending ? <LoaderCircle size={20} className="bc-spin" aria-hidden /> : <SendHorizontal size={20} aria-hidden />}
          </button>
        </div>
        {error && (
          <p role="alert" className="px-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </form>
      )}
    </>
  );
}

export function DmThread({
  conversation,
  conversationId,
  onChanged,
}: {
  conversation?: ConversationView;
  conversationId: string;
  /** Called after the conversation was ended so the list can refresh. */
  onChanged?: () => void;
}) {
  const { actingMemberId } = usePersona();
  const { data, loading, error, reload } = useApi(
    () => DmApi.getConversation(actingMemberId, conversationId),
    [actingMemberId, conversationId]
  );
  const [endedLocally, setEndedLocally] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const ended = endedLocally || !!conversation?.ended;
  const canEnd = !ended && !!conversation?.canEnd;

  const end = async () => {
    if (!canEnd || ending) return;
    if (!window.confirm('End this conversation? Neither of you will be able to send more messages.')) return;
    setEnding(true);
    setEndError(null);
    try {
      await DmApi.endConversation(actingMemberId, conversationId);
      setEndedLocally(true);
      onChanged?.();
    } catch (err) {
      setEndError(err instanceof Error ? err.message : 'Could not end the conversation');
    } finally {
      setEnding(false);
    }
  };

  return (
    <section aria-label="Conversation" className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-border px-2 py-2">
        <Link to="/messages" aria-label="Back to conversations" className="bc-iconbtn md:hidden">
          <ArrowLeft size={20} aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          {conversation ? (
            <>
              <IdentityAuthorLine author={conversation.otherParty} />
              {conversation.postTitle && (
                <p className="truncate pl-10 text-xs text-muted-foreground">Re: {conversation.postTitle}</p>
              )}
            </>
          ) : (
            <p className="px-2 text-sm font-semibold text-foreground">Conversation</p>
          )}
        </div>
        {canEnd && (
          <button
            type="button"
            className="bc-btn bc-btn--outline inline-flex items-center gap-1.5 text-sm"
            onClick={() => void end()}
            disabled={ending}
            title="End this conversation for both of you"
          >
            {ending ? <LoaderCircle size={16} className="bc-spin" aria-hidden /> : <CircleStop size={16} aria-hidden />}
            End conversation
          </button>
        )}
        {ended && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Ended</span>}
        <button type="button" aria-label="Refresh" className="bc-iconbtn" onClick={reload}>
          <RefreshCw size={18} aria-hidden />
        </button>
      </header>
      {endError && (
        <p role="alert" className="border-b border-border px-4 py-2 text-sm text-destructive">
          {endError}
        </p>
      )}
      <ShellStatus loading={loading} error={error}>
        {data && (
          <DmMessages
            key={`${actingMemberId}:${conversationId}:${data.length}`}
            initial={data}
            conversationId={conversationId}
            ended={ended}
          />
        )}
      </ShellStatus>
    </section>
  );
}
