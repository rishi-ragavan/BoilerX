/*
 * Persona switcher state (Lane C owns `Persona*`). Demo auth: the UI keeps `actingMemberId` (default: a student)
 * and passes it as `actorId` to every API method. "In production this maps to C3 RBAC roles."
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ForumApi } from '@/api/boilerApi';
import type { MemberView } from '@/Interfaces';

const STORAGE_KEY = 'boilerconnect.actingMemberId';
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

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<MemberView[]>([]);
  const [actingMemberId, setActingMemberIdState] = useState<string>(
    () => window.localStorage.getItem(STORAGE_KEY) || DEFAULT_MEMBER_ID
  );
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
    window.localStorage.setItem(STORAGE_KEY, id);
    setActingMemberIdState(id);
  }, []);

  const value = useMemo<PersonaState>(
    () => ({
      members,
      actingMemberId,
      actingMember: members.find((m) => m.id === actingMemberId) ?? null,
      setActingMemberId,
      loading,
      error,
      reloadMembers: () => setReloadKey((k) => k + 1),
    }),
    [members, actingMemberId, setActingMemberId, loading, error]
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePersona(): PersonaState {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used inside <PersonaProvider>');
  return ctx;
}
