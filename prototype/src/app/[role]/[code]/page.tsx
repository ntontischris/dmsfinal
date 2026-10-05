import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { DecisionsPanel } from '@/components/decisions-panel';
import { ROLES, ROLE_IDS, findRole, isRoleId } from '@/data/roles';
import { SCREENS, canSee, findScreen, isFinal } from '@/data/screens';
import { DirectionPreview } from '@/directions/direction-preview';
import { isDirectionScreen } from '@/directions/directions';

interface ScreenPageProps {
  params: Promise<{ role: string; code: string }>;
}

export const generateStaticParams = () =>
  ROLE_IDS.flatMap((role) => SCREENS.map((screen) => ({ role, code: screen.code })));

export default async function ScreenPage({ params }: ScreenPageProps) {
  const { role, code } = await params;
  const screen = findScreen(code);
  if (!isRoleId(role) || !screen) notFound();

  const note = screen.access[role];
  const final = isFinal(screen);

  return (
    <>
      <header className="screen-header">
        <div className="eyebrow">
          {screen.code} · Module {screen.module} · {final ? 'τελική' : 'σκελετός'}
        </div>
        <h1>{screen.title}</h1>
        <ul className="chips" aria-label="Ποιοι ρόλοι την έχουν">
          {ROLES.filter((candidate) => candidate.id in screen.access).map((candidate) => (
            <li key={candidate.id} className="chip" data-current={candidate.id === role}>
              {candidate.label}
              {screen.access[candidate.id] ? ` (${screen.access[candidate.id]})` : ''}
            </li>
          ))}
        </ul>
      </header>
      {canSee(screen, role) && isDirectionScreen(screen.code) ? (
        <Suspense>
          <DirectionPreview code={screen.code} />
        </Suspense>
      ) : canSee(screen, role) ? (
        <section className="card placeholder">
          Η οθόνη στήνεται στο ticket του module «{screen.module}».
          {note && <p>Ως {findRole(role).label}: {note}.</p>}
        </section>
      ) : (
        <section className="card" role="status">
          <h2>Χωρίς δικαίωμα</h2>
          <p className="muted">
            Ο ρόλος «{findRole(role).label}» δεν έχει αυτή την οθόνη. Άλλαξε ρόλο από πάνω.
          </p>
        </section>
      )}
      <DecisionsPanel code={screen.code} isFinal={final} />
    </>
  );
}
