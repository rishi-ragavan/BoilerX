/*
 * "✉️ Message asker privately" entry point on the post detail page (Lane D).
 * Shown ONLY when the viewer is a matched expert on this post AND the acting persona's role is FACULTY
 * (DM_INITIATOR_ROLES). Students and alumni never see it; DmApi.startConversation enforces the same rule.
 */
import { useState } from 'react';
import type { PostView } from '@/Interfaces';
import { usePersona } from '@/components/Persona/PersonaContext';
import { DmStartDialog } from '@/components/Dm/DmStartDialog';

export function PostDmButton({ post }: { post: PostView }) {
  const { actingMember } = usePersona();
  const [open, setOpen] = useState(false);
  if (!post.viewerIsMatchedExpert || actingMember?.role !== 'FACULTY' || post.isMine) return null;

  return (
    <>
      <div className="border-b border-border px-4 py-2">
        <button type="button" className="bc-btn bc-btn--outline" onClick={() => setOpen(true)}>
          ✉️ Message asker privately
        </button>
      </div>
      {open && (
        <DmStartDialog postId={post.id} postTitle={post.title} asker={post.author} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
