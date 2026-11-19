/*
 * Reply box on the post detail page (Lane D). Calls ForumApi.reply(actorId, postId, body, isAnonymous).
 * Anonymity: students are always anonymous (toggle locked on); faculty/alumni default to their anonByDefault.
 * Anyone on the platform can reply to any question in any space.
 */
import { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ForumApi } from '@/api/boilerApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import type { ReplyView } from '@/Interfaces';

const MAX_LEN = 4000;

export function ReplyComposer({ postId, onReplied }: { postId: string; onReplied: (reply: ReplyView) => void }) {
  const { actingMemberId, actingMember } = usePersona();
  const isStudent = actingMember?.role === 'STUDENT';
  const [body, setBody] = useState('');
  const [anonChoice, setAnonChoice] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAnonymous = isStudent ? true : (anonChoice ?? !!actingMember?.anonByDefault);
  const canSend = body.trim().length > 0 && !sending;
  const anonLabel = isStudent ? (
    <>
      <Lock className="size-3" /> Students always reply anonymously
    </>
  ) : (
    <>
      <ShieldCheck className="size-3" /> Reply anonymously
    </>
  );

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const reply = await ForumApi.reply(actingMemberId, postId, body.trim(), isAnonymous);
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
        <div className="inline-flex items-center gap-2 text-xs">
          <input
            id="reply-anon"
            type="checkbox"
            checked={isAnonymous}
            disabled={isStudent}
            onChange={(e) => setAnonChoice(e.target.checked)}
            className="size-4 accent-current"
          />
          <label
            htmlFor="reply-anon"
            className={`inline-flex items-center gap-1 ${isStudent ? 'text-muted-foreground' : 'cursor-pointer text-foreground'}`}
          >
            {anonLabel}
          </label>
        </div>
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
