/*
 * Shell-wide UI state (Lane C owns Shell*): toasts, the "Ask" -> composer focus request, and a counter bumped
 * whenever a post is created (the right rail's "Questions for you" re-reads from it).
 * Provided by ShellLayout, so every routed page (all lanes) can call `useShell()`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Context, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';

interface ShellState {
  /** Show a gold bottom-center pill toast for 3s. */
  toast: (message: string) => void;
  /** Scroll to + focus the Home composer (navigates Home first when needed). */
  requestCompose: () => void;
  /** True while a compose request is waiting for the composer to pick it up. */
  composePending: boolean;
  /** Composer calls this once it has focused itself. */
  consumeCompose: () => void;
  /** Incremented after every successful post; read by widgets that summarise the feed. */
  postsVersion: number;
  notifyPostCreated: () => void;
}

/** Same object across Vite hot reloads (see PersonaContext): otherwise useShell() can lose its provider after HMR. */
const SHELL_CONTEXT_KEY = '__boilerconnect_shell_context__';
const shellRegistry = globalThis as unknown as Record<string, Context<ShellState | null> | undefined>;
const ShellContext: Context<ShellState | null> =
  shellRegistry[SHELL_CONTEXT_KEY] ?? (shellRegistry[SHELL_CONTEXT_KEY] = createContext<ShellState | null>(null));

const TOAST_MS = 3000;

export function ShellProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);
  const [composePending, setComposePending] = useState(false);
  const [postsVersion, setPostsVersion] = useState(0);
  const timer = useRef<number | null>(null);

  // Lane D's Identity* pills use Tailwind `dark:` variants keyed on data-theme; the app is always "Lights out".
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
  }, []);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const toast = useCallback((message: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    setToastMessage(message);
    setToastKey((k) => k + 1);
    timer.current = window.setTimeout(() => setToastMessage(null), TOAST_MS);
  }, []);

  const pathname = location.pathname;
  const requestCompose = useCallback(() => {
    setComposePending(true);
    if (pathname !== '/') navigate('/');
  }, [navigate, pathname]);

  const consumeCompose = useCallback(() => setComposePending(false), []);
  const notifyPostCreated = useCallback(() => setPostsVersion((v) => v + 1), []);

  const value = useMemo<ShellState>(
    () => ({
      toast,
      requestCompose,
      composePending,
      consumeCompose,
      postsVersion,
      notifyPostCreated,
    }),
    [toast, requestCompose, composePending, consumeCompose, postsVersion, notifyPostCreated]
  );

  return (
    <ShellContext.Provider value={value}>
      {children}
      <div className="bc-toast-region" role="status" aria-live="polite">
        {toastMessage && (
          <div key={toastKey} className="bc-toast">
            {toastMessage}
          </div>
        )}
      </div>
    </ShellContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useShell(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used inside <ShellProvider> (rendered by ShellLayout)');
  return ctx;
}
