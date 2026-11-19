/*
 * Reply grouping for the post detail page (Lane D). The API returns replies grouped EXPERTS → ALUMNI → STUDENT
 * (oldest first within a group). Don't re-sort; only place a newly posted reply at the end of its group.
 */
import type { ReplyGroup, ReplyView } from '@/Interfaces';

export const REPLY_GROUP_ORDER: ReplyGroup[] = ['EXPERTS', 'ALUMNI', 'STUDENT'];
export const REPLY_GROUP_LABEL: Record<ReplyGroup, string> = { EXPERTS: 'Experts', ALUMNI: 'Alumni', STUDENT: 'Students' };

const rank = (r: ReplyView): number => {
  const i = REPLY_GROUP_ORDER.indexOf((r.authorGroup ?? 'STUDENT') as ReplyGroup);
  return i < 0 ? REPLY_GROUP_ORDER.length : i;
};

/** Inserts `reply` after the last existing reply of the same or an earlier group. */
export function insertReply(replies: ReplyView[], reply: ReplyView): ReplyView[] {
  const g = rank(reply);
  let at = replies.length;
  for (let i = 0; i < replies.length; i++) {
    if (rank(replies[i]) > g) {
      at = i;
      break;
    }
  }
  return [...replies.slice(0, at), reply, ...replies.slice(at)];
}
