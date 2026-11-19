/*
 * Reply box on the post detail page (Lane D). Calls ForumApi.reply(actorId, postId, body, isAnonymous=true).
 * Product rule: every reply is anonymous for every role, so experts can answer without reputation pressure.
 * There is no anonymity toggle; the box just tells you how you'll appear.
 */
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ForumApi } from '@/api/boilerApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import type { MemberView, ReplyView } from '@/Interfaces';

const MAX_LEN = 4000;

function appearsAs(m: MemberView | null): string {
  if (!m) return 'an anonymous member';
  if (m.role === 'FACULTY') return `Expert${m.department ? ` · ${m.department}` : ''}`;
  if (m.role === 'ALUMNI') return `Alum${m.employer ? ` · ${m.employer}` : ''}`;
  return 'Boiler ····, a handle unique to this thread';
}

export function ReplyComposer({ postId, onReplied }: { postId: string; onReplied: (reply: ReplyView) => void }) {
  const { actingMemberId, actingMember } = usePersona();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSend = body.trim().length > 0 && !sending;

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const reply = await ForumApi.reply(actingMemberId, postId, body.trim(), true);
      onReplied(reply);
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-2 border-b border-border px-4 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label htmlFor="reply-body" className="sr-only">
        Write your reply
      </label>
      <textarea
        id="reply-body"
        value={body}
        maxLength={MAX_LEN}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit();
        }}
        rows={3}
        placeholder="Post your reply"
        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          Anonymous. You appear as <span className="font-semibold text-foreground">{appearsAs(actingMember)}</span>
        </p>
        <Button type="submit" size="sm" className="rounded-full px-4" disabled={!canSend}>
          {sending ? 'Replying…' : 'Reply'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
