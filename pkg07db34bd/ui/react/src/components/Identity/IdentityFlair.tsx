/*
 * Member flair (Lane D owns Identity*): professors show department + research interests
 * ("Finance · stock market, asset pricing"); alumni show their career role ("SWE", "Product Manager").
 * Students have none. Plain muted text — there is no 🎯 "expert" flair.
 */

export function IdentityFlair({ flair }: { flair?: string | null }) {
  if (!flair) return null;
  return <span className="min-w-0 truncate text-muted-foreground">{flair}</span>;
}
