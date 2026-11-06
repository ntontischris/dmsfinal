import { z } from "zod";

import type { ClosedDay } from "@/lib/form-state";

import { formatDate } from "./helpers";

// Επόμενο βήμα σε κλειστή μέρα (Ωράριο ή αργία): η φόρμα προειδοποιεί μία φορά και ποτέ δεν εμποδίζει.

export const CONFIRM_CLOSED_DAY = "confirmClosedDay";
export const PREVIOUS_DUE = "previousDue";

const answerSchema = z.object({
  closed: z.boolean(),
  reason: z.string().nullable(),
  next_open: z.string().nullable(),
});

// Η απάντηση του day_closed_reason → η προειδοποίηση, ή null για ανοιχτή μέρα (ή απάντηση που δεν διαβάζεται).
export function toClosedDay(day: string, answer: unknown): ClosedDay | null {
  const parsed = answerSchema.safeParse(answer);
  if (!parsed.success || !parsed.data.closed || parsed.data.reason === null)
    return null;
  return { day, reason: parsed.data.reason, nextOpen: parsed.data.next_open };
}

// Ρωτάμε μόνο αν δεν το επιβεβαίωσε ήδη και αν η ημερομηνία άλλαξε (αλλαγή μόνο του κειμένου δεν ξαναρωτά).
export function shouldCheckClosedDay(form: FormData, day: string): boolean {
  if (form.get(CONFIRM_CLOSED_DAY) === "1") return false;
  return form.get(PREVIOUS_DUE) !== day;
}

export const closedDayText = (closed: ClosedDay): string =>
  `Η ${formatDate(closed.day)} είναι ${closed.reason}.`;

export const moveLabel = (nextOpen: string): string =>
  `Πήγαινέ το στην ${formatDate(nextOpen)}`;
