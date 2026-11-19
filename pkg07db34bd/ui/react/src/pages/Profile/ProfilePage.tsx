/* Profile (Lane D). Routes: /profile (acting persona) and /profile/:memberId. Calls ForumApi.getMember(id). */
import { useParams } from 'react-router';
import { ForumApi } from '@/api/boilerApi';
import { useApi } from '@/hooks/useApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import { ProfileCard } from '@/components/Profile/ProfileCard';
import { ShellPageHeader, ShellStatus } from '@/components/Shell/ShellStatus';

export function ProfilePage() {
  const { memberId } = useParams();
  const { actingMemberId } = usePersona();
  const id = memberId || actingMemberId;
  const { data: m, loading, error } = useApi(() => ForumApi.getMember(id), [id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ShellPageHeader title={m?.name ?? 'Profile'} />
      <ShellStatus loading={loading} error={error}>
        {m && <ProfileCard member={m} isMe={m.id === actingMemberId} />}
      </ShellStatus>
    </div>
  );
}
