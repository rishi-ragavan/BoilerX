/*
 * Loading / error / empty states + the sticky page header, shared by every page (Lane C owns Shell*; Lane D imports).
 * Props are unchanged from Step 0: ShellStatus({ loading, error, empty?, emptyText?, children }),
 * ShellPageHeader({ title, children? }).
 */
import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';

/** X-style skeleton rows: avatar circle + 3 bars with a subtle pulse. */
export function ShellSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="bc-skeleton">
          <span className="bc-skeleton__avatar" />
          <span className="bc-skeleton__lines">
            <span className="bc-skeleton__bar bc-skeleton__bar--short" />
            <span className="bc-skeleton__bar" />
            <span className="bc-skeleton__bar bc-skeleton__bar--mid" />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Centered empty state: 31px bold heading, one muted line, optional gold pill action. */
export function ShellEmptyState({
  heading = 'Nothing here yet',
  text,
  actionLabel,
  onAction,
}: {
  heading?: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="bc-empty">
      <h2 className="bc-empty__heading">{heading}</h2>
      {text && <p className="bc-empty__text">{text}</p>}
      {actionLabel && onAction && (
        <button type="button" className="bc-btn bc-btn--gold bc-btn--lg" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/** Inline error box (danger border + icon only; text stays primary). */
export function ShellErrorBox({ title, message }: { title?: string; message: string }) {
  return (
    <div role="alert" className="bc-alert">
      <CircleAlert size={20} className="bc-alert__icon" aria-hidden />
      <div>
        {title && <p className="bc-alert__title">{title}</p>}
        <p className="bc-alert__text">{message}</p>
      </div>
    </div>
  );
}

export function ShellStatus({
  loading,
  error,
  empty,
  emptyText = 'Nothing here yet.',
  children,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyText?: string;
  children?: ReactNode;
}) {
  if (loading) return <ShellSkeleton />;
  if (error) return <ShellErrorBox title="Something went wrong" message={error} />;
  if (empty) return <ShellEmptyState text={emptyText} />;
  return <>{children}</>;
}

/** Sticky translucent (blurred) header for the center column. `children` render under the title (e.g. tabs). */
export function ShellPageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="bc-pageheader">
      <h1 className="bc-pageheader__title">{title}</h1>
      {children}
    </header>
  );
}
