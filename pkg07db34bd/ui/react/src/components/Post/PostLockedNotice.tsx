/* Shown instead of an EXPERTS_ONLY post to members who are neither the asker nor a tagged expert (Lane D). */
import { Link } from 'react-router';

export function PostLockedNotice() {
  return (
    <div className="m-4 flex flex-col items-center gap-2 rounded-md border border-border bg-muted/40 px-6 py-10 text-center">
      <span aria-hidden className="text-4xl">
        🔒
      </span>
      <p className="text-base font-semibold text-foreground">
        This question is only visible to the asker and tagged experts.
      </p>
      <Link to="/" className="text-sm text-primary hover:underline">
        Back to the feed
      </Link>
    </div>
  );
}

/** ForumApi.getPost throws this message for EXPERTS_ONLY posts the viewer can't see. */
// eslint-disable-next-line react-refresh/only-export-components
export function isAccessError(message: string | null | undefined): boolean {
  return !!message && /only visible|not visible|access denied/i.test(message);
}
