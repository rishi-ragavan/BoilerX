/*
 * 🎯 Expert flair: a gold pill shown on a reply when the replier has an ExpertMatch on the post.
 * Lane D owns Identity*; props are frozen: IdentityFlair({ flair }). Renders nothing when there is no flair.
 * The server sends the full label ("🎯 Expert: Finance"); a bare topic ("Finance") is prefixed here.
 */

export function IdentityFlair({ flair }: { flair?: string | null }) {
  if (!flair) return null;
  const text = flair.includes('Expert') ? flair : `🎯 Expert: ${flair}`;
  return (
    <span
      title="This member was tagged as an expert on this question"
      className="inline-flex shrink-0 items-center rounded-full border border-amber-400 bg-amber-100 px-2 py-0.5 text-[11px] leading-4 font-semibold text-amber-900 dark:border-amber-500 dark:bg-amber-900/60 dark:text-amber-100"
    >
      {text}
    </span>
  );
}
