import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { RoleSwitcher } from '@/components/role-switcher';
import { ScreenNav } from '@/components/screen-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { ROLE_IDS, isRoleId } from '@/data/roles';

interface RoleLayoutProps {
  children: ReactNode;
  params: Promise<{ role: string }>;
}

export const generateStaticParams = () => ROLE_IDS.map((role) => ({ role }));

export default async function RoleLayout({ children, params }: RoleLayoutProps) {
  const { role } = await params;
  if (!isRoleId(role)) notFound();

  return (
    <>
      <header className="topbar">
        <Link className="topbar-brand" href={`/${role}`}>
          DMS · prototype
        </Link>
        <div className="topbar-controls">
          <Link className="button" href="/scenarios">
            Σενάρια
          </Link>
          <RoleSwitcher current={role} />
          <ThemeToggle />
        </div>
      </header>
      <div className="shell">
        <nav className="sidebar" aria-label="Οθόνες">
          <ScreenNav role={role} />
        </nav>
        <main className="main">{children}</main>
      </div>
    </>
  );
}
