/*
 * X-style 3-column shell (Lane C owns Shell*): left nav 275px · center 600px · right rail 350px.
 * Imports the app-wide theme (ShellTheme.css) once — every route renders inside this layout.
 * Pages render into the center <main>; use <ShellPageHeader> for the sticky blurred header.
 */
import { Outlet } from 'react-router';
import { ShellProvider } from '@/components/Shell/ShellContext';
import { ShellBottomBar, ShellNav } from '@/components/Shell/ShellNav';
import { ShellRightRail } from '@/components/Shell/ShellRightRail';
import '@/components/Shell/ShellTheme.css';
import '@/components/Shell/ShellStyles.css';

export function ShellLayout() {
  return (
    <ShellProvider>
      <div className="bc-app">
        <div className="bc-shell">
          <ShellNav />
          <main className="bc-main">
            <Outlet />
          </main>
          <ShellRightRail />
        </div>
        <ShellBottomBar />
      </div>
    </ShellProvider>
  );
}
