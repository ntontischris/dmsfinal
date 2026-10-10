import type { BookingAgreement, NamedProduction, NamedRef } from "./types";

// Τύποι των Κρατήσεων (C2α, #130): Ωράριο, Χωρητικότητα, Αργίες, κράτηση πελάτη (E5) και μετάθεση.
// Τα JSON της βάσης έρχονται camelCase· οι ώρες είναι «ΩΩ:ΛΛ» και οι μέρες «ΕΕΕΕ-ΜΜ-ΗΗ» (Ώρα Ελλάδας).

export interface PendingReschedule {
  startsAt: string;
  hours: number;
  requestedAt: string;
}

export interface RescheduleRequestEntry {
  id: string;
  startsAt: string;
  hours: number;
  newStartsAt: string;
  newHours: number;
  requestedAt: string;
  client: NamedRef | null;
  production: NamedProduction;
  slotProblem: string | null;
}

export interface BookingWeekDay {
  dow: number;
  isOpen: boolean;
  opens: string | null;
  closes: string | null;
}

export interface BookingException {
  day: string;
  isClosed: boolean;
  opens: string | null;
  closes: string | null;
  capacity: number | null;
  note: string | null;
}

export interface BookingHoliday {
  day: string;
  name: string;
  movable: boolean;
  isOpen: boolean;
}

export interface BookingHoursView {
  isSet: boolean;
  week: BookingWeekDay[];
  capacity: number;
  durations: number[];
  stepMinutes: number;
  exceptions: BookingException[];
  holidays: BookingHoliday[];
}

export const BOOKING_DAY_STATUSES = [
  "free",
  "full",
  "closed",
  "holiday",
  "not_set",
  "too_soon",
  "outside_agreement",
  "period_not_open",
  "no_provision",
] as const;
export type BookingDayStatus = (typeof BOOKING_DAY_STATUSES)[number];

export interface BookingDay {
  day: string;
  status: BookingDayStatus;
  label: string;
}

export interface BookingOptions {
  isSet: boolean;
  durations: number[];
  stepMinutes: number;
  horizonDays: number;
  agreements: BookingAgreement[];
}

export interface SlotCheck {
  problem: string | null;
  load: number;
  capacity: number;
}
