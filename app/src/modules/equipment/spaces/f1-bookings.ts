import { athensDate } from "@/modules/filming";
import { hrefOf } from "@/spaces/data/screens";

import type { EquipmentBooking } from "../types";
import { endIso, filmingLabel } from "./f-adapter";

// Οι ανοιχτές Δεσμεύσεις για το μητρώο (F1): το επόμενο Γύρισμα κάθε αντικειμένου και οι μέρες (Ώρα Ελλάδας)
// που είναι πιασμένο. Τρέχει στον server· ο browser παίρνει έτοιμες ετικέτες και μέρες «ΕΕΕΕ-ΜΜ-ΗΗ».

export interface NextBookingView {
  label: string;
  href: string | null;
  isPending: boolean;
}

export interface BookingIndex {
  next: Record<string, NextBookingView>;
  busyDays: Record<string, string[]>;
}

// Οι μέρες που αγγίζει ένα Γύρισμα: η μέρα έναρξης και, αν περνά τα μεσάνυχτα, η μέρα λήξης.
export const daysOf = (startsAt: string, hours: number): string[] => {
  const lastInstant = new Date(Date.parse(endIso(startsAt, hours)) - 1);
  return [...new Set([athensDate(startsAt), athensDate(lastInstant)])];
};

const viewOf = (booking: EquipmentBooking): NextBookingView => ({
  label: filmingLabel(booking.startsAt, booking.hours, null),
  href: booking.filmingId ? hrefOf("E3", { id: booking.filmingId }) : null,
  isPending: booking.state === "pending",
});

// Οι Δεσμεύσεις έρχονται ταξινομημένες κατά έναρξη· το πρώτο ανά αντικείμενο είναι το επόμενο.
export const bookingIndexOf = (
  bookings: readonly EquipmentBooking[],
): BookingIndex =>
  bookings.reduce<BookingIndex>(
    (index, booking) => ({
      next: index.next[booking.itemId]
        ? index.next
        : { ...index.next, [booking.itemId]: viewOf(booking) },
      busyDays: {
        ...index.busyDays,
        [booking.itemId]: [
          ...new Set([
            ...(index.busyDays[booking.itemId] ?? []),
            ...daysOf(booking.startsAt, booking.hours),
          ]),
        ],
      },
    }),
    { next: {}, busyDays: {} },
  );
