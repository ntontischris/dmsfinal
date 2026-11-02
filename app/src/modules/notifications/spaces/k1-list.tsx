import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, StateNotice } from "@/spaces/screens/shared";

import { eventHref } from "../automation-helpers";
import { KIND_LABELS, WIRED_LATER } from "../automation-labels";
import type { Catalog, CatalogEvent } from "../automation-view-schema";
import { eventsFor, groupTitle, k1Href, type OnlyFilter } from "./k1-model";

import "./k1.css";

const ONLY_LABELS: readonly { id: OnlyFilter | undefined; label: string }[] = [
  { id: undefined, label: "Όλα" },
  { id: "active", label: "Με ενεργούς" },
  { id: "client", label: "Προς πελάτη" },
  { id: "off", label: "Όλοι σβηστοί" },
];

interface FiltersProps {
  catalog: Catalog;
  group: string | undefined;
  only: OnlyFilter | undefined;
}

// Τα φίλτρα του prototype (`k1-list.tsx`). Η αναζήτηση του prototype δεν έχει ανάγνωση πίσω της και λείπει.
export function K1Filters({ catalog, group, only }: FiltersProps) {
  return (
    <>
      <nav className="k1-filters" aria-label="Ομάδα Γεγονότων">
        <Link
          className="button"
          aria-current={!group}
          href={k1Href(undefined, only)}
        >
          Όλες οι ομάδες
        </Link>
        {catalog.groups.map((g) => (
          <Link
            key={g.code}
            className="button"
            aria-current={group === g.code}
            href={k1Href(g.code, only)}
          >
            {groupTitle(g)}
          </Link>
        ))}
      </nav>
      <nav className="k1-filters" aria-label="Φίλτρο">
        {ONLY_LABELS.map((o) => (
          <Link
            key={o.label}
            className="button"
            aria-current={only === o.id}
            href={k1Href(group, o.id)}
          >
            {o.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

function EventRow({ event }: { event: CatalogEvent }) {
  return (
    <ListRow
      lead={<span className="k1-num">{event.number}</span>}
      href={eventHref(event.code)}
      title={event.label}
      sub={`${KIND_LABELS[event.kind]} · ${event.activeCount} ενεργοί από ${event.totalCount}`}
      aside={
        <>
          {event.isClientFacing && <Badge>προς πελάτη</Badge>}
          {event.isCostOnly && <Badge>κόστος</Badge>}
          {!event.isWired && <Badge tone="waiting">{WIRED_LATER}</Badge>}
        </>
      }
    />
  );
}

export function Catalogue({ catalog, group, only }: FiltersProps) {
  const events = eventsFor(catalog, group, only);
  if (events.length === 0) {
    return (
      <StateNotice kind="empty" title="Κανένας Αυτοματισμός ακόμα">
        {catalog.events.length === 0
          ? "Οι Αυτοματισμοί δεν έχουν οριστεί."
          : "Κανένα Γεγονός δεν ταιριάζει με τα φίλτρα. Άλλαξε ή καθάρισε τα φίλτρα."}
      </StateNotice>
    );
  }
  return (
    <>
      {catalog.groups.map((g) => {
        const rows = events.filter((e) => e.group === g.code);
        if (rows.length === 0) return null;
        return (
          <Panel
            key={g.code}
            label={groupTitle(g)}
            aside={`${rows.length} Γεγονότα`}
            isFlush
          >
            <RowList>
              {rows.map((e) => (
                <EventRow key={e.code} event={e} />
              ))}
            </RowList>
          </Panel>
        );
      })}
    </>
  );
}
