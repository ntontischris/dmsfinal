import Link from "next/link";

import { FilterBar } from "@/spaces/kit/filter-bar";
import { StateNotice } from "@/spaces/screens/shared";

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
  { id: "wired", label: "Μόνο συνδεδεμένα" },
];

interface FiltersProps {
  catalog: Catalog;
  group: string | undefined;
  only: OnlyFilter | undefined;
}

// Τα φίλτρα του prototype (`k1-list.tsx`) σε μία σειρά καρτών. Η αναζήτηση του prototype δεν έχει ανάγνωση πίσω της και
// λείπει.
export function K1Filters({ catalog, group, only }: FiltersProps) {
  const [all, ...rest] = ONLY_LABELS;
  const toOption = (o: (typeof ONLY_LABELS)[number]) => ({
    label: o.label,
    href: k1Href(group, o.id),
    isCurrent: only === o.id,
  });
  return (
    <FilterBar
      name="k1-filters"
      filters={[
        {
          label: "Ομάδα Γεγονότων",
          isSearchable: true,
          all: {
            label: "όλες",
            href: k1Href(undefined, only),
            isCurrent: !group,
          },
          options: catalog.groups.map((g) => ({
            label: groupTitle(g),
            href: k1Href(g.code, only),
            isCurrent: group === g.code,
          })),
        },
        {
          label: "Αυτοματισμοί",
          all: all && { ...toOption(all), label: "όλοι" },
          options: rest.map(toOption),
        },
      ]}
      clearHref={k1Href(undefined, undefined)}
    />
  );
}

function EventRow({ event }: { event: CatalogEvent }) {
  return (
    <li className="ml-line" data-faded={event.isWired ? undefined : "true"}>
      <span className="ml-thumb k1-num" aria-hidden="true">
        {event.number}
      </span>
      <Link className="ml-main k1-event" href={eventHref(event.code)}>
        <strong>{event.label}</strong>
        <small>{`${KIND_LABELS[event.kind]} · ${event.activeCount} ενεργοί από ${event.totalCount}`}</small>
      </Link>
      <span className="k1-meta">
        {event.isClientFacing && <span className="ml-tag">προς πελάτη</span>}
        {event.isCostOnly && <span className="ml-tag">κόστος</span>}
        {!event.isWired && <span className="ml-tag">{WIRED_LATER}</span>}
      </span>
    </li>
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
  const shown = catalog.groups.filter((g) =>
    events.some((e) => e.group === g.code),
  );
  // Κλειστές ομάδες· μόνο όταν το φίλτρο αφήνει μία, ανοίγει.
  const isSingle = shown.length === 1;
  return (
    <div className="ml-stack">
      {shown.map((g) => {
        const rows = events.filter((e) => e.group === g.code);
        return (
          <details key={g.code} className="ml-box" open={isSingle || undefined}>
            <summary>
              <h2 className="ml-box-title">{groupTitle(g)}</h2>
              <small>{`${rows.length} Γεγονότα`}</small>
            </summary>
            <ul className="ml-list">
              {rows.map((e) => (
                <EventRow key={e.code} event={e} />
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
