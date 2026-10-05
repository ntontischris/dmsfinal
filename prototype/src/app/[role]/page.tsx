import { notFound } from 'next/navigation';

import { FICTIONAL_CLIENT } from '@/data/fictional-client';
import { OPEN_DECISIONS } from '@/data/decisions';
import { findRole, isRoleId } from '@/data/roles';
import { SCREENS, canSee, isFinal } from '@/data/screens';

interface RoleHomeProps {
  params: Promise<{ role: string }>;
}

export default async function RoleHome({ params }: RoleHomeProps) {
  const { role } = await params;
  if (!isRoleId(role)) notFound();

  const visible = SCREENS.filter((screen) => canSee(screen, role));
  const finals = visible.filter(isFinal).length;
  const client = FICTIONAL_CLIENT;

  return (
    <>
      <header className="screen-header">
        <div className="eyebrow">Όψη ρόλου</div>
        <h1>{findRole(role).label}</h1>
        <p className="muted">
          {visible.length} οθόνες για αυτόν τον ρόλο · {finals} τελικές · {OPEN_DECISIONS.length}{' '}
          ανοιχτά ερωτήματα σε όλο το prototype.
        </p>
      </header>
      <section className="card">
        <h2>Ο φανταστικός πελάτης</h2>
        <p>
          {client.legalName}, {client.city}. Υπεύθυνη: {client.owner}.
        </p>
        <ul>
          {client.agreements.map((agreement) => (
            <li key={agreement.title}>
              {agreement.title} ({agreement.kind}, {agreement.state})
              {agreement.periods.length > 0 &&
                `: ${agreement.periods.map((period) => period.label).join(', ')}`}
            </li>
          ))}
        </ul>
        <p className="muted">
          Χρήστες πελάτη: {client.users.map((user) => user.name).join(', ')}.
        </p>
      </section>
      <section className="card placeholder">
        Διάλεξε οθόνη από τη λίστα. Ο ρόλος αλλάζει από πάνω, χωρίς να φύγεις από την οθόνη.
      </section>
    </>
  );
}
