/*
 * The only person tags on BoilerConnect (Lane D owns Identity*): "Expert" for professors, "Alumni" for alumni.
 * Students have no tag. Kept in this file (formerly role badges) so existing imports keep working.
 */

export function IdentityTag({ tag }: { tag?: string | null }) {
  if (tag !== 'Expert' && tag !== 'Alumni') return null;
  const cls =
    tag === 'Expert'
      ? 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-500 dark:bg-amber-900/60 dark:text-amber-100'
      : 'border-sky-400 bg-sky-100 text-sky-900 dark:border-sky-500 dark:bg-sky-900/60 dark:text-sky-100';
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] leading-4 font-semibold ${cls}`}>
      {tag}
    </span>
  );
}
