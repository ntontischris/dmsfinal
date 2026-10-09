import type { Tone } from "@/components/ui/badge";

import {
  EVENT_LABELS,
  SIGNAL_LABELS,
  UNKNOWN_ACTOR_LABEL,
} from "./labels";
import { formatHours } from "./helpers-time";
import type {
  BookingAgreement,
  BookingKind,
  FilmingHistoryEntry,
  FilmingSignals,
  FilmingState,
  OpenFilmingOption,
  FilmingRow,
  ProvisionMeasure,
} from "./types";

// Καθαρές συναρτήσεις του module: σήματα, κείμενα, υπόλοιπα, επιλογές. Καμία είσοδος/έξοδος·
// η απόφαση για το τι επιτρέπεται μένει πάντα στη βάση.

export { formatDate, formatDateTime, formatHours } from "./helpers-time";

export const DURATION_PRESETS = [2, 3, 4] as const;

export const stateTone = (state: FilmingState): Tone | undefined => {
  if (state === "done") return "ok";
  if (state === "pending") return "attention";
  return undefined;
};

// Τα Σήματα της γραμμής, μόνο όσα ισχύουν, με τη σειρά που φαίνονται.
export const activeSignals = (
  signals: FilmingSignals,
): { key: keyof FilmingSignals; label: string }[] =>
  (Object.keys(SIGNAL_LABELS) as (keyof FilmingSignals)[])
    .filter((key) => signals[key])
    .map((key) => ({ key, label: SIGNAL_LABELS[key] }));

// «2 από 3» για το Συνεργείο· null όταν δεν βλέπει ο Χρήστης το Συνεργείο.
export const crewRatio = (
  crew: { confirmed: number; total: number } | null,
): string | null => (crew === null ? null : `${crew.confirmed}/${crew.total}`);

// Το υπόλοιπο ως κείμενο, χωρίς ποσά: «υπόλοιπο 2» ή «δεν υπάρχει υπόλοιπο» όταν τελείωσε.
export const balanceText = (balance: number): string =>
  balance > 0
    ? `υπόλοιπο ${formatHours(balance)}`
    : "χωρίς υπόλοιπο";

// Το μήνυμα «έξτρα» της φόρμας: όταν το είδος δεν έχει πια υπόλοιπο στην Περίοδο.
export const isExtraBalance = (balance: number | null): boolean =>
  balance !== null && balance <= 0;

// Το είδος που προτείνεται πρώτο στη φόρμα κράτησης: το πρώτο με μέτρηση.
export const defaultKindId = (kinds: readonly BookingKind[]): string =>
  kinds[0]?.id ?? "";

// Η ώρα της φόρμας ξεκινά από τη διάρκεια της Παροχής (ή 3 ώρες αν δεν υπάρχει).
export const defaultHours = (kind: BookingKind | undefined): number =>
  kind?.defaultHours ?? 3;

// Η γραμμή κλειδώματος του E2: «περιμένει 36 ώρες».
export const waitingText = (hours: number): string =>
  `περιμένει ${formatHours(Math.round(hours))} ώρες`;

// Το κείμενο του Ιστορικού: γεγονός, και λόγος όπου υπάρχει.
const textOf = (value: unknown): string =>
  typeof value === "string" ? value : "";

const reasonOf = (entry: FilmingHistoryEntry): string => {
  const reason = textOf(entry.after?.reason) || textOf(entry.after?.note);
  return reason === "" ? "" : `. Λόγος: ${reason}`;
};

const eventText = (entry: FilmingHistoryEntry): string =>
  `${EVENT_LABELS[entry.event ?? ""] ?? entry.event ?? "—"}${reasonOf(entry)}`;

export interface FilmingHistoryLine {
  at: string;
  actor: string;
  text: string;
}

// Μία γραμμή για κάθε γεγονός του Ίχνους. Οι εγγραφές insert/update δεν μπαίνουν: τα γεγονότα τις περιγράφουν ήδη.
export const historyLines = (
  entries: readonly FilmingHistoryEntry[],
): FilmingHistoryLine[] =>
  entries.flatMap((entry) =>
    entry.action === "event"
      ? [
          {
            at: entry.at,
            actor: entry.actorName ?? UNKNOWN_ACTOR_LABEL,
            text: eventText(entry),
          },
        ]
      : [],
  );

// Τα Γυρίσματα που μπορούν να δεσμευτούν από την F2: ανοιχτά, με τη σειρά της βάσης.
export const openFilmingChoices = (
  rows: readonly FilmingRow[],
): OpenFilmingOption[] =>
  rows.map((row) => ({
    id: row.id,
    startsAt: row.startsAt,
    hours: row.hours,
    production: row.production,
  }));


// Πάνω από τη διάρκεια του είδους: μόνο για Παροχή ανά Γύρισμα· το επιπλέον είναι έξτρα (Γ4). Καθαρά, από τα δεδομένα των επιλογών.
export const isAboveDefault = (
  hours: number,
  measure: ProvisionMeasure,
  defaultHours: number | null,
): boolean => measure === "per_filming" && defaultHours !== null && hours > defaultHours;

// Η προεπιλεγμένη διάρκεια του είδους μιας Συμφωνίας, από τις επιλογές κράτησης (null αν δεν βρεθεί).
export const kindDefaultHours = (
  agreements: readonly BookingAgreement[],
  agreementId: string | null | undefined,
  kindId: string | null | undefined,
): number | null =>
  agreements.find((agreement) => agreement.id === agreementId)?.kinds.find((kind) => kind.id === kindId)
    ?.defaultHours ?? null;
