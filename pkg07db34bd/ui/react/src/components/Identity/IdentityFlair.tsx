/* 🎯 Expert flair on a reply (Lane D owns Identity*). Renders nothing when there is no flair. */

export function IdentityFlair({ flair }: { flair?: string | null }) {
  if (!flair) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
      {flair}
    </span>
  );
}
