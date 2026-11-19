/*
 * Profile (Lane D). Routes: /profile and /profile/:memberId. Only the acting member's OWN profile is shown
 * (ForumApi.getMember(actingMemberId)); other members' profiles are private because everyone is anonymous.
 */
import { useParams } from 'react-router';
import { Lock } from 'lucide-react';
import { ForumApi } from '@/api/boilerApi';
import { useApi } from '@/hooks/useApi';
import { usePersona } from '@/components/Persona/PersonaContext';
import { ProfileCard } from '@/components/Profile/ProfileCard';
import { ShellPageHeader, ShellStatus } from '@/components/Shell/ShellStatus';

export function ProfilePage() {
  const { memberId } = useParams();
  const { actingMemberId } = usePersona();
  const isOwn = !memberId || memberId === actingMemberId;
  const { data: m, loading, error } = useApi(
    () => (isOwn ? ForumApi.getMember(actingMemberId) : Promise.resolve(null)),
    [isOwn, actingMemberId]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ShellPageHeader title={isOwn ? 'Your profile' : 'Profile'} />
      {isOwn ? (
        <ShellStatus loading={loading} error={error}>
          {m && <ProfileCard member={m} />}
        </ShellStatus>
      ) : (
        <div className="m-4 flex flex-col items-center gap-2 rounded-md border border-border bg-muted/40 px-6 py-10 text-center">
          <Lock className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-base font-semibold text-foreground">Profiles are private</p>
          <p className="text-sm text-muted-foreground">Everyone on BoilerConnect is anonymous, so other people&apos;s profiles are never shown.</p>
        </div>
      )}
    </div>
  );
}
