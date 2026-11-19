/* X-style 3-column shell: left nav · center column · right rail (Lane C owns Shell*). */
import { NavLink, Outlet } from 'react-router';
import { Home, Inbox, Mail, User } from 'lucide-react';
import { PersonaSwitcher } from '@/components/Persona/PersonaSwitcher';
import { usePersona } from '@/components/Persona/PersonaContext';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/inbox', label: 'Questions for you', icon: Inbox, end: false },
  { to: '/messages', label: 'Messages', icon: Mail, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
];

export function ShellLayout() {
  const { actingMember } = usePersona();

  return (
    <div className="flex h-screen justify-center overflow-hidden bg-background text-foreground">
      {/* Left nav */}
      <aside className="flex w-20 shrink-0 flex-col gap-2 border-r border-border p-3 xl:w-64">
        <div className="px-3 py-2 text-xl font-extrabold">
          <span aria-hidden>🚂</span> <span className="hidden xl:inline">BoilerConnect</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to === '/profile' && actingMember ? `/profile/${actingMember.id}` : to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-full px-3 py-2.5 text-base text-foreground hover:bg-muted ${
                  isActive ? 'font-bold' : 'font-normal'
                }`
              }
            >
              <Icon className="size-5" />
              <span className="hidden xl:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Center column — each page is its own scroll container */}
      <main className="flex min-h-0 w-full max-w-[640px] flex-col overflow-auto border-r border-border">
        <Outlet />
      </main>

      {/* Right rail */}
      <aside className="hidden w-80 shrink-0 flex-col gap-4 p-4 lg:flex">
        <div className="rounded-xl border border-border p-4">
          <PersonaSwitcher />
          {actingMember && <p className="mt-2 text-xs text-muted-foreground">{actingMember.roleLabel}</p>}
        </div>
        <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
          Ask anything. BoilerConnect finds the Purdue students, experts, and alumni who know the answer.
        </div>
      </aside>
    </div>
  );
}
