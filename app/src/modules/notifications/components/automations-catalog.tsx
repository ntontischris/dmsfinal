import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";

import {
  catalogHref,
  eventHref,
  filterEvents,
  type CatalogFilter,
} from "../automation-helpers";
import {
  ALL_GROUPS,
  COST_BADGE,
  EMPTY_FILTER_TEXT,
  EMPTY_FILTER_TITLE,
  FILTER_GROUP_LABEL,
  FILTER_ONLY_LABEL,
  KIND_LABELS,
  ONLY_ACTIVE,
  ONLY_ALL,
  ONLY_WIRED,
  WIRED_LATER,
} from "../automation-labels";
import type { Catalog, CatalogEvent } from "../automation-view-schema";

// Ο κατάλογος της K1 (#173): Γεγονότα ανά ομάδα, με φίλτρα ομάδας, «μόνο με ενεργούς» και «μόνο συνδεδεμένα».

function Filters({
  catalog,
  filter,
}: {
  catalog: Catalog;
  filter: CatalogFilter;
}) {
  const only = { onlyActive: false, onlyWired: false };
  return (
    <div className="grid gap-2">
      <Segmented
        label={FILTER_GROUP_LABEL}
        options={[
          {
            label: ALL_GROUPS,
            href: catalogHref({ ...filter, group: null }),
            isCurrent: !filter.group,
          },
          ...catalog.groups.map((group) => ({
            label: `${group.code}. ${group.label}`,
            href: catalogHref({ ...filter, group: group.code }),
            isCurrent: filter.group === group.code,
          })),
        ]}
      />
      <Segmented
        label={FILTER_ONLY_LABEL}
        options={[
          {
            label: ONLY_ALL,
            href: catalogHref({ ...filter, ...only }),
            isCurrent: !filter.onlyActive && !filter.onlyWired,
          },
          {
            label: ONLY_ACTIVE,
            href: catalogHref({ ...filter, ...only, onlyActive: true }),
            isCurrent: filter.onlyActive,
          },
          {
            label: ONLY_WIRED,
            href: catalogHref({ ...filter, ...only, onlyWired: true }),
            isCurrent: filter.onlyWired,
          },
        ]}
      />
    </div>
  );
}

function EventRow({ event }: { event: CatalogEvent }) {
  return (
    <li className="border-b last:border-b-0">
      <Link
        href={eventHref(event.code)}
        className="grid gap-1 px-1 py-2 no-underline hover:bg-muted"
      >
        <span className="flex items-baseline gap-2">
          <span className="w-7 shrink-0 text-xs text-muted-foreground tabular-nums">
            {event.number}
          </span>
          <strong className="font-medium text-foreground">{event.label}</strong>
        </span>
        <span className="flex flex-wrap items-center gap-2 pl-9 text-xs text-muted-foreground">
          <span>{KIND_LABELS[event.kind]}</span>
          <span>
            {event.activeCount} ενεργοί από {event.totalCount}
          </span>
          {!event.isWired && <Badge tone="attention">{WIRED_LATER}</Badge>}
          {event.isCostOnly && <Badge>{COST_BADGE}</Badge>}
        </span>
      </Link>
    </li>
  );
}

export function AutomationsCatalog({
  catalog,
  filter,
}: {
  catalog: Catalog;
  filter: CatalogFilter;
}) {
  const events = filterEvents(catalog.events, filter);
  return (
    <div className="grid gap-4">
      <Filters catalog={catalog} filter={filter} />
      {events.length === 0 ? (
        <Notice kind="empty" title={EMPTY_FILTER_TITLE}>
          <p className="m-0">{EMPTY_FILTER_TEXT}</p>
        </Notice>
      ) : (
        catalog.groups.map((group) => {
          const rows = events.filter((event) => event.group === group.code);
          if (rows.length === 0) return null;
          return (
            <Panel
              key={group.code}
              label={`${group.code}. ${group.label}`}
              aside={`${rows.length} Γεγονότα`}
            >
              <ul className="m-0 list-none p-0">
                {rows.map((event) => (
                  <EventRow key={event.code} event={event} />
                ))}
              </ul>
            </Panel>
          );
        })
      )}
    </div>
  );
}
