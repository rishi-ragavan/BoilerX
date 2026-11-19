/* Space pill: "🎓 Experts · Finance", "🧑‍🎓 Student", "💼 Alumni" (Lane D). */
import type { PostView } from '@/Interfaces';

const SPACE_LABEL: Record<string, string> = {
  STUDENT: '🧑‍🎓 Student',
  EXPERTS: '🎓 Experts',
  ALUMNI: '💼 Alumni',
};

export function PostSpacePill({ post }: { post: Pick<PostView, 'space' | 'department'> }) {
  const base = SPACE_LABEL[post.space ?? ''] ?? post.space ?? '';
  const text = post.department ? `${base} · ${post.department}` : base;
  if (!text) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
      {text}
    </span>
  );
}
