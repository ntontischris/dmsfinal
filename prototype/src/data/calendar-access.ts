// Τι βλέπει και τι μπορεί ο κάθε ρόλος στο module «6 Ημερολόγιο», και η ενιαία όψη (A5).
// Πηγή: ADR 0005, κεφ. 3.4 «Ημερολόγιο και Google», 01-roles-and-permissions.md (Βλέπει διαθεσιμότητα ομάδας,
// Αμφίδρομο ημερολόγιο Google, Βασικά: Σύνδεσμος και δικός Κλεισμένος χρόνος), 08-role-guides.md (A5–A7).

import { DEADLINES, MEMBER_OF_ROLE, memberName } from "@/data/calendar";
import {
  BLOCKED_TIMES,
  BOOKING_HOURS,
  FILMINGS,
  FILMING_RULES,
  NOW,
  OPEN_STATES,
  type BlockedTime,
  type Filming,
} from "@/data/filming";
import {
  blockedDays,
  capacityOf,
  clientNameOf,
  endTime,
  filmingCapsOf,
  takenAt,
  visibleFilmings,
} from "@/data/filming-access";
import type { RoleId } from "@/data/roles";
import { findClient } from "@/data/sales";

export interface CalendarCaps {
  canSee: boolean;
  isClient: boolean;
  seesAll: boolean;
  seesTeamBusy: boolean;
  hasTwoWay: boolean;
  canBlock: boolean;
  canBlockOthers: boolean;
  canConvert: boolean;
  canResolveDeletions: boolean;
  me: string | null;
}

export const calendarCapsOf = (role: RoleId): CalendarCaps => {
  const isAdminLike = role === "owner" || role === "admin";
  const isTeam =
    isAdminLike || ["production", "sales", "accountant"].includes(role);
  return {
    canSee: isTeam || role === "client",
    isClient: role === "client",
    seesAll: isAdminLike,
    seesTeamBusy: role === "production" || role === "sales",
    hasTwoWay: isAdminLike,
    canBlock: isTeam,
    canBlockOthers: isAdminLike,
    canConvert: filmingCapsOf(role).canCreate,
    canResolveDeletions: isAdminLike,
    me: MEMBER_OF_ROLE[role] ?? null,
  };
};

// Μετατροπή: Ιδ και Δι οποιουδήποτε· οι Πωλήσεις μόνο του δικού τους. Η Παραγωγή δεν «Κλείνει Γύρισμα».
export const canConvertBlocked = (
  role: RoleId,
  blocked: BlockedTime,
): boolean => {
  const caps = calendarCapsOf(role);
  return (
    caps.canConvert && (caps.canBlockOthers || blocked.personId === caps.me)
  );
};

export const canEditBlocked = (role: RoleId, blocked: BlockedTime): boolean => {
  const caps = calendarCapsOf(role);
  return caps.canBlockOthers || (caps.canBlock && blocked.personId === caps.me);
};

export const blockedTimesFor = (role: RoleId): readonly BlockedTime[] => {
  const caps = calendarCapsOf(role);
  if (caps.canBlockOthers) return BLOCKED_TIMES;
  return BLOCKED_TIMES.filter((blocked) => blocked.personId === caps.me);
};

export type CalendarKind =
  "filming" | "blocked" | "busy" | "deadline" | "closed" | "day";

export interface CalendarItem {
  id: string;
  kind: CalendarKind;
  date: string;
  from?: string;
  to?: string;
  title: string;
  detail?: string;
  personIds: readonly string[];
  // Για τα Γυρίσματα: η κατάσταση· για τις μέρες του πελάτη: ελεύθερη/γεμάτη/κλειστή.
  status?: string;
  link?: { code: string; params: Readonly<Record<string, string>> };
}

export interface CalendarLayers {
  filmings: boolean;
  blocked: boolean;
  deadlines: boolean;
  team: boolean;
}

export const ALL_LAYERS: CalendarLayers = {
  filmings: true,
  blocked: true,
  deadlines: true,
  team: true,
};

export interface CalendarRange {
  from: string;
  to: string;
}

const inRange = (date: string, range: CalendarRange): boolean =>
  date >= range.from && date <= range.to;

// Απορριμμένα και ακυρωμένα σβήνουν από το Ημερολόγιο (όπως στο Google)· μένουν στη λίστα E1.
const SHOWN_STATES: readonly string[] = [...OPEN_STATES, "έγινε", "δεν έγινε"];

const filmingItem = (filming: Filming, isClient: boolean): CalendarItem => ({
  id: filming.id,
  kind: "filming",
  date: filming.date,
  from: filming.start,
  to: endTime(filming),
  title: clientNameOf(filming),
  detail: filming.location,
  personIds: isClient ? [] : filming.crew.map((slot) => slot.personId),
  status: filming.state,
  link: { code: "E3", params: { id: filming.id } },
});

const blockedItems = (
  blocked: BlockedTime,
  showLabel: boolean,
): CalendarItem[] =>
  blockedDays(blocked).map((date) => ({
    id: `${blocked.id}-${date}`,
    kind: showLabel ? "blocked" : "busy",
    date,
    from:
      blocked.from === "00:00" && blocked.to === "24:00"
        ? undefined
        : blocked.from,
    to:
      blocked.from === "00:00" && blocked.to === "24:00"
        ? undefined
        : blocked.to,
    title: showLabel ? blocked.label : "Απασχολημένος",
    detail: memberName(blocked.personId),
    personIds: [blocked.personId],
    link: showLabel ? { code: "A6", params: { id: blocked.id } } : undefined,
  }));

