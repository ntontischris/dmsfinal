// Τι βλέπει και τι μπορεί ο κάθε ρόλος στο module «4 Γυρίσματα», και οι υπολογισμοί πάνω στα Γυρίσματα.
// Πηγή: 01-roles-and-permissions.md (Βλέπει Γυρίσματα, Κλείνει Γύρισμα, Εγκρίνει κράτηση, Διαχειρίζεται Συνεργείο και Δελτίο),
// 08-role-guides.md (E1–E7) και κεφ. 3.4.

import { findAgreement, type AgreementPeriod } from "@/data/agreements";
import {
  BLOCKED_TIMES,
  BOOKING_HOURS,
  FILMINGS,
  NOW,
  OPEN_STATES,
  PERSON_OF_ROLE,
  findProduction,
  type BlockedTime,
  type Filming,
} from "@/data/filming";
import type { RoleId } from "@/data/roles";
import { KYPSELI_ID, SALES_USER_ID, findClient } from "@/data/sales";

export interface FilmingCaps {
  canSee: boolean;
  isScoped: boolean;
  isClient: boolean;
  canCreate: boolean;
  canApprove: boolean;
  canManageCrew: boolean;
  canMarkOutcome: boolean;
  canCancel: boolean;
  canSeeHours: boolean;
  canSeeInternal: boolean;
}

export const filmingCapsOf = (role: RoleId): FilmingCaps => {
  const isAdminLike = role === "owner" || role === "admin";
  const isTeamViewer = isAdminLike || role === "production" || role === "sales";
  return {
    canSee: isTeamViewer || role === "client",
    isScoped: role === "production" || role === "sales",
    isClient: role === "client",
    canCreate: isAdminLike || role === "sales",
    canApprove: isAdminLike,
    canManageCrew: isAdminLike || role === "production",
    canMarkOutcome: isAdminLike || role === "production",
    canCancel: isAdminLike || role === "sales",
    canSeeHours: role === "owner",
    canSeeInternal: isTeamViewer,
  };
};

export const productionOf = (filming: Filming) =>
  findProduction(filming.productionId);

export const clientIdOf = (filming: Filming): string =>
  productionOf(filming)?.clientId ?? "";

export const clientNameOf = (filming: Filming): string =>
  findClient(clientIdOf(filming))?.name ?? "—";

// «Με αφορά»: Παραγωγή = Μέλος της Παραγωγής ή του Συνεργείου· Πωλήσεις = Υπεύθυνος του Πελάτη.
const isRelevant = (role: RoleId, filming: Filming): boolean => {
  const production = productionOf(filming);
  if (role === "sales")
    return findClient(clientIdOf(filming))?.ownerId === SALES_USER_ID;
  const me = PERSON_OF_ROLE[role] ?? "";
  return (
    !!production?.memberIds.includes(me) ||
    filming.crew.some((slot) => slot.personId === me)
  );
};

export const visibleFilmings = (role: RoleId): readonly Filming[] => {
  const caps = filmingCapsOf(role);
  if (!caps.canSee) return [];
  if (caps.isClient)
    return FILMINGS.filter((f) => clientIdOf(f) === KYPSELI_ID);
  return caps.isScoped ? FILMINGS.filter((f) => isRelevant(role, f)) : FILMINGS;
};

export const canOpenFilming = (role: RoleId, filming: Filming): boolean =>
  visibleFilmings(role).some((visible) => visible.id === filming.id);

export const pendingApprovalFilmings = (): readonly Filming[] =>
  FILMINGS.filter((filming) => filming.state === "αναμένει έγκριση");

