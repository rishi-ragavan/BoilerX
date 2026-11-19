/*
 * Author line that lets a PROFESSOR start a DM with a STUDENT from a thread (Lane D): click the student's handle
 * ("Boiler a3f1") on the question or on any reply → "Message privately (DM)" → DmStartDialog.
 * Everyone else (and every non-student author) gets the plain IdentityAuthorLine. DmApi enforces the same rules.
 */
import { useEffect, useRef, useState } from 'react';
import { MessageSquareLock } from 'lucide-react';
import type { AuthorView } from '@/Interfaces';
import { usePersona } from '@/components/Persona/PersonaContext';
import { IdentityAuthorLine } from '@/components/Identity/IdentityAuthorLine';
import { DmStartDialog } from '@/components/Dm/DmStartDialog';

interface DmAuthorLineProps {
  author: AuthorView;
  createdAt?: string;
  postId: string;
  postTitle: string;
  /** The reply this author wrote; omit for the question's author. */
  replyId?: string;
  isMine?: boolean;
}

export function DmAuthorLine({ author, createdAt, postId, postTitle, replyId, isMine }: DmAuthorLineProps) {
  const { actingMember } = usePersona();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Students are the only members with no tag; professors only start DMs with students.
  const canDm = actingMember?.role === 'FACULTY' && !isMine && author.isAnonymous && !author.tag;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (!canDm) return <IdentityAuthorLine author={author} createdAt={createdAt} />;

  return (
    <div ref={ref} className="relative min-w-0">
      <IdentityAuthorLine author={author} createdAt={createdAt} onHandleClick={() => setMenuOpen((o) => !o)} />
      {menuOpen && (
        <div
          role="menu"
          aria-label={`Actions for ${author.displayName}`}
          className="absolute top-8 left-10 z-20 min-w-48 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => {
              setMenuOpen(false);
              setDialogOpen(true);
            }}
          >
            <MessageSquareLock className="size-4" aria-hidden /> Message privately (DM)
          </button>
        </div>
      )}
      {dialogOpen && (
        <DmStartDialog
          postId={postId}
          postTitle={postTitle}
          asker={author}
          replyId={replyId}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
