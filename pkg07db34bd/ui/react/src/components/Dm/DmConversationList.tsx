/*
 * Conversation list for the Messages page (Lane D), X-DM style. Each row: the other party's anonymous identity
 * (IdentityAuthorLine never shows names/badges for anonymous parties), the post it's about, and the last message.
 * There is intentionally NO "new message" button: only professors start DMs, from a post.
 */
import { Link } from 'react-router';
import type { ConversationView } from '@/Interfaces';
import { IdentityAuthorLine } from '@/components/Identity/IdentityAuthorLine';

export function DmConversationList({
  conversations,
  selectedId,
}: {
  conversations: ConversationView[];
  selectedId?: string;
}) {
  return (
    <ul className="flex flex-col">
      {conversations.map((c) => {
        const active = c.id === selectedId;
        return (
          <li key={c.id}>
            <Link
              to={`/messages/${c.id}`}
              aria-current={active ? 'page' : undefined}
              className={`block border-b border-border px-3 py-3 transition-colors hover:bg-muted/50 ${
                active ? 'border-r-2 border-r-primary bg-muted/60' : ''
              }`}
            >
              <IdentityAuthorLine author={c.otherParty} createdAt={c.createdAt} />
              {c.postTitle && <p className="mt-1 truncate pl-10 text-xs text-muted-foreground">Re: {c.postTitle}</p>}
              {c.lastMessage && <p className="mt-0.5 line-clamp-2 pl-10 text-sm text-foreground">{c.lastMessage}</p>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