// Ώρες και χρόνοι.
export const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const endTime = (filming: Pick<Filming, "start" | "hours">): string => {
  const total = toMinutes(filming.start) + filming.hours * 60;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export const startsAt = (filming: Pick<Filming, "date" | "start">): number =>
  Date.parse(`${filming.date}T${filming.start}`);

export const hoursUntil = (filming: Pick<Filming, "date" | "start">): number =>
  (startsAt(filming) - Date.parse(NOW)) / 3_600_000;

export const isPast = (
  filming: Pick<Filming, "date" | "start" | "hours">,
): boolean => startsAt(filming) + filming.hours * 3_600_000 <= Date.parse(NOW);

// Γύρισμα που τελείωσε και κανείς δεν σημείωσε «έγινε» ή «δεν έγινε».
export const needsOutcome = (filming: Filming): boolean =>
  filming.state === "προγραμματισμένο" && isPast(filming);

const overlaps = (
  a: { date: string; start: string; hours: number },
  b: { date: string; start: string; hours: number },
): boolean =>
  a.date === b.date &&
  toMinutes(a.start) < toMinutes(b.start) + b.hours * 60 &&
  toMinutes(b.start) < toMinutes(a.start) + a.hours * 60;

export const overlappingFilmings = (filming: Filming): readonly Filming[] =>
  FILMINGS.filter(
    (other) =>
      other.id !== filming.id &&
      OPEN_STATES.includes(other.state) &&
      overlaps(other, filming),
  );

export const equipmentConflicts = (
  filming: Filming,
): readonly { item: string; with: Filming }[] =>
  overlappingFilmings(filming).flatMap((other) =>
    filming.equipment
      .filter((item) => other.equipment.includes(item))
      .map((item) => ({ item, with: other })),
  );

export const personBusyWith = (
  filming: Filming,
  personId: string,
): readonly Filming[] =>
  overlappingFilmings(filming).filter((other) =>
    other.crew.some((slot) => slot.personId === personId),
  );

// Οι μέρες που πιάνει ένας Κλεισμένος χρόνος (μία, ή από date ως untilDate για ολοήμερο).
export const blockedDays = (blocked: BlockedTime): readonly string[] => {
  const days: string[] = [];
  const last = blocked.untilDate ?? blocked.date;
  for (
    let day = new Date(`${blocked.date}T12:00Z`);
    day.toISOString().slice(0, 10) <= last;
    day = new Date(day.getTime() + 86_400_000)
  )
    days.push(day.toISOString().slice(0, 10));
  return days;
};

export const blockedOverlaps = (
  blocked: BlockedTime,
  slot: { date: string; start: string; hours: number },
): boolean =>
  blockedDays(blocked).some((date) =>
    overlaps(
      {
        date,
        start: blocked.from,
        hours: (toMinutes(blocked.to) - toMinutes(blocked.from)) / 60,
      },
      slot,
    ),
  );

export const blockedTimeOf = (
  filming: Filming,
  personId: string,
): BlockedTime | undefined =>
  BLOCKED_TIMES.find(
    (blocked) =>
      blocked.personId === personId && blockedOverlaps(blocked, filming),
  );

// Παροχές «Γύρισμα» της Περιόδου: δοσμένες, δεσμευμένες, καταναλωμένες, διαθέσιμες.
export interface ShootBalance {
  periodLabel: string;
  total: number;
  used: number;
  reserved: number;
  left: number;
}

const periodOfFilming = (filming: Filming): AgreementPeriod | undefined => {
  const production = productionOf(filming);
  return findAgreement(production?.agreementId)?.periods.find(
    (period) => period.label === production?.periodLabel,
  );
};

export const shootBalance = (filming: Filming): ShootBalance | null => {
  const production = productionOf(filming);
  const period = periodOfFilming(filming);
  const shoot = period?.provisions.find(
    (provision) => provision.kindId === "shoot",
  );
  if (!production || !period || !shoot) return null;
  const reserved = FILMINGS.filter(
    (other) =>
      other.productionId === production.id && OPEN_STATES.includes(other.state),
  ).length;
  const total = shoot.given + shoot.carried;
  return {
    periodLabel: period.label,
    total,
    used: shoot.used,
    reserved,
    left: total - shoot.used - reserved,
  };
};

// Χωρητικότητα: πόσα Γυρίσματα (μαζί με όσα αναμένουν έγκριση) πιάνουν μια ώρα μιας μέρας.
export const capacityOf = (date: string): number =>
  BOOKING_HOURS.capacityByDay[date] ?? BOOKING_HOURS.capacity;

export const takenAt = (date: string, start: string, hours: number): number =>
  FILMINGS.filter(
    (filming) =>
      OPEN_STATES.includes(filming.state) &&
      overlaps(filming, { date, start, hours }),
  ).length;
