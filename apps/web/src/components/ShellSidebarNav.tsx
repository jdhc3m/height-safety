'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/office', label: 'Jobs' },
  { href: '/office/status-pill', label: 'Status pills' },
] as const;

export function ShellSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="shell-nav" aria-label="Office navigation">
      <ul>
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? 'page' : undefined}>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
