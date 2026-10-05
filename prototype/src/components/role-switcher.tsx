'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ChangeEvent } from 'react';

import { ROLES, type RoleId } from '@/data/roles';

interface RoleSwitcherProps {
  current: RoleId;
}

// Κρατά την ίδια οθόνη και αλλάζει μόνο τον ρόλο: /owner/B1 → /client/B1.
export function RoleSwitcher({ current }: RoleSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const [, , ...rest] = pathname.split('/');
    router.push(['', event.target.value, ...rest].join('/'));
  };

  return (
    <label className="muted">
      Ρόλος{' '}
      <select className="select" value={current} onChange={handleChange}>
        {ROLES.map((role) => (
          <option key={role.id} value={role.id}>
            {role.label}
          </option>
        ))}
      </select>
    </label>
  );
}
