import Link from "next/link";

import {
  EVENT_GROUPS,
  automationsOf,
  type AppEvent,
} from "@/data/notifications";
import type { RoleId } from "@/data/roles";
import {
  activeCount,
  eventsFor,
  isClientEvent,
  type OnlyFilter,
} from "@/screens/k1-model";
import { Badge, StateNotice, screenHref } from "@/screens/shared";

import "./k1.css";

const ONLY_LABELS: readonly { id: OnlyFilter | undefined; label: string }[] = [
  { id: undefined, label: "Όλα" },
  { id: "active", label: "Με ενεργούς" },
  { id: "client", label: "Προς πελάτη" },
  { id: "off", label: "Όλοι σβηστοί" },
];

interface FiltersProps {
  role: RoleId;
  group: string | undefined;
  only: OnlyFilter | undefined;
  state: string | undefined;
}

export function K1Filters({ role, group, only, state }: FiltersProps) {
  const href = (g: string | undefined, o: OnlyFilter | undefined) =>
    screenHref(role, "K1", { group: g, only: o, state });
  return (
    <>
      <nav className="k1-filters" aria-label="Ομάδα Γεγονότων">
        <Link
          className="button"
          aria-current={!group}
          href={href(undefined, only)}
        >
          Όλες οι ομάδες
        </Link>
        {EVENT_GROUPS.map((g) => (
          <Link
            key={g.id}
            className="button"
            aria-current={group === g.id}
            href={href(g.id, only)}
          >
            {g.letter}. {g.title}
          </Link>
        ))}
      </nav>
      <nav className="k1-filters" aria-label="Φίλτρο">
        {ONLY_LABELS.map((o) => (
          <Link
            key={o.label}
            className="button"
            aria-current={only === o.id}
            href={href(group, o.id)}
          >
            {o.label}
          </Link>
        ))}
        <input
          className="input grow"
          type="search"
          placeholder="Αναζήτηση Γεγονότος"
          aria-label="Αναζήτηση Γεγονότος"
        />
      </nav>
    </>
  );
}

function EventRow({ role, event }: { role: RoleId; event: AppEvent }) {
  const total = automationsOf(event.id).length;
  return (
    <li className="k1-event">
      <Link href={screenHref(role, "K1", { event: String(event.id) })}>
        <span className="k1-event-top">
          <span className="k1-num">{event.id}</span>
          <strong>{event.title}</strong>
        </span>
        <span className="k1-meta">
          <span className="muted">{event.kind}</span>
          <span className="muted">
            {activeCount(event)} ενεργοί από {total}
          </span>
          {isClientEvent(event) && <Badge>προς πελάτη</Badge>}
          {event.isCostOnly && <Badge>κόστος</Badge>}
        </span>
      </Link>
    </li>
  );
}

interface CatalogueProps {
  role: RoleId;
  group: string | undefined;
  only: OnlyFilter | undefined;
  isEmpty: boolean;
}

export function Catalogue({ role, group, only, isEmpty }: CatalogueProps) {
  const events = isEmpty ? [] : eventsFor(group, only);
  if (events.length === 0) {
    return (
      <StateNotice kind="empty" title="Κανένας Αυτοματισμός ακόμα">
        {isEmpty
          ? "Οι Αυτοματισμοί δεν φορτώθηκαν ή δεν έχουν οριστεί."
          : "Κανένα Γεγονός δεν ταιριάζει με τα φίλτρα. Άλλαξε ή καθάρισε τα φίλτρα."}
      </StateNotice>
    );
  }
  return (
    <>
      {EVENT_GROUPS.map((g) => {
        const rows = events.filter((e) => e.groupId === g.id);
        if (rows.length === 0) return null;
        return (
          <section key={g.id} className="card k1-group">
            <div className="card-title">
              <h2>
                {g.letter}. {g.title}
              </h2>
              <span className="muted">{rows.length} Γεγονότα</span>
            </div>
            <ul className="list">
              {rows.map((e) => (
                <EventRow key={e.id} role={role} event={e} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