// Η διαθεσιμότητα της ομάδας για Παραγωγή και Πωλήσεις: ποιος είναι απασχολημένος, χωρίς λεπτομέρειες.
const busyFromFilming = (filming: Filming, me: string | null): CalendarItem[] =>
  filming.crew
    .filter((slot) => slot.personId !== me)
    .map((slot) => ({
      id: `${filming.id}-${slot.personId}`,
      kind: "busy",
      date: filming.date,
      from: filming.start,
      to: endTime(filming),
      title: "Απασχολημένος",
      detail: memberName(slot.personId),
      personIds: [slot.personId],
    }));

const deadlineItem = (deadline: (typeof DEADLINES)[number]): CalendarItem => ({
  id: deadline.id,
  kind: "deadline",
  date: deadline.date,
  title: `Προθεσμία: ${deadline.title}`,
  detail: `${findClient(deadline.clientId)?.name ?? "—"} · ${memberName(deadline.assigneeId)}`,
  personIds: [deadline.assigneeId],
  link: { code: "H2", params: { id: deadline.id } },
});

const closedItems = (range: CalendarRange): CalendarItem[] =>
  Object.entries(BOOKING_HOURS.closedDays)
    .filter(([date]) => inRange(date, range))
    .map(([date, label]) => ({
      id: `closed-${date}`,
      kind: "closed",
      date,
      title: label,
      personIds: [],
    }));

const teamItems = (
  role: RoleId,
  range: CalendarRange,
  layers: CalendarLayers,
): CalendarItem[] => {
  const caps = calendarCapsOf(role);
  const mine = visibleFilmings(role).filter((f) =>
    SHOWN_STATES.includes(f.state),
  );
  const mineIds = mine.map((f) => f.id);
  const filmings = layers.filmings
    ? mine.map((f) => filmingItem(f, false))
    : [];
  const ownBlocked = BLOCKED_TIMES.filter(
    (b) => caps.seesAll || b.personId === caps.me,
  );
  const blocked = layers.blocked
    ? ownBlocked.flatMap((b) => blockedItems(b, true))
    : [];
  const teamBusy =
    caps.seesTeamBusy && layers.team
      ? [
          ...BLOCKED_TIMES.filter((b) => b.personId !== caps.me).flatMap((b) =>
            blockedItems(b, false),
          ),
          ...FILMINGS.filter(
            (f) => OPEN_STATES.includes(f.state) && !mineIds.includes(f.id),
          ).flatMap((f) => busyFromFilming(f, caps.me)),
        ]
      : [];
  const deadlines = layers.deadlines
    ? DEADLINES.filter((d) => caps.seesAll || d.assigneeId === caps.me).map(
        deadlineItem,
      )
    : [];
  return [
    ...filmings,
    ...blocked,
    ...teamBusy,
    ...deadlines,
    ...closedItems(range),
  ];
};

// Διαθεσιμότητα εταιρείας για τον πελάτη: μόνο Ωράριο και Χωρητικότητα, ποτέ άτομα.
export const dayAvailability = (
  date: string,
): "ελεύθερη" | "γεμάτη" | "κλειστή" => {
  const hours = BOOKING_HOURS.week[new Date(`${date}T12:00Z`).getUTCDay()];
  if (!hours || BOOKING_HOURS.closedDays[date]) return "κλειστή";
  const shortest = Math.min(...BOOKING_HOURS.durations);
  for (let hour = hours.from; hour + shortest <= hours.to; hour += 1) {
    const start = `${String(hour).padStart(2, "0")}:00`;
    if (takenAt(date, start, shortest) < capacityOf(date)) return "ελεύθερη";
  }
  return "γεμάτη";
};

const TODAY = NOW.slice(0, 10);

const horizonEnd = (): string =>
  new Date(
    Date.parse(`${TODAY}T12:00Z`) + FILMING_RULES.horizonDays * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);

const clientDays = (range: CalendarRange): CalendarItem[] => {
  const items: CalendarItem[] = [];
  for (
    let day = new Date(`${range.from}T12:00Z`);
    day.toISOString().slice(0, 10) <= range.to;
    day = new Date(day.getTime() + 86_400_000)
  ) {
    const date = day.toISOString().slice(0, 10);
    if (date < TODAY || date > horizonEnd()) continue;
    const status = dayAvailability(date);
    items.push({
      id: `day-${date}`,
      kind: "day",
      date,
      title:
        status === "ελεύθερη"
          ? "Ελεύθερες ώρες"
          : status === "γεμάτη"
            ? "Γεμάτη"
            : "Κλειστά",
      status,
      personIds: [],
      link:
        status === "ελεύθερη" ? { code: "E5", params: { date } } : undefined,
    });
  }
  return items;
};

const clientItems = (role: RoleId, range: CalendarRange): CalendarItem[] => [
  ...visibleFilmings(role)
    .filter((f) => SHOWN_STATES.includes(f.state))
    .map((f) => filmingItem(f, true)),
  ...clientDays(range),
];

const byTime = (a: CalendarItem, b: CalendarItem): number =>
  a.date.localeCompare(b.date) || (a.from ?? "").localeCompare(b.from ?? "");

export const calendarItems = (
  role: RoleId,
  range: CalendarRange,
  layers: CalendarLayers,
  personId?: string,
): readonly CalendarItem[] => {
  const caps = calendarCapsOf(role);
  if (!caps.canSee) return [];
  const all = caps.isClient
    ? clientItems(role, range)
    : teamItems(role, range, layers);
  return all
    .filter((item) => inRange(item.date, range))
    .filter(
      (item) =>
        !personId ||
        item.kind === "closed" ||
        item.personIds.includes(personId),
    )
    .sort(byTime);
};

export { TODAY as CALENDAR_TODAY, horizonEnd };
