import type { ReactNode } from 'react';
import Link from 'next/link';

import { auth0 } from '../../../lib/auth0';
import { ShellBreadcrumb } from '../../../components/ShellBreadcrumb';
import { ShellSidebarNav } from '../../../components/ShellSidebarNav';

export default async function OfficeShellLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = auth0 ? await auth0.getSession() : null;

  return (
    <div className="shell-grid">
      <aside className="shell-sidebar">
        <p className="shell-brand">
          <span aria-hidden="true" className="shell-brand__tile">
            HS
          </span>
          Height Safety
        </p>
        <ShellSidebarNav />
        {session ? (
          <div className="shell-sidebar__session">
            <span>{session.user.email ?? 'Signed-in office user'}</span>
            <a href="/auth/logout">Sign out</a>
          </div>
        ) : null}
      </aside>
      <div className="shell-column">
        <header className="shell-header">
          <ShellBreadcrumb />
        </header>
        <main className="shell-main">{children}</main>
        <footer className="shell-footer">
          <Link href="/legal">Scope and legal</Link>
        </footer>
      </div>
    </div>
  );
}
