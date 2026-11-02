import { AUTOMATIONS_PATH } from "../automation-labels";
import type { Catalog, CatalogEvent } from "../automation-view-schema";

// K1 (νέα εμφάνιση): τα φίλτρα του prototype (`screens/k1-model.ts`) πάνω στον πραγματικό κατάλογο (automation_catalog).
// Καθαρές συναρτήσεις.

export type OnlyFilter = "active" | "client" | "off";

export const parseOnly = (value: string | undefined): OnlyFilter | undefined =>
  value === "active" || value === "client" || value === "off"
    ? value
    : undefined;

// Μόνο ομάδα που υπάρχει στον κατάλογο.
export const parseGroup = (
  catalog: Catalog,
  value: string | undefined,
): string | undefined =>
  catalog.groups.some((group) => group.code === value) ? value : undefined;

const matchesOnly = (
  event: CatalogEvent,
  only: OnlyFilter | undefined,
): boolean => {
  if (only === "active") return event.activeCount > 0;
  if (only === "off") return event.activeCount === 0;
  if (only === "client") return event.isClientFacing;
  return true;
};

export const eventsFor = (
  catalog: Catalog,
  group: string | undefined,
  only: OnlyFilter | undefined,
): readonly CatalogEvent[] =>
  catalog.events.filter(
    (event) => (!group || event.group === group) && matchesOnly(event, only),
  );

export const k1Href = (
  group: string | undefined,
  only: OnlyFilter | undefined,
): string => {
  const params = new URLSearchParams();
  if (group) params.set("group", group);
  if (only) params.set("only", only);
  const search = params.toString();
  return search ? `${AUTOMATIONS_PATH}?${search}` : AUTOMATIONS_PATH;
};

export const groupTitle = (group: { code: string; label: string }): string =>
  `${group.code}. ${group.label}`;
