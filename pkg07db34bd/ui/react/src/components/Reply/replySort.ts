/* Reply ordering for the post detail page: 🎯 expert-flaired replies first, then oldest → newest. */
import type { ReplyView } from '@/Interfaces';

const ts = (r: ReplyView): number => (r.createdAt ? new Date(r.createdAt).getTime() : 0);

export function sortReplies(replies: ReplyView[]): ReplyView[] {
  return [...replies].sort((a, b) => {
    const fa = a.author.flair ? 1 : 0;
    const fb = b.author.flair ? 1 : 0;
    if (fa !== fb) return fb - fa;
    return ts(a) - ts(b);
  });
}
