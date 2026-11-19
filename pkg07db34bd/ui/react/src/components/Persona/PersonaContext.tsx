/*
 * Persona switcher state (Lane C owns `Persona*`). Demo auth: the UI keeps `actingMemberId` (default: the first UG
 * student) in React context + localStorage and passes it as `actorId` to EVERY API method.
 * "In production this maps to C3 RBAC roles."
 *
 * Lane D: read it with `const { actingMemberId, actingMember } = usePersona();`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ForumApi } from '@/api/boilerApi';
import type { MemberView } from '@/Interfaces';

const STORAGE_KEY = 'boilerconnect.actingMemberId';
/** Used only until `listMembers` returns; then a stale/unknown id falls back to the first UG student. */
const DEFAULT_MEMBER_ID = 'bc_member_ug_alex';

interface PersonaState {
  members: MemberView[];
  actingMemberId: string;
  actingMember: MemberView | null;
  setActingMemberId: (id: string) => void;
  loading: boolean;
  error: string | null;
  reloadMembers: () => void;
}

const PersonaContext = createContext<PersonaState | null>(null);

function readStoredId(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_MEMBER_ID;
  } catch {
    return DEFAULT_MEMBER_ID;
  }
}

function storeId(id: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage disabled (private mode): the persona still lives in React state */
  }
}

/** First UG student, else first student, else first member. */
function defaultPersona(members: MemberView[]): MemberView | undefined {
  return (
    members.find((m) => m.role === 'STUDENT' && m.level === 'UG') ??
    members.find((m) => m.role === 'STUDENT') ??
    members[0]
  );
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<MemberView[]>([]);
  const [actingMemberId, setActingMemberIdState] = useState<string>(readStoredId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ForumApi.listMembers()
      .then((list) => {
        if (cancelled) return;
        setMembers(list);
        setError(null);
        // Stored id no longer in the seed (e.g. reseeded) -> fall back to the default student.
        setActingMemberIdState((current) => {
          if (list.some((m) => m.id === current)) return current;
          const fallback = defaultPersona(list);
          return fallback ? fallback.id : current;
        });
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const setActingMemberId = useCallback((id: string) => {
    storeId(id);
    setActingMemberIdState(id);
  }, []);

  const reloadMembers = useCallback(() => setReloadKey((k) => k + 1), []);

  const value = useMemo<PersonaState>(
    () => ({
      members,
      actingMemberId,
      actingMember: members.find((m) => m.id === actingMemberId) ?? null,
      setActingMemberId,
      loading,
      error,
      reloadMembers,
    }),
    [members, actingMemberId, setActingMemberId, loading, error, reloadMembers]
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePersona(): PersonaState {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used inside <PersonaProvider>');
  return ctx;
}

/** "Undergrad · ECE"-style label (server sends `roleLabel`; this is the fallback). */
// eslint-disable-next-line react-refresh/only-export-components
export function personaSubtitle(m: MemberView): string {
  if (m.roleLabel) return m.roleLabel;
  const where = m.role === 'ALUMNI' ? m.employer : m.department;
  return [m.role.charAt(0) + m.role.slice(1).toLowerCase(), where].filter(Boolean).join(' · ');
}
