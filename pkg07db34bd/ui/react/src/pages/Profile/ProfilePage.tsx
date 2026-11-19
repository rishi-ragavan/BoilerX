/* Profile (Lane D). Step 0 placeholder wired to ForumApi.getMember. `/profile` shows the acting persona. */
import { useParams } from 'react-router';
import { ForumApi } from '@/api/boilerApi';
import { useApi } from '@/hooks/useApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import { IdentityBadge } from '@/components/Identity/IdentityBadge';
import { ShellPageHeader, ShellStatus } from '@/components/Shell/ShellStatus';

export function ProfilePage() {
  const { memberId } = useParams();
  const { actingMemberId } = usePersona();
  const id = memberId || actingMemberId;
  const { data: m, loading, error } = useApi(() => ForumApi.getMember(id), [id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ShellPageHeader title="Profile" />
      <ShellStatus loading={loading} error={error}>
        {m && (
          <section className="flex flex-col gap-2 p-4">
            <h2 className="text-xl font-bold text-foreground">{m.name}</h2>
            <p className="text-sm text-muted-foreground">
              {m.roleLabel} · {m.verified ? '✅ Verified' : '⚠️ Unverified'} · ⭐ {m.reputation ?? 0} reputation
            </p>
            {m.badges && m.badges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.badges.map((b) => (
                  <IdentityBadge key={b} badge={b} />
                ))}
              </div>
            )}
            {m.bio && <p className="text-[15px] text-foreground">{m.bio}</p>}
            {m.tags && m.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.tags.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}
      </ShellStatus>
    </div>
  );
}
