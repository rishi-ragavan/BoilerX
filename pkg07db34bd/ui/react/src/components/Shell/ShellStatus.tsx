/* Loading / error / empty states shared by all pages. */
import type { ReactNode } from 'react';

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
  if (loading) return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
  if (error)
    return (
      <p role="alert" className="m-4 rounded-md border border-destructive p-3 text-sm text-destructive">
        {error}
      </p>
    );
  if (empty) return <p className="p-4 text-sm text-muted-foreground">{emptyText}</p>;
  return <>{children}</>;
}

export function ShellPageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <h1 className="px-4 py-3 text-lg font-bold text-foreground">{title}</h1>
      {children}
    </header>
  );
}
