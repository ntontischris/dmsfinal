// Η προεπιλεγμένη μέρα και ώρα του E4 «Νέο Γύρισμα»: η πρώτη εργάσιμη μέρα μέσα στο Ωράριο (Ρυθμίσεις › Γυρίσματα).
// Ποτέ σήμερα αν το Ωράριο της μέρας έχει ήδη ανοίξει· κλειστές μέρες, εξαιρέσεις και αργίες παραλείπονται.

import type { BookingHoursView } from "../booking-types";

export interface StartSlot {
  date: string;
  time: string;
}

type Hours = Pick<
  BookingHoursView,
  "isSet" | "week" | "exceptions" | "holidays"
>;

// Χωρίς αποθηκευμένο Ωράριο: Δευτέρα–Παρασκευή από τις 09:00.
const FALLBACK_OPENS = "09:00";
const LOOKAHEAD_DAYS = 60;

const addDays = (iso: string, days: number): string =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

// 1 = Δευτέρα … 7 = Κυριακή (όπως το Ωράριο της βάσης).
const isoDow = (iso: string): number =>
  ((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;

// Πότε ανοίγει η μέρα, ή null αν είναι κλειστή.
const opensOn = (hours: Hours, day: string): string | null => {
  if (!hours.isSet) return isoDow(day) <= 5 ? FALLBACK_OPENS : null;
  const exception = hours.exceptions.find((item) => item.day === day);
  const weekday = hours.week.find((item) => item.dow === isoDow(day));
  if (exception)
    return exception.isClosed
      ? null
      : (exception.opens ?? weekday?.opens ?? FALLBACK_OPENS);
  const holiday = hours.holidays.find((item) => item.day === day);
  if (holiday && !holiday.isOpen) return null;
  return weekday?.isOpen ? (weekday.opens ?? FALLBACK_OPENS) : null;
};

export const firstWorkingSlot = (
  hours: Hours,
  now: StartSlot,
): StartSlot | null => {
  for (let offset = 0; offset <= LOOKAHEAD_DAYS; offset += 1) {
    const date = addDays(now.date, offset);
    const opens = opensOn(hours, date);
    if (opens !== null && (offset > 0 || now.time < opens))
      return { date, time: opens };
  }
  return null;
};
