/* Persona switcher dropdown (Lane C). */
import { usePersona } from '@/components/Persona/PersonaContext';

export function PersonaSwitcher() {
  const { members, actingMemberId, setActingMemberId, loading, error } = usePersona();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="persona-switcher" className="text-xs font-medium text-muted-foreground">
        Acting as (demo persona)
      </label>
      <select
        id="persona-switcher"
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
        value={actingMemberId}
        disabled={loading}
        onChange={(e) => setActingMemberId(e.target.value)}
      >
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} — {m.roleLabel}
            {m.badges && m.badges.length ? ` (${m.badges.join(', ')})` : ''}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">Could not load members: {error}</p>}
    </div>
  );
}
