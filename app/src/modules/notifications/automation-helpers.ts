import {
  CHANNEL_LABELS,
  RECIPIENT_KIND_LABELS,
  RELATIVE_LABELS,
  WAIT_UNITS,
} from "./automation-labels";
import type {
  Automation,
  CatalogEvent,
  EventKind,
  EventPage,
} from "./automation-view-schema";

// Καθαρές συναρτήσεις της K1 (#173): φίλτρα, χρονισμός, παραλήπτες.

export type WaitUnit = (typeof WAIT_UNITS)[number]["value"];

export interface CatalogFilter {
  group: string | null;
  onlyActive: boolean;
  onlyWired: boolean;
}

export const EVENT_CODE_PATTERN = /^[a-z_]+\.[a-z_]+$/;

export const parseCatalogFilter = (params: {
  group?: string;
  only?: string;
}): CatalogFilter => ({
  group: params.group && params.group.length <= 3 ? params.group : null,
  onlyActive: params.only === "active",
  onlyWired: params.only === "wired",
});

export const filterEvents = (
  events: readonly CatalogEvent[],
  filter: CatalogFilter,
): CatalogEvent[] =>
  events.filter(
    (event) =>
      (!filter.group || event.group === filter.group) &&
      (!filter.onlyActive || event.activeCount > 0) &&
      (!filter.onlyWired || event.isWired),
  );

export const catalogHref = (filter: CatalogFilter): string => {
  const params = new URLSearchParams();
  if (filter.group) params.set("group", filter.group);
  if (filter.onlyActive) params.set("only", "active");
  if (filter.onlyWired) params.set("only", "wired");
  const query = params.toString();
  return `/app/settings/automations${query ? `?${query}` : ""}`;
};

export const eventHref = (code: string): string =>
  `/app/settings/automations/${encodeURIComponent(code)}`;

// Ο χρονισμός που ταιριάζει στο είδος του Γεγονότος.
export const timingFor = (kind: EventKind): Automation["timing"] =>
  kind === "instant" ? "immediate" : kind === "dated" ? "offset" : "wait";

// Λεπτά → μεγαλύτερη μονάδα που τα διαιρεί ακριβώς.
export function splitWait(minutes: number | null): {
  amount: number;
  unit: WaitUnit;
} {
  if (!minutes || minutes <= 0) return { amount: 1, unit: "days" };
  if (minutes % 1440 === 0) return { amount: minutes / 1440, unit: "days" };
  if (minutes % 60 === 0) return { amount: minutes / 60, unit: "hours" };
  return { amount: minutes, unit: "minutes" };
}

export const toWaitMinutes = (amount: number, unit: WaitUnit): number =>
  amount * (WAIT_UNITS.find((item) => item.value === unit)?.minutes ?? 1);

const dayCount = (days: number): string =>
  `${days} ${days === 1 ? "μέρα" : "μέρες"}`;

export function timingText(automation: Automation): string {
  if (automation.timing === "immediate") return "αμέσως";
  if (automation.timing === "offset") {
    const days = automation.offsetDays ?? 0;
    const when =
      days === 0
        ? "την ημέρα του Γεγονότος"
        : `${dayCount(Math.abs(days))} ${days < 0 ? "πριν" : "μετά"}`;
    return `${when}, στις ${automation.sendTime ?? "—"}`;
  }
  const { amount, unit } = splitWait(automation.waitMinutes);
  const label = WAIT_UNITS.find((item) => item.value === unit)?.label ?? "";
  return `μετά από ${amount} ${label} χωρίς ενέργεια`;
}

export function recipientText(automation: Automation, page: EventPage): string {
  if (automation.recipientKind === "relative")
    return (
      RELATIVE_LABELS[automation.recipientRelative ?? ""] ??
      automation.recipientRelative ??
      "—"
    );
  if (automation.recipientKind === "permission") {
    const permission = page.permissions.find(
      (p) => p.code === automation.recipientPermission,
    );
    return `Όσοι «${permission?.label ?? automation.recipientPermission ?? "—"}»`;
  }
  if (automation.recipientKind === "users") {
    const names = automation.recipientUserIds.map(
      (id) => page.teamUsers.find((user) => user.id === id)?.name ?? "—",
    );
    return names.join(", ");
  }
  return RECIPIENT_KIND_LABELS.visitor;
}

export const automationTitle = (automation: Automation): string =>
  `${CHANNEL_LABELS[automation.channel]} · ${automation.isInitial ? "αρχικός" : "προστέθηκε από τη Διαχείριση"}`;

export const hasMissingEnglish = (automation: Automation): boolean =>
  automation.bodyEn.trim() === "" ||
  (automation.channel === "email" && !(automation.subjectEn ?? "").trim());

// Οι σχετικοί παραλήπτες που είναι πελάτης: εκεί έχει νόημα το «απαραίτητο».
export const CLIENT_RELATIVES: readonly string[] = [
  "client",
  "request_client",
  "filming_requester",
  "self",
];

export const goesToClient = (automation: Automation): boolean =>
  (automation.recipientKind === "relative" && CLIENT_RELATIVES.includes(automation.recipientRelative ?? "")) ||
  automation.recipientKind === "visitor";
