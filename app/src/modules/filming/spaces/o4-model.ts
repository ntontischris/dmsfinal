// Καθαρά κομμάτια της O4 «Ρυθμίσεις: Γυρίσματα» (prototype `screens/O4.tsx`), πάνω στις πραγματικές Ρυθμίσεις.

import type {
  BookingException,
  BookingHoliday,
  BookingWeekDay,
} from "../booking-types";
import type { FilmingSettings } from "../types";

export const O4_PARTS = [
  { id: "rules", label: "Κανόνες" },
  { id: "hours", label: "Ωράριο και Χωρητικότητα" },
  { id: "holidays", label: "Αργίες" },
  { id: "calendar", label: "Είδη κλεισμένου χρόνου" },
  { id: "google", label: "Ημερολόγιο Google" },
] as const;

export type O4Part = (typeof O4_PARTS)[number]["id"];

export const parsePart = (value: string | undefined): O4Part =>
  O4_PARTS.find((part) => part.id === value)?.id ?? "rules";

export const O4_HREF = "/app/settings/filming";

export const partHref = (part: O4Part): string =>
  part === "rules" ? O4_HREF : `${O4_HREF}?part=${part}`;

// Το «ναι/όχι» ενός κουτιού της παλιάς φόρμας: «on» = ναι, κενό = όχι (το action διαβάζει μόνο το «on»).
export const YES_NO: Readonly<Record<string, string>> = {
  on: "ναι",
  "": "όχι",
};
const yesNo = (value: boolean): string => (value ? "on" : "");

// Σημείωση των Κανόνων που αποθηκεύονται αλλά δεν εκτελούνται ακόμα (ίδια με την παλιά φόρμα).
const INACTIVE =
  "Ισχύει όταν έρθει το Ημερολόγιο· μέχρι τότε αποθηκεύεται μόνο (χωρίς scheduler).";

export type O4Rule = {
  name: keyof FilmingSettings;
  label: string;
  hint?: string;
} & (
  | { kind: "yesno"; value: string }
  | { kind: "choice"; value: string; options: Readonly<Record<string, string>> }
  | { kind: "number"; value: number; min: number; max: number }
);

interface RuleLabels {
  noAnswer: Readonly<Record<string, string>>;
  conflict: Readonly<Record<string, string>>;
  sheet: Readonly<Record<string, string>>;
  done: Readonly<Record<string, string>>;
}

// Οι έντεκα Κανόνες με τη σειρά της παλιάς φόρμας.
export const o4RulesOf = (
  s: FilmingSettings,
  labels: RuleLabels,
): readonly O4Rule[] => [
  {
    name: "bookingNeedsApproval",
    label: "Η κράτηση του Πελάτη θέλει έγκριση",
    kind: "yesno",
    value: yesNo(s.bookingNeedsApproval),
  },
  {
    name: "horizonDays",
    label: "Ορίζοντας κρατήσεων (μέρες)",
    kind: "number",
    value: s.horizonDays,
    min: 1,
    max: 365,
  },
  {
    name: "allowOutsidePeriod",
    label: "Επιτρέπεται κράτηση εκτός Περιόδου",
    kind: "yesno",
    value: yesNo(s.allowOutsidePeriod),
  },
  {
    name: "rescheduleNeedsApproval",
    label: "Η μετάθεση από τον Πελάτη θέλει επανέγκριση",
    hint: INACTIVE,
    kind: "yesno",
    value: yesNo(s.rescheduleNeedsApproval),
  },
  {
    name: "noAnswerAction",
    label: "Αν ο Πελάτης δεν απαντήσει",
    hint: "Τρέχει μόνο του κάθε 10 λεπτά: μετά τις ώρες χωρίς απάντηση, το αναμένον Γύρισμα εγκρίνεται ή απορρίπτεται.",
    kind: "choice",
    value: s.noAnswerAction,
    options: labels.noAnswer,
  },
  {
    name: "noAnswerHours",
    label: "Χωρίς απάντηση μετά από (ώρες)",
    hint: "Ορίζει πότε το Γύρισμα παίρνει το σήμα «περιμένει» στην ουρά έγκρισης και πότε τρέχει ο από πάνω Κανόνας.",
    kind: "number",
    value: s.noAnswerHours,
    min: 1,
    max: 720,
  },
  {
    name: "equipmentConflict",
    label: "Σύγκρουση εξοπλισμού",
    kind: "choice",
    value: s.equipmentConflict,
    options: labels.conflict,
  },
  {
    name: "clientSeesEquipment",
    label: "Ο Πελάτης βλέπει τον Εξοπλισμό",
    kind: "yesno",
    value: yesNo(s.clientSeesEquipment),
  },
  {
    name: "changeResetsConfirmations",
    label:
      "Αλλαγή Συνεργείου ή ώρας μετά την αποστολή μηδενίζει τις απαντήσεις",
    kind: "yesno",
    value: yesNo(s.changeResetsConfirmations),
  },
  {
    name: "sheetSending",
    label: "Αποστολή δελτίου",
    hint: INACTIVE,
    kind: "choice",
    value: s.sheetSending,
    options: labels.sheet,
  },
  {
    name: "doneMarking",
    label: "Σήμανση «έγινε»",
    hint: "Αν είναι αυτόματη, την επόμενη μέρα το Γύρισμα γίνεται «έγινε» με τις κλεισμένες ώρες. Γύρισμα που αναιρέθηκε με το χέρι δεν ξανακλείνει μόνο του.",
    kind: "choice",
    value: s.doneMarking,
    options: labels.done,
  },
];

// Η πρόταση όσο δεν έχει αποθηκευτεί Ωράριο (ίδια με την παλιά φόρμα): Δευτέρα–Σάββατο ανοιχτά, Κυριακή κλειστά.
export const PROPOSAL_WEEK: readonly BookingWeekDay[] = [
  1, 2, 3, 4, 5, 6, 7,
].map((dow) => ({
  dow,
  isOpen: dow !== 7,
  opens: dow === 6 ? "10:00" : "09:00",
  closes: dow === 6 ? "15:00" : "19:00",
}));

export const exceptionState = (exception: BookingException): string => {
  if (exception.isClosed) return "κλειστά";
  const hours =
    exception.opens && exception.closes
      ? `${exception.opens}–${exception.closes}`
      : "ωράριο της εβδομάδας";
  return exception.capacity === null
    ? hours
    : `${hours} · χωρητικότητα ${exception.capacity}`;
};

export type HolidayLook = "open" | "opened-closed-day" | "closed";

// Ανοιγμένη αργία σε μέρα κλειστή στο εβδομαδιαίο Ωράριο μένει χωρίς ώρες: το λέμε, για να μπουν ώρες στις Εξαιρέσεις.
export const holidayLook = (holiday: BookingHoliday): HolidayLook =>
  holiday.isOpen ? "open" : holiday.isOpened ? "opened-closed-day" : "closed";
