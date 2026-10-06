import { findAgreement } from "@/data/agreements";
import { BOOKING_HOURS } from "@/data/filming";
import { capacityOf, takenAt } from "@/data/filming-access";
import {
  TODAY_ISO,
  addDays,
  balanceOfDay,
  hhmm,
  weekdayOf,
} from "@/screens/e4-model";

// Η λογική της κράτησης του πελάτη: ποια μέρα, διάρκεια και ώρα είναι ελεύθερη και γιατί.
export const AGREEMENT_ID = "ag-kypseli-social";

export type DayStatus =
  { kind: "ok"; left: number } | { kind: "blocked"; reason: string };

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

export const startTimesOf = (
  date: string,
  duration: number,
): readonly string[] => {
  const hours = BOOKING_HOURS.week[weekdayOf(date)];
  if (!hours) return [];
  const step = BOOKING_HOURS.stepMinutes;
  const count =
    Math.floor(((hours.to - hours.from) * 60 - duration * 60) / step) + 1;
  return Array.from({ length: Math.max(0, count) }, (_, index) =>
    hhmm(hours.from * 60 + index * step),
  );
};

export const freeStartTimes = (
  date: string,
  duration: number,
): readonly string[] =>
  startTimesOf(date, duration).filter(
    (start) => takenAt(date, start, duration) < capacityOf(date),
  );

// Χωρίς Περίοδο: είτε η Συμφωνία δεν καλύπτει τη μέρα, είτε η Περίοδός της δεν έχει ανοίξει ακόμα.
const outsideReasonOf = (date: string): string => {
  const agreement = findAgreement(AGREEMENT_ID);
  const isCovered =
    !!agreement?.start && date >= agreement.start && (!agreement.end || date <= agreement.end);
  return isCovered ? "Η Περίοδος δεν άνοιξε" : "Εκτός Συμφωνίας";
};

export const dayStatusOf = (
  date: string,
  noticeDays: number,
  hasNoBenefit: boolean,
): DayStatus => {
  const closedReason = BOOKING_HOURS.closedDays[date];
  if (!BOOKING_HOURS.week[weekdayOf(date)])
    return { kind: "blocked", reason: "Κλειστά" };
  if (closedReason) return { kind: "blocked", reason: "Αργία" };
  if (date < addDays(TODAY_ISO, noticeDays))
    return {
      kind: "blocked",
      reason: `Νωρίς (${noticeDays} μέρες ειδοποίηση)`,
    };
  const balance = balanceOfDay(AGREEMENT_ID, date);
  if (!balance) return { kind: "blocked", reason: outsideReasonOf(date) };
  if (hasNoBenefit || balance.left <= 0)
    return { kind: "blocked", reason: "Χωρίς Παροχή" };
  const shortest = Math.min(...BOOKING_HOURS.durations);
  if (freeStartTimes(date, shortest).length === 0)
    return { kind: "blocked", reason: "Γεμάτο" };
  return { kind: "ok", left: balance.left };
};

export const noticeDaysOf = (): number =>
  findAgreement(AGREEMENT_ID)?.terms.filming.noticeDays ?? 0;

export const cancelHoursOf = (): number =>
  findAgreement(AGREEMENT_ID)?.terms.filming.cancelHours ?? 0;

// Μέχρι πότε ακυρώνει ή μεταθέτει μόνος του: η έναρξη μείον το Όριο ακύρωσης.
export const cancelDeadlineOf = (
  date: string,
  start: string,
  cancelHours: number,
): { date: string; time: string } => {
  const iso = new Date(
    Date.parse(`${date}T${start}:00Z`) - cancelHours * 3_600_000,
  ).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
};
