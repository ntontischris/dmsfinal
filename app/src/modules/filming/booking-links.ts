import { z } from "zod";

// Η κατάσταση της E5 βρίσκεται στο URL: μία πηγή αλήθειας, ώστε η σελίδα να ξαναφορτώνεται ίδια.
// Κάθε επιλογή καθαρίζει τα βήματα που εξαρτώνται από αυτήν (αλλάζεις Συμφωνία → χάνονται μέρα και ώρα).

export interface BookingSelection {
  agreement?: string;
  kind?: string;
  day?: string;
  hours?: string;
  time?: string;
  reschedule?: string;
}

const optionalText = z.string().optional().catch(undefined);

export const bookingSelectionSchema = z.object({
  agreement: optionalText,
  kind: optionalText,
  day: optionalText,
  hours: optionalText,
  time: optionalText,
  reschedule: optionalText,
});

const KEYS: readonly (keyof BookingSelection)[] = [
  "agreement",
  "kind",
  "day",
  "hours",
  "time",
  "reschedule",
];

// Η διαδρομή της E5 με τα πεδία που έχουν τιμή, με τη σειρά των βημάτων.
export const bookingHref = (selection: BookingSelection): string => {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = selection[key];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/app/book?${query}` : "/app/book";
};

// Κρατά μόνο τα βήματα μέχρι και το `last` (και την Επανάληψη μετάθεσης, που δεν αλλάζει ποτέ εδώ).
const upTo = (
  selection: BookingSelection,
  last: keyof BookingSelection,
): BookingSelection => {
  const steps: (keyof BookingSelection)[] = ["agreement", "kind", "day", "hours", "time"];
  const kept = steps.slice(0, steps.indexOf(last) + 1);
  return Object.fromEntries(
    [["reschedule", selection.reschedule], ...kept.map((key) => [key, selection[key]])],
  );
};

// Κάθε επιλογή ξαναγράφει τα βήματα από εκεί και κάτω: αλλαγή Συμφωνίας χάνει μέρα και ώρα.
export const withAgreement = (selection: BookingSelection, agreement: string): BookingSelection => ({
  ...upTo(selection, "agreement"),
  agreement,
});

export const withKind = (selection: BookingSelection, kind: string): BookingSelection => ({
  ...upTo(selection, "agreement"),
  kind,
});

export const withDay = (selection: BookingSelection, day: string): BookingSelection => ({
  ...upTo(selection, "kind"),
  day,
});

export const withHours = (selection: BookingSelection, hours: string): BookingSelection => ({
  ...upTo(selection, "day"),
  hours,
});

export const withTime = (selection: BookingSelection, time: string): BookingSelection => ({
  ...upTo(selection, "hours"),
  time,
});
