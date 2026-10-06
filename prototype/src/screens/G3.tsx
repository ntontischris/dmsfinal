import Link from "next/link";

import {
  PRODUCTIONS,
  findProduction,
  type ProductionStub,
} from "@/data/filming";
import {
  isInternal,
  isOverrun,
  needsHours,
  productionCapsOf,
} from "@/data/productions-access";
import type { RoleId } from "@/data/roles";
import { G3Workbench } from "@/screens/g3-workbench";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./g3.css";

const DEFAULT_ID = "pr-kinisi-08";

const GROUPS: readonly {
  title: string;
  has: (p: ProductionStub) => boolean;
}[] = [
  { title: "Θέλουν Πραγματικές ώρες", has: needsHours },
  { title: "Υπέρβαση κόστους", has: (p) => !needsHours(p) && isOverrun(p) },
  { title: "Οι υπόλοιπες", has: (p) => !needsHours(p) && !isOverrun(p) },
];

function Picker({ role, currentId }: { role: RoleId; currentId: string }) {
  return (
    <nav className="card g3-picker" aria-label="Παραγωγές">
      {GROUPS.map((group) => {
        const items = PRODUCTIONS.filter(group.has);
        return items.length === 0 ? null : (
          <div key={group.title}>
            <strong className="muted">{group.title}</strong>
            <ul className="g3-chips">
              {items.map((p) => (
                <li key={p.id}>
                  <Link
                    href={screenHref(role, "G3", { id: p.id })}
                    aria-current={p.id === currentId ? "page" : undefined}
                  >
                    {p.title}
                    {isInternal(p) && " (εσωτερική)"}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function G3({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = productionCapsOf(role);
  const production = findProduction(query.id ?? DEFAULT_ID);
  return (
    <div className="g3">
      <StateSwitcher
        role={role}
        code="G3"
        state={state}
        keep={{ id: query.id }}
      />
      {!caps.canSeeCost ? (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Το κόστος το βλέπουν μόνο όσοι «Βλέπουν κόστος και κερδοφορία».</p>
        </StateNotice>
      ) : state === "error" ? (
        <ErrorNotice what="το κόστος της Παραγωγής" />
      ) : state === "empty" ? (
        <StateNotice
          kind="empty"
          title="Δεν υπάρχει Παραγωγή με κόστος να δεις"
        />
      ) : !production ? (
        <StateNotice kind="empty" title="Δεν βρέθηκε η Παραγωγή">
          <p>
            <Link href={screenHref(role, "G1", {})}>Πίσω στις Παραγωγές</Link>
          </p>
        </StateNotice>
      ) : (
        <>
          <Picker role={role} currentId={production.id} />
          <header className="row g3-head">
            <h1>Κόστος και ώρες: {production.title}</h1>
            <Link href={screenHref(role, "G2", { id: production.id })}>
              Πίσω στην Παραγωγή (G2)
            </Link>
          </header>
          <G3Workbench
            key={production.id}
            role={role}
            production={production}
            canManageCost={caps.canManageCost}
          />
        </>
      )}
    </div>
  );
}
