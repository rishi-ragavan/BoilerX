/*
 * Persona switcher (Lane C), styled like X's account switcher: avatar + name + "role · department" + ellipsis.
 * Opens an elevated menu of every member from `ForumApi.listMembers`, grouped Students / Experts / Alumni, with a
 * gold check on the active persona. `compact` renders the avatar only (collapsed nav and mobile bottom bar).
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { MemberView, Role } from '@/Interfaces';
import { personaSubtitle, usePersona } from '@/components/Persona/PersonaContext';
import { ShellAvatar } from '@/components/Shell/ShellAvatar';
import { useShellDismiss } from '@/components/Shell/ShellDismiss';
import './PersonaStyles.css';

const GROUPS: { role: Role; label: string }[] = [
  { role: 'STUDENT', label: 'Students' },
  { role: 'FACULTY', label: 'Experts' },
  { role: 'ALUMNI', label: 'Alumni' },
];

export function PersonaSwitcher({ compact = false }: { compact?: boolean }) {
  const { members, actingMemberId, actingMember, setActingMemberId, loading, error, reloadMembers } = usePersona();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useShellDismiss(rootRef, open, close);

  const grouped = useMemo(() => {
    const byRole = new Map<Role, MemberView[]>();
    GROUPS.forEach((g) => byRole.set(g.role, []));
    members.forEach((m) => byRole.get(m.role)?.push(m));
    byRole.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
    return GROUPS.map((g) => ({ ...g, members: byRole.get(g.role) ?? [] })).filter((g) => g.members.length > 0);
  }, [members]);

  const choose = (id: string) => {
    setActingMemberId(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`bc-persona ${compact ? 'bc-persona--compact' : ''}`}>
      {open && (
        <div className="bc-persona__menu" role="menu" aria-label="Switch persona">
          <p className="bc-persona__menu-note">Demo persona · in production this maps to C3 RBAC roles</p>
          {grouped.map((g) => (
            <div key={g.role} role="group" aria-label={g.label}>
              <p className="bc-persona__group">{g.label}</p>
              {g.members.map((m) => {
                const active = m.id === actingMemberId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className="bc-persona__item"
                    onClick={() => choose(m.id)}
                  >
                    <ShellAvatar name={m.name} size="sm" />
                    <span className="bc-persona__item-text">
                      <span className="bc-persona__name">{m.name}</span>
                      <span className="bc-persona__sub">{personaSubtitle(m)}</span>
                    </span>
                    {active && <Check size={18} className="bc-persona__check" aria-hidden />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {error ? (
        <button type="button" className="bc-persona__trigger bc-persona__trigger--error" onClick={reloadMembers}>
          <span className="bc-persona__text">
            <span className="bc-persona__name">Couldn&apos;t load members</span>
            <span className="bc-persona__sub">Retry</span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="bc-persona__trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Acting as ${actingMember?.name ?? 'loading'}. Switch persona`}
          disabled={loading && !members.length}
          onClick={() => setOpen((o) => !o)}
        >
          <ShellAvatar name={actingMember?.name} />
          <span className="bc-persona__text">
            <span className="bc-persona__name">{actingMember?.name ?? 'Loading…'}</span>
            <span className="bc-persona__sub">{actingMember ? personaSubtitle(actingMember) : ' '}</span>
          </span>
          <ChevronsUpDown size={18} className="bc-persona__more" aria-hidden />
        </button>
      )}
    </div>
  );
}
