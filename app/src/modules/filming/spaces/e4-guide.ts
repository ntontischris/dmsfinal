// Το E4 μέσα στον οδηγό «Στήνω γύρισμα»: η προτεινόμενη ώρα είναι η πρώτη μέσα στο Ωράριο όπου τα μέλη του
// προεπιλεγμένου Προτύπου Συνεργείου είναι ελεύθερα. Αν δεν υπάρχει, η φόρμα το λέει πριν τη δημιουργία.
// Καθαρό αρχείο: τα πιασμένα διαστήματα τα δίνει η σελίδα (από το Ημερολόγιο).

import { athensDate, athensTime } from "../helpers-time";
import {
  firstFreeTime,
  minutesOf,
  NO_HOURS,
  windowOn,
  type BusySpan,
  type StartSlot,
} from "./e4-start";
import type { BookingHoursView } from "../booking-types";

// Ένα πιασμένο διάστημα (Γύρισμα, Κλεισμένος χρόνος, Google) και ποιους αφορά.
export interface BusyEntry {
  userIds: readonly string[];
  startsAt: string;
  endsAt: string;
}

export interface GuideStartInput {
  hours: Pick<BookingHoursView, "isSet" | "week" | "exceptions" | "holidays"> | null;
  stepMinutes: number;
  slot: StartSlot;
  // Η διάρκεια του είδους (ώρες).
  length: number;
  members: readonly string[];
  busy: readonly BusyEntry[];
}

export type GuideStart =
  | { kind: "free"; slot: StartSlot }
  // Κανένα κενό όλη τη μέρα: η μέρα μένει, η φόρμα προειδοποιεί.
  | { kind: "busy"; slot: StartSlot };

const DAY_MINUTES = 24 * 60;

// Το κομμάτι ενός πιασμένου διαστήματος μέσα στη μέρα, σε λεπτά της Αθήνας.
export const spanOn = (entry: BusyEntry, day: string): BusySpan | null => {
  const startDay = athensDate(new Date(entry.startsAt));
  const endDay = athensDate(new Date(entry.endsAt));
  if (startDay > day || endDay < day) return null;
  const from = startDay < day ? 0 : minutesOf(athensTime(entry.startsAt));
  const to = endDay > day ? DAY_MINUTES : minutesOf(athensTime(entry.endsAt));
  return to > from ? { from, to } : null;
};

const busySpans = (
  busy: readonly BusyEntry[],
  members: readonly string[],
  day: string,
): BusySpan[] =>
  busy
    .filter((entry) => entry.userIds.some((id) => members.includes(id)))
    .map((entry) => spanOn(entry, day))
    .filter((span): span is BusySpan => span !== null);

export const guideStartOf = (input: GuideStartInput): GuideStart => {
  const { slot, members } = input;
  const window = windowOn(input.hours ?? NO_HOURS, slot.date);
  if (!window || members.length === 0) return { kind: "free", slot };
  const time = firstFreeTime({
    window: { opens: slot.time > window.opens ? slot.time : window.opens, closes: window.closes },
    hours: input.length,
    stepMinutes: input.stepMinutes,
    busy: busySpans(input.busy, members, slot.date),
  });
  return time ? { kind: "free", slot: { date: slot.date, time } } : { kind: "busy", slot };
};
