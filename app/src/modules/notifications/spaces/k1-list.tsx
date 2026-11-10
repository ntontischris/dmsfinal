import { FilterBar } from "@/spaces/kit/filter-bar";
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
