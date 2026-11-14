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

export interface DayWindow {
  opens: string;
  closes: string;
}

// Χωρίς ώρα κλεισίματος στο Ωράριο: ως τις 18:00.
const FALLBACK_CLOSES = "18:00";

// Χωρίς Ωράριο (δεν διαβάστηκε ή δεν αποθηκεύτηκε): Δευτέρα–Παρασκευή 09:00–18:00.
export const NO_HOURS: Hours = { isSet: false, week: [], exceptions: [], holidays: [] };

const windowOf = (
  opens: string | null | undefined,
  closes: string | null | undefined,
): DayWindow => ({
  opens: opens ?? FALLBACK_OPENS,
  closes: closes ?? FALLBACK_CLOSES,
});

// Πότε ανοίγει και κλείνει η μέρα, ή null αν είναι κλειστή.
export const windowOn = (hours: Hours, day: string): DayWindow | null => {
  if (!hours.isSet) return isoDow(day) <= 5 ? windowOf(null, null) : null;
  const exception = hours.exceptions.find((item) => item.day === day);
  const weekday = hours.week.find((item) => item.dow === isoDow(day));
  if (exception)
    return exception.isClosed
      ? null
      : windowOf(
          exception.opens ?? weekday?.opens,
          exception.closes ?? weekday?.closes,
        );
  const holiday = hours.holidays.find((item) => item.day === day);
  if (holiday && !holiday.isOpen) return null;
  return weekday?.isOpen ? windowOf(weekday.opens, weekday.closes) : null;
};

export const firstWorkingSlot = (
  hours: Hours,
  now: StartSlot,
): StartSlot | null => {
  for (let offset = 0; offset <= LOOKAHEAD_DAYS; offset += 1) {
    const date = addDays(now.date, offset);
    const opens = windowOn(hours, date)?.opens;
    if (opens !== undefined && (offset > 0 || now.time < opens))
      return { date, time: opens };
  }
  return null;
};

// Η προεπιλογή της φόρμας: ακόμα κι αν το Ωράριο δεν διαβάστηκε, ποτέ Σαββατοκύριακο ή σήμερα μετά το άνοιγμα.
export const startSlotOf = (
  hours: Hours | null,
  now: StartSlot,
): StartSlot | null => firstWorkingSlot(hours ?? NO_HOURS, now);

export const minutesOf = (time: string): number => {
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  return hh * 60 + mm;
};

const timeOf = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export interface BusySpan {
  // Λεπτά της μέρας (10:00 = 600).
  from: number;
  to: number;
}

export interface FreeTimeInput {
  window: DayWindow;
  hours: number;
  stepMinutes: number;
  // Πότε είναι πιασμένο κάποιο μέλος του Συνεργείου εκείνη τη μέρα.
  busy: readonly BusySpan[];
}

// Η πρώτη ώρα μέσα στο Ωράριο όπου το Γύρισμα χωράει χωρίς να πέφτει πάνω σε πιασμένο μέλος· αλλιώς null.
export const firstFreeTime = ({
  window,
  hours,
  stepMinutes,
  busy,
}: FreeTimeInput): string | null => {
  const length = Math.round(hours * 60);
  const step = Math.max(stepMinutes, 5);
  const last = minutesOf(window.closes) - length;
  for (let from = minutesOf(window.opens); from <= last; from += step) {
    const to = from + length;
    if (!busy.some((span) => span.from < to && from < span.to))
      return timeOf(from);
  }
  return null;
};
