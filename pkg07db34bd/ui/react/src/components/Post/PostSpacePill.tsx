/* Space pill: "🎓 Faculty · Finance", "🧑‍🎓 Students", "💼 Alumni", or "📝 Article" (Lane D). */
import type { PostView } from '@/Interfaces';

const SPACE_LABEL: Record<string, string> = {
  STUDENT: '🧑‍🎓 Students',
  FACULTY: '🎓 Faculty',
  ALUMNI: '💼 Alumni',
};

export function PostSpacePill({ post }: { post: Pick<PostView, 'postType' | 'space' | 'department'> }) {
  const base = post.postType === 'ARTICLE' ? '📝 Article' : (SPACE_LABEL[post.space ?? ''] ?? post.space ?? '');
  const text = post.department ? `${base} · ${post.department}` : base;
  if (!text) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
      {text}
    </span>
  );
}
