'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { RoleId } from '@/data/roles';
import { SECTIONS, canSee, screensOfSection } from '@/data/screens';

interface ScreenNavProps {
  role: RoleId;
}

// Μόνο οι οθόνες που έχει ο ρόλος, ομαδοποιημένες όπως στον κατάλογο του κεφαλαίου 8.
export function ScreenNav({ role }: ScreenNavProps) {
  const pathname = usePathname();
  const sections = SECTIONS.map((section) => ({
    ...section,
    screens: screensOfSection(section.letter).filter((screen) => canSee(screen, role)),
  })).filter((section) => section.screens.length > 0);
  const total = sections.reduce((sum, section) => sum + section.screens.length, 0);

  return (
    <details className="nav" open>
      <summary>Οθόνες ({total})</summary>
      {sections.map((section) => (
        <div key={section.letter} className="nav-section">
          <div className="nav-section-title">
            {section.letter}. {section.title}
          </div>
          <ul className="nav-list">
            {section.screens.map((screen) => {
              const href = `/${role}/${screen.code}`;
              return (
                <li key={screen.code}>
                  <Link
                    className="nav-link"
                    href={href}
                    aria-current={pathname === href ? 'page' : undefined}
                  >
                    <span className="nav-code">{screen.code}</span>
                    <span>{screen.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </details>
  );
}
