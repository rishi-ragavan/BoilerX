/*
 * "Message privately" dialog (Lane D). A professor opens it by clicking a student's handle in a thread
 * (DmAuthorLine). Calls DmApi.startConversation(actorId, postId, body, replyId) and opens the thread on success.
 * Anonymity: the professor appears as "Purdue professor" (Expert); the student keeps their thread handle.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { DmApi } from '@/api/boilerApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import { ShellModal } from '@/components/Shell/ShellModal';
import type { AuthorView } from '@/Interfaces';

const MAX_LEN = 2000;

interface DmStartDialogProps {
  postId: string;
  postTitle: string;
  asker: AuthorView;
  /** Message the author of this reply instead of the question's asker. */
  replyId?: string;
  onClose: () => void;
}

export function DmStartDialog({ postId, postTitle, asker, replyId, onClose }: DmStartDialogProps) {
  const { actingMemberId, actingMember } = usePersona();
  const navigate = useNavigate();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const myHandle = `Purdue professor (Expert${actingMember?.department ? ` · ${actingMember.department}` : ''})`;
  const canSend = body.trim().length > 0 && !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const conv = await DmApi.startConversation(actingMemberId, postId, body.trim(), replyId ?? null);
      onClose();
      navigate(`/messages/${conv.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the message');
      setSending(false);
    }
  };

  return (
    <ShellModal
      title={`Message ${asker.displayName} privately`}
      onClose={onClose}
      footer={
        <button type="button" className="bc-btn bc-btn--gold" disabled={!canSend} onClick={() => void send()}>
          {sending && <LoaderCircle size={16} className="bc-spin" aria-hidden />}
          Send
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          To <span className="font-semibold text-foreground">{asker.displayName}</span> about “{postTitle}”
        </p>
        <p className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            You appear as <span className="font-semibold text-foreground">{myHandle}</span>. Neither of you sees the
            other&apos;s name. They can reply until you end the conversation; students can never start one.
          </span>
        </p>
        <label htmlFor="dm-start-body" className="sr-only">
          Message
        </label>
        <textarea
          id="dm-start-body"
          rows={5}
          maxLength={MAX_LEN}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send();
          }}
          placeholder="Offer help, point to a resource, or invite them to office hours…"
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </ShellModal>
  );
}
