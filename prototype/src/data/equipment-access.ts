// Τι βλέπει και τι μπορεί ο κάθε ρόλος στο module «5 Εξοπλισμός», και οι Δεσμεύσεις ανά αντικείμενο.
// Πηγή: 01-roles-and-permissions.md (Βλέπει Εξοπλισμό, Διαχειρίζεται απόθεμα, Δεσμεύει εξοπλισμό), 08-role-guides.md (F1–F3), κεφ. 3.4.

import { findEquipment } from "@/data/equipment";
import { FILMINGS, OPEN_STATES, type Filming } from "@/data/filming";
import {
  canOpenFilming,
  isPast,
  overlappingFilmings,
  startsAt,
} from "@/data/filming-access";
import type { RoleId } from "@/data/roles";

export interface EquipmentCaps {
  canSee: boolean;
  canManageStock: boolean;
  canReserve: boolean;
  isReserveScoped: boolean;
  canManageTemplates: boolean;
}

export const equipmentCapsOf = (role: RoleId): EquipmentCaps => {
  const isAdminLike = role === "owner" || role === "admin";
  const isTeam = isAdminLike || role === "production";
  return {
    canSee: isTeam,
    canManageStock: isAdminLike,
    canReserve: isTeam,
    isReserveScoped: role === "production",
    canManageTemplates: isTeam,
  };
};

// Η Παραγωγή δεσμεύει μόνο σε Γυρίσματα που την αφορούν.
export const canReserveOn = (role: RoleId, filming: Filming): boolean => {
  const caps = equipmentCapsOf(role);
  if (!caps.canReserve) return false;
  return !caps.isReserveScoped || canOpenFilming(role, filming);
};

const byStart = (a: Filming, b: Filming) => startsAt(a) - startsAt(b);

export const isUpcoming = (filming: Filming): boolean =>
  OPEN_STATES.includes(filming.state) && !isPast(filming);

export const reservationsOf = (itemId: string): readonly Filming[] =>
  FILMINGS.filter((filming) => filming.equipment.includes(itemId));

export const upcomingReservationsOf = (itemId: string): readonly Filming[] =>
  reservationsOf(itemId).filter(isUpcoming).sort(byStart);

export const pastUsesOf = (itemId: string): readonly Filming[] =>
  reservationsOf(itemId)
    .filter((filming) => filming.state === "έγινε")
    .sort((a, b) => byStart(b, a));

// Σύγκρουση: το ίδιο αντικείμενο σε δύο ανοιχτά Γυρίσματα που επικαλύπτονται.
export const otherHoldersOf = (
  filming: Filming,
  itemId: string,
): readonly Filming[] =>
  overlappingFilmings(filming).filter((other) =>
    other.equipment.includes(itemId),
  );

export interface ItemConflict {
  a: Filming;
  b: Filming;
}

export const conflictsOf = (itemId: string): readonly ItemConflict[] => {
  const upcoming = upcomingReservationsOf(itemId);
  return upcoming.flatMap((a, index) =>
    upcoming
      .slice(index + 1)
      .filter((b) => otherHoldersOf(a, itemId).includes(b))
      .map((b) => ({ a, b })),
  );
};

// Αντικείμενο που δεν είναι διαθέσιμο αλλά έχει μελλοντική Δέσμευση.
export const unavailableHoldsOf = (itemId: string): readonly Filming[] =>
  findEquipment(itemId)?.status === "διαθέσιμο"
    ? []
    : upcomingReservationsOf(itemId);
