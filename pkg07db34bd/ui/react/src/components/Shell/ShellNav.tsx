/*
 * Navigation chrome (Lane C owns Shell*): the X-style left column (wordmark, nav, gold "Ask" pill, persona
 * switcher) and, under 700px, the fixed bottom tab bar + floating gold "Ask" button.
 */
import { Link, useLocation } from 'react-router';
import { Feather, House, Inbox, Mail, User, type LucideIcon } from 'lucide-react';
import { usePersona } from '@/components/Persona/PersonaContext';
import { PersonaSwitcher } from '@/components/Persona/PersonaSwitcher';
import { useShell } from '@/components/Shell/ShellContext';
import { ShellPurdueP } from '@/components/Shell/ShellLogo';

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  to: (memberId: string) => string;
  isActive: (pathname: string) => boolean;
}

const NAV: NavItem[] = [
  { key: 'home', label: 'Home', icon: House, to: () => '/', isActive: (p) => p === '/' || p.startsWith('/post') },
  { key: 'inbox', label: 'Questions for you', icon: Inbox, to: () => '/inbox', isActive: (p) => p.startsWith('/inbox') },
  {
    key: 'messages',
    label: 'Messages',
    icon: Mail,
    to: () => '/messages',
    isActive: (p) => p.startsWith('/messages'),
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: User,
    to: (id) => (id ? `/profile/${id}` : '/profile'),
    isActive: (p) => p.startsWith('/profile'),
  },
];

function useNavState() {
  const { pathname } = useLocation();
  const { actingMemberId } = usePersona();
  return NAV.map((item) => ({ ...item, href: item.to(actingMemberId), active: item.isActive(pathname) }));
}

export function ShellNav() {
  const items = useNavState();
  const { requestCompose } = useShell();

  return (
    <header className="bc-nav">
      <div className="bc-nav__inner">
        <Link to="/" className="bc-wordmark" aria-label="BoilerConnect home">
          <ShellPurdueP className="bc-wordmark__logo" />
          <span className="bc-wordmark__full">BoilerConnect</span>
        </Link>

        <nav aria-label="Primary" className="bc-nav__list">
          {items.map(({ key, label, icon: Icon, href, active }) => (
            <Link
              key={key}
              to={href}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className={`bc-nav__item ${active ? 'bc-nav__item--active' : ''}`}
            >
              <span className="bc-nav__pill">
                <Icon size={26} aria-hidden className="bc-nav__icon" />
                <span className="bc-nav__label">{label}</span>
              </span>
            </Link>
          ))}
        </nav>

        <button type="button" className="bc-ask" onClick={requestCompose} aria-label="Ask a question">
          <span className="bc-ask__label">Ask</span>
          <Feather size={24} className="bc-ask__icon" aria-hidden />
        </button>

        <div className="bc-nav__persona">
          <PersonaSwitcher />
        </div>
      </div>
    </header>
  );
}

/** <700px: fixed bottom tab bar (Home, Inbox, Messages, Profile + persona) and a floating gold Ask button. */
export function ShellBottomBar() {
  const items = useNavState();
  const { requestCompose } = useShell();

  return (
    <>
      <button type="button" className="bc-fab" onClick={requestCompose} aria-label="Ask a question">
        <Feather size={24} aria-hidden />
      </button>
      <nav aria-label="Primary (mobile)" className="bc-bottombar">
        {items.map(({ key, label, icon: Icon, href, active }) => (
          <Link
            key={key}
            to={href}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={`bc-bottombar__item ${active ? 'bc-bottombar__item--active' : ''}`}
          >
            <Icon size={26} aria-hidden />
          </Link>
        ))}
        <div className="bc-bottombar__persona">
          <PersonaSwitcher compact />
        </div>
      </nav>
    </>
  );
}
