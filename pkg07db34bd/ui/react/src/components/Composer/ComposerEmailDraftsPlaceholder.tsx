/*
 * Placeholder for Lane D's EmailDraftsModal (Lane C owns Composer*). Same props as the agreed contract
 * ({ postId, actorId, onClose }) so the swap after Merge 1 is a one-line import change in ComposerBox.
 * Nothing is ever sent automatically.
 */
import { Lock, TriangleAlert } from 'lucide-react';
import { ShellModal } from '@/components/Shell/ShellModal';

export interface EmailDraftsModalProps {
  postId: string;
  actorId: string;
  onClose: () => void;
}

export function ComposerEmailDraftsPlaceholder({ postId, onClose }: EmailDraftsModalProps) {
  return (
    <ShellModal
      title="Cold-email experts"
      onClose={onClose}
      footer={
        <button type="button" className="bc-btn bc-btn--gold" onClick={onClose}>
          Done
        </button>
      }
    >
      <div className="bc-maildraft">
        <p className="bc-maildraft__line">
          <Lock size={18} aria-hidden className="bc-maildraft__icon" />
          Your question was posted as <strong>Experts only</strong>: only you and the matched experts can see it.
        </p>
        <p className="bc-maildraft__line">
          <TriangleAlert size={18} aria-hidden className="bc-maildraft__icon" />
          Emails reveal your name. Nothing is sent automatically; you copy each draft and send it yourself.
        </p>
        <p className="bc-maildraft__muted">Personalized drafts for each expert will appear here. Post id: {postId}</p>
      </div>
    </ShellModal>
  );
}
