// Καθαρά κομμάτια της κράτησης του πελάτη E5 (prototype `screens/e5-days.tsx`), πάνω στις μέρες της βάσης (booking_days).
// Οι λέξεις είναι του prototype: απλή γλώσσα, χωρίς «Παροχή/Περίοδο» (απόφαση 17).

import type { BookingDay, BookingDayStatus } from "../booking-types";

export type DayStatus =
  { kind: "ok" } | { kind: "blocked"; reason: string; why: string };

export interface DayView {
  date: string;
  status: DayStatus;
}

export interface DayGroup {
  month: string;
  days: readonly DayView[];
}

export const WEEKDAYS = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"];
export const MONTHS = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

const weekdayOf = (iso: string): number =>
  new Date(`${iso}T00:00:00Z`).getUTCDay();

// «τον Οκτώβριο»: ο μήνας της μέρας σε αιτιατική.
const monthOf = (date: string): string =>
  MONTHS[Number(date.slice(5, 7)) - 1].slice(0, -1);

export const dayLabel = (date: string): string =>
  `${WEEKDAYS[weekdayOf(date)]} ${Number(date.slice(8))}/${Number(date.slice(5, 7))}`;

const blocked = (reason: string, why: string): DayStatus => ({
  kind: "blocked",
  reason,
  why,
});

// Η κατάσταση της βάσης με τις λέξεις του prototype: reason πάνω στη μέρα, why στο υπόμνημα.
export const dayStatusOf = (
  status: BookingDayStatus,
  date: string,
  noticeHours: number,
): DayStatus => {
  switch (status) {
    case "free":
      return { kind: "ok" };
    case "full":
      return blocked("Γεμάτο", "Η ομάδα είναι κλεισμένη όλη αυτή τη μέρα.");
    case "closed":
      return blocked("Κλειστά", "Δεν κάνουμε γυρίσματα αυτή τη μέρα.");
    case "holiday":
      return blocked("Αργία", "Επίσημη αργία: δεν κάνουμε γυρίσματα.");
    case "not_set":
      return blocked("Κλειστά", "Οι κρατήσεις δεν έχουν ανοίξει ακόμα.");
    case "too_soon":
      return blocked(
        "Πολύ κοντά",
        `Θέλουμε ${noticeHours} ώρες ειδοποίηση για να οργανωθούμε.`,
      );
    case "outside_agreement":
      return blocked(
        "Εκτός πακέτου",
        "Το πακέτο σου δεν καλύπτει αυτή τη μέρα.",
      );
    case "period_not_open":
      return blocked(
        "Ανοίγει αργότερα",
        "Ο επόμενος μήνας του πακέτου σου δεν έχει ανοίξει ακόμα για κρατήσεις.",
      );
    case "no_provision":
      return blocked(
        "Τελείωσαν",
        `Έκλεισες ήδη όλα τα γυρίσματα που έχει το πακέτο σου για τον ${monthOf(date)}.`,
      );
  }
};

export const dayViewsOf = (
  days: readonly BookingDay[],
  noticeHours: number,
): DayView[] =>
  days.map((day) => ({
    date: day.day,
    status: dayStatusOf(day.status, day.day, noticeHours),
  }));

export const groupDays = (days: readonly DayView[]): DayGroup[] => {
  const months = [...new Set(days.map((day) => day.date.slice(0, 7)))];
  return months.map((key) => ({
    month: `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`,
    days: days.filter((day) => day.date.startsWith(key)),
  }));
};

// Τι σημαίνει κάθε γκρι λέξη: μόνο όσες εμφανίζονται (η ίδια λέξη μπορεί να έχει άλλη εξήγηση ανά μήνα).
export const legendOf = (days: readonly DayView[]): Map<string, string> => {
  const reasons = new Map<string, string>();
  days.forEach(({ status }) => {
    if (status.kind !== "blocked") return;
    const known = reasons.get(status.reason);
    if (known?.includes(status.why)) return;
    reasons.set(status.reason, known ? `${known} ${status.why}` : status.why);
  });
  return reasons;
};

// Όταν οι πρώτες μέρες είναι όλες γκρι: η πρώτη ελεύθερη και ο πιο συχνός λόγος πριν από αυτήν.
// Οι κλειστές μέρες και οι αργίες δεν μετράνε ως λόγος· είναι πάντα κλειστές.
export const bookingHintOf = (
  days: readonly DayView[],
): { firstFree: string; why: string } | null => {
  const index = days.findIndex((day) => day.status.kind === "ok");
  if (index <= 0) return null;
  const counts = new Map<string, number>();
  days.slice(0, index).forEach(({ status }) => {
    if (status.kind !== "blocked") return;
    if (status.reason === "Κλειστά" || status.reason === "Αργία") return;
    counts.set(status.why, (counts.get(status.why) ?? 0) + 1);
  });
  const top = [...counts].sort((a, b) => b[1] - a[1])[0];
  return top ? { firstFree: days[index].date, why: top[0] } : null;
};

// Σε ποιο βήμα είναι ο πελάτης: 1 μέρα, 2 διάρκεια, 3 ώρα, 4 επιβεβαίωση.
export const bookingStepOf = (
  date: string | null,
  duration: number | null,
  start: string | null,
): 1 | 2 | 3 | 4 => {
  if (!date) return 1;
  if (!duration) return 2;
  if (!start) return 3;
  return 4;
};
