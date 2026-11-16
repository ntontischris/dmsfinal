import { countStat } from "@/spaces/kit/count-stat";
import type { StatProps } from "@/spaces/kit/panel";

import type { EquipmentBooking, EquipmentItemRow } from "../types";
import { endIso } from "./f-adapter";
import { overlaps as windowsOverlap } from "./f-model";
import { daysOf } from "./f1-bookings";

// Τα τρία χοντρά της καρτέλας Εξοπλισμός: ό,τι συγκρούεται, ό,τι λείπει για επισκευή, ό,τι βγαίνει την εβδομάδα.
// Σύγκρουση = δύο ανοιχτές Δεσμεύσεις του ίδιου αντικειμένου που επικαλύπτονται, ή Δέσμευση σε αντικείμενο υπό επισκευή.

interface StripInput {
  items: readonly EquipmentItemRow[];
  bookings: readonly EquipmentBooking[]; // οι ανοιχτές, ταξινομημένες κατά έναρξη
  today: string; // ΕΕΕΕ-ΜΜ-ΗΗ, Ώρα Ελλάδας
}

const weekEndOf = (today: string): string =>
  new Date(Date.parse(`${today}T12:00:00Z`) + 6 * 86_400_000)
    .toISOString()
    .slice(0, 10);

const windowOf = (booking: EquipmentBooking) => ({
  startsAt: booking.startsAt,
  endsAt: endIso(booking.startsAt, booking.hours),
});

const isDoubleBooked = (mine: readonly EquipmentBooking[]): boolean =>
  mine.some((a, i) =>
    mine.slice(i + 1).some((b) => windowsOverlap(windowOf(a), windowOf(b))),
  );

const conflictCount = ({ items, bookings }: StripInput): number =>
  items.filter((item) => {
    const mine = bookings.filter((booking) => booking.itemId === item.id);
    return (
      (item.status === "in_repair" && mine.length > 0) || isDoubleBooked(mine)
    );
  }).length;

const isThisWeek = (booking: EquipmentBooking, today: string): boolean =>
  daysOf(booking.startsAt, booking.hours).some(
    (day) => day >= today && day <= weekEndOf(today),
  );

export const equipmentStripOf = (input: StripInput): readonly StatProps[] => [
  countStat(
    { label: "Συγκρούσεις", hint: "διπλή Δέσμευση ή σε επισκευή" },
    conflictCount(input),
  ),
  countStat(
    { label: "Σε επισκευή", hint: "εκτός χρήσης τώρα" },
    input.items.filter((item) => item.status === "in_repair").length,
  ),
  countStat(
    {
      label: "Βγαίνουν την εβδομάδα",
      hint: "δεσμευμένα τις επόμενες 7 ημέρες",
    },
    new Set(
      input.bookings
        .filter((b) => isThisWeek(b, input.today))
        .map((b) => b.itemId),
    ).size,
    false,
  ),
];
