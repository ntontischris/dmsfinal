import Link from "next/link";
import { notFound } from "next/navigation";

import { DecisionsPanel } from "@/components/decisions-panel";
import { ROLES, ROLE_IDS, findRole, isRoleId } from "@/data/roles";
import { SCREENS, canSee, findScreen, isFinal } from "@/data/screens";
import { SCREEN_CONTENT } from "@/screens";

interface ScreenPageProps {
  params: Promise<{ role: string; code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const firstValues = (query: Record<string, string | string[] | undefined>) =>
  Object.fromEntries(
    Object.entries(query).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );

export const generateStaticParams = () =>
  ROLE_IDS.flatMap((role) =>
    SCREENS.map((screen) => ({ role, code: screen.code })),
  );

export default async function ScreenPage({
  params,
  searchParams,
}: ScreenPageProps) {
  const { role, code } = await params;
  const query = firstValues(await searchParams);
  const screen = findScreen(code);
  if (!isRoleId(role) || !screen) notFound();

  const note = screen.access[role];
  const searchString = new URLSearchParams(
    Object.entries(query).filter(
      (entry): entry is [string, string] => !!entry[1],
    ),
  ).toString();
  const search = searchString ? `?${searchString}` : "";
  const final = isFinal(screen);
  const Content = SCREEN_CONTENT[screen.code];

  return (
    <>
      <header className="screen-header">
        <div className="eyebrow">
          {screen.code} · Module {screen.module} ·{" "}
          {final ? "τελική" : "σκελετός"}
        </div>
        <h1>{screen.title}</h1>
        <ul
          className="chips"
          aria-label="Ποιοι ρόλοι την έχουν· πάτα για να τη δεις ως αυτόν τον ρόλο"
        >
          {ROLES.filter((candidate) => candidate.id in screen.access).map(
            (candidate) => (
              <li
                key={candidate.id}
                className="chip"
                data-current={candidate.id === role}
              >
                <Link
                  href={`/${candidate.id}/${screen.code}${search}`}
                  aria-current={candidate.id === role ? "page" : undefined}
                >
                  {candidate.label}
                </Link>
                {screen.access[candidate.id]
                  ? ` (${screen.access[candidate.id]})`
                  : ""}
              </li>
            ),
          )}
        </ul>
      </header>
      {canSee(screen, role) && Content ? (
        <Content role={role} query={query} />
      ) : canSee(screen, role) ? (
        <section className="card placeholder">
          Η οθόνη στήνεται στο ticket του module «{screen.module}».
          {note && (
            <p>
              Ως {findRole(role).label}: {note}.
            </p>
          )}
        </section>
      ) : (
        <section className="card" role="status">
          <h2>Χωρίς δικαίωμα</h2>
          <p className="muted">
            Ο ρόλος «{findRole(role).label}» δεν έχει αυτή την οθόνη. Άλλαξε
            ρόλο από πάνω.
          </p>
        </section>
      )}
      <DecisionsPanel code={screen.code} isFinal={final} />
    </>
  );
}
