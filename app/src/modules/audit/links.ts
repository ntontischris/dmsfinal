import type { AuditItem } from "./schema";

// Η σελίδα του στοιχείου μιας γραμμής (ή του «γονέα» του, π.χ. τα ποσά μιας Συμφωνίας → η Συμφωνία). Η σελίδα κρίνει
// μόνη της αν ο Χρήστης τη βλέπει· εδώ μόνο ο σύνδεσμος.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PAGES: Readonly<Record<string, string>> = {
  clients: "/app/clients/",
  opportunities: "/app/pipeline/",
  agreements: "/app/agreements/",
  productions: "/app/productions/",
  filmings: "/app/filming/",
  deliverables: "/app/deliverables/",
  equipment_items: "/app/equipment/",
  catalogue_items: "/app/catalogue/",
  team_users: "/app/team/",
  roles: "/app/team/roles/",
};

export const pageHref = (
  item: Pick<AuditItem, "entity" | "parent" | "entityId">,
): string | null => {
  const base = PAGES[item.parent ?? item.entity];
  return base && item.entityId && UUID.test(item.entityId)
    ? `${base}${item.entityId}`
    : null;
};
