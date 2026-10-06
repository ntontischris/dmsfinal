import {
  EVENTS,
  EVENT_GROUPS,
  automationsOf,
  type AppEvent,
  type Automation,
  type Recipient,
  type Timing,
} from "@/data/notifications";

export type OnlyFilter = "active" | "client" | "off";

export const parseOnly = (value: string | undefined): OnlyFilter | undefined =>
  value === "active" || value === "client" || value === "off"
    ? value
    : undefined;

export const parseGroup = (value: string | undefined): string | undefined =>
  EVENT_GROUPS.some((g) => g.id === value) ? value : undefined;

export const parseEventId = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const id = Number(value);
  return Number.isInteger(id) ? id : undefined;
};

export const goesToClient = (a: Automation): boolean =>
  a.recipients.some(
    (r) => r.kind === "επισκέπτης" || (r.kind === "σχετικός" && r.isClient),
  );

export const isClientEvent = (event: AppEvent): boolean =>
  automationsOf(event.id).some(goesToClient);

export const activeCount = (event: AppEvent): number =>
  automationsOf(event.id).filter((a) => a.isActive).length;

const matchesOnly = (
  event: AppEvent,
  only: OnlyFilter | undefined,
): boolean => {
  if (only === "active") return activeCount(event) > 0;
  if (only === "off") return activeCount(event) === 0;
  if (only === "client") return isClientEvent(event);
  return true;
};

export const eventsFor = (
  group: string | undefined,
  only: OnlyFilter | undefined,
): readonly AppEvent[] =>
  EVENTS.filter((e) => (!group || e.groupId === group) && matchesOnly(e, only));

export const recipientText = (r: Recipient): string => {
  if (r.kind === "σχετικός") return r.label;
  if (r.kind === "δικαίωμα") return `όσοι «${r.permission}»`;
  if (r.kind === "ονομαστικά")
    return `${r.personIds.length} συγκεκριμένα άτομα`;
  return "ο Επισκέπτης που συμπλήρωσε τη φόρμα";
};

const dayText = (days: number): string => {
  if (days === 0) return "την ημέρα του Γεγονότος";
  const n = Math.abs(days);
  return `${days < 0 ? "−" : "+"}${n} ${n === 1 ? "μέρα" : "μέρες"}`;
};

export const timingText = (t: Timing): string => {
  if (t.kind === "αμέσως") return "αμέσως";
  if (t.kind === "ημερομηνία") return `${dayText(t.days)}, ${t.at}`;
  return `μετά από ${t.after} ${t.unit} χωρίς ενέργεια`;
};

export const hasMissingEnglish = (a: Automation): boolean =>
  a.text.en.trim() === "" || (!!a.subject && a.subject.en.trim() === "");
