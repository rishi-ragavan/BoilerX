/*
 * ♥ like toggle shared by the focused post and reply cards (Lane D).
 * Calls ForumApi.toggleLike(actorId, postId?, replyId?) and reports the server's {liked, count} back to the parent.
 */
import { useState } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { ForumApi } from '@/api/boilerApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import type { LikeResult } from '@/Interfaces';

interface PostLikeButtonProps {
  postId?: string | null;
  replyId?: string | null;
  liked: boolean;
  count: number;
  onChange: (result: LikeResult) => void;
}

export function PostLikeButton({ postId = null, replyId = null, liked, count, onChange }: PostLikeButtonProps) {
  const { actingMemberId } = usePersona();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      onChange(await ForumApi.toggleLike(actingMemberId, postId, replyId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update like');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      className={`group inline-flex items-center gap-1 rounded-full px-1 text-xs transition-colors disabled:opacity-60 ${
        liked ? 'text-pink-600' : 'text-muted-foreground hover:text-pink-600'
      }`}
    >
      <span className="rounded-full p-1.5 group-hover:bg-pink-500/10">
        <Heart className={`size-4 ${liked ? 'fill-current' : ''}`} />
      </span>
      {count}
    </button>
  );
}
