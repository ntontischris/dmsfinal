import type { BadgeTone } from "@/spaces/screens/shared";

import { comparePickerItems } from "../helpers";
import type { EquipmentItemRow, EquipmentStatus } from "../types";

// Καθαρά κομμάτια των F1–F3 (prototype `screens/f-model.ts`), πάνω στους πραγματικούς τύπους. Τα διαβάζει και ο browser.

export const countLabel = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

export const statusTone = (status: EquipmentStatus): BadgeTone | undefined =>
  status === "available" ? undefined : "attention";

export const conflictText = (blocks: boolean): string =>
  blocks
    ? "Οι Κανόνες γυρισμάτων μπλοκάρουν τη σύγκρουση: νέα διπλή Δέσμευση δεν γίνεται."
    : "Οι Κανόνες γυρισμάτων μόνο προειδοποιούν: η διπλή Δέσμευση επιτρέπεται, με σήμα.";

// Τι μπορεί να το αντικαταστήσει: διαθέσιμα αντικείμενα της ίδιας Κατηγορίας.
export const replacementsFor = (
  item: Pick<EquipmentItemRow, "id" | "categoryId">,
  items: readonly EquipmentItemRow[],
): readonly EquipmentItemRow[] =>
  items.filter(
    (other) =>
      other.id !== item.id &&
      other.categoryId === item.categoryId &&
      other.status === "available",
  );

const sameName = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

// Ο έλεγχος του ονόματος πριν φύγει η φόρμα· η βάση ελέγχει ξανά (lower(name) μοναδικό).
export const nameErrorOf = (
  name: string,
  items: readonly Pick<EquipmentItemRow, "name">[],
): string | null => {
  if (!name.trim()) return "Γράψε όνομα.";
  if (items.some((item) => sameName(item.name, name)))
    return "Υπάρχει ήδη αντικείμενο με αυτό το όνομα. Αν είναι δεύτερο ίδιο, βάλε αριθμό (π.χ. «Gimbal 2»).";
  return null;
};

// Χρονικό παράθυρο Γυρίσματος (ISO στιγμές). Δύο επικαλύπτονται αν το ένα αρχίζει πριν τελειώσει το άλλο.
export interface TimeWindow {
  startsAt: string;
  endsAt: string;
}

export const overlaps = (a: TimeWindow, b: TimeWindow): boolean =>
  Date.parse(a.startsAt) < Date.parse(b.endsAt) &&
  Date.parse(b.startsAt) < Date.parse(a.endsAt);

export interface PickerGroup {
  categoryId: string;
  categoryName: string;
  items: EquipmentItemRow[];
}

// Τα αντικείμενα της φόρμας Προτύπου ανά Κατηγορία. Τα αποσυρμένα δεν προσφέρονται, εκτός αν είναι ήδη μέσα.
export const pickerGroupsOf = (
  items: readonly EquipmentItemRow[],
  selectedIds: readonly string[],
): PickerGroup[] => {
  const groups = new Map<string, PickerGroup>();
  const offered = items
    .filter((item) => item.status !== "retired" || selectedIds.includes(item.id))
    .sort(comparePickerItems);
  for (const item of offered) {
    const group = groups.get(item.categoryId);
    groups.set(item.categoryId, {
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      items: [...(group?.items ?? []), item],
    });
  }
  return [...groups.values()];
};

// «Ελεύθερο στις» (F1): Διαθέσιμο και χωρίς ανοιχτή Δέσμευση εκείνη τη μέρα (Ώρα Ελλάδας, «ΕΕΕΕ-ΜΜ-ΗΗ»).
export const isFreeOn = (
  item: EquipmentItemRow,
  busyDays: Readonly<Record<string, readonly string[]>>,
  day: string,
): boolean =>
  item.status === "available" && !(busyDays[item.id] ?? []).includes(day);
