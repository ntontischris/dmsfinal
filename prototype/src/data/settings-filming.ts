// Ψεύτικα δεδομένα της Ρυθμίσεων › Γυρίσματα (O4). Αρχικές τιμές από τον πίνακα του κεφ. 5.
// Ωράριο, Χωρητικότητα, διάρκειες και βήμα είναι οι ίδιες τιμές με το BOOKING_HOURS του filming.ts.

import { FILMINGS, OPEN_STATES } from "@/data/filming";

export interface FilmingRule {
  id: string;
  label: string;
  options: readonly string[];
  value: string;
}

export const FILMING_RULES: readonly FilmingRule[] = [
  { id: "needs-approval", label: "Η κράτηση πελάτη θέλει έγκριση", options: ["ναι", "όχι"], value: "ναι" },
  { id: "no-answer", label: "Αν δεν απαντήσει κανείς σε 24 ώρες", options: ["τίποτα", "αυτόματη έγκριση", "αυτόματη απόρριψη"], value: "τίποτα" },
  { id: "horizon", label: "Μέγιστος ορίζοντας κράτησης", options: ["30 μέρες", "60 μέρες", "90 μέρες", "180 μέρες"], value: "60 μέρες" },
  { id: "outside-period", label: "Κράτηση εκτός Περιόδου", options: ["επιτρέπεται", "μόνο μέσα στην Περίοδο"], value: "μόνο μέσα στην Περίοδο" },
  { id: "move-reapproval", label: "Η μετάθεση ξαναθέλει έγκριση", options: ["ναι", "όχι"], value: "ναι" },
  { id: "equipment-clash", label: "Σύγκρουση εξοπλισμού", options: ["προειδοποιεί", "μπλοκάρει"], value: "προειδοποιεί" },
  { id: "client-sees-equipment", label: "Ο πελάτης βλέπει τον εξοπλισμό", options: ["ναι", "όχι"], value: "όχι" },
  { id: "call-sheet", label: "Δελτίο γυρίσματος: αποστολή, επιβεβαίωση, μηδενισμός επιβεβαιώσεων σε αλλαγή", options: ["με το χέρι, ανά μέλος, μηδενίζεται", "αυτόματα, ανά μέλος, μηδενίζεται", "με το χέρι, μία επιβεβαίωση, δεν μηδενίζεται"], value: "με το χέρι, ανά μέλος, μηδενίζεται" },
  { id: "done-mark", label: "Το «έγινε» μπαίνει", options: ["με το χέρι, με τις πραγματικές ώρες", "αυτόματα στη λήξη"], value: "με το χέρι, με τις πραγματικές ώρες" },
];

// Αριθμός ανοιχτών Γυρισμάτων που δεν αλλάζουν με νέο κανόνα.
export const RULES_AFFECTED = FILMINGS.filter((filming) =>
  OPEN_STATES.includes(filming.state),
).length;

export interface WeekDay {
  id: string;
  label: string;
  isOpen: boolean;
  from: string;
  to: string;
  capacity: number;
}

export const DEFAULT_CAPACITY = 2;

export const WEEK: readonly WeekDay[] = [
  { id: "mon", label: "Δευτέρα", isOpen: true, from: "09:00", to: "19:00", capacity: 2 },
  { id: "tue", label: "Τρίτη", isOpen: true, from: "09:00", to: "19:00", capacity: 2 },
  { id: "wed", label: "Τετάρτη", isOpen: true, from: "09:00", to: "19:00", capacity: 2 },
  { id: "thu", label: "Πέμπτη", isOpen: true, from: "09:00", to: "19:00", capacity: 2 },
  { id: "fri", label: "Παρασκευή", isOpen: true, from: "09:00", to: "19:00", capacity: 2 },
  { id: "sat", label: "Σάββατο", isOpen: true, from: "10:00", to: "15:00", capacity: 2 },
  { id: "sun", label: "Κυριακή", isOpen: false, from: "", to: "", capacity: 0 },
];

export interface DayException {
  id: string;
  date: string;
  state: "κλειστό" | "ανοιχτό" | "Χωρητικότητα 1";
  reason: string;
}

export const DAY_EXCEPTIONS: readonly DayException[] = [
  { id: "x1", date: "2026-09-30", state: "Χωρητικότητα 1", reason: "σεμινάριο ομάδας" },
];

export const ALLOWED_DURATIONS: readonly string[] = ["2 ώρες", "3 ώρες", "4 ώρες"];
export const START_STEP = "60 λεπτά";

export interface Holiday {
  id: string;
  name: string;
  date: string;
  kind: "σταθερή" | "κινητή (Πάσχα)";
  isOpenedAsException: boolean;
}

export const HOLIDAYS: readonly Holiday[] = [
  { id: "h1", name: "Πρωτοχρονιά", date: "2026-01-01", kind: "σταθερή", isOpenedAsException: false },
  { id: "h2", name: "Θεοφάνεια", date: "2026-01-06", kind: "σταθερή", isOpenedAsException: false },
  { id: "h3", name: "Καθαρά Δευτέρα", date: "2026-02-23", kind: "κινητή (Πάσχα)", isOpenedAsException: false },
  { id: "h4", name: "25η Μαρτίου", date: "2026-03-25", kind: "σταθερή", isOpenedAsException: false },
  { id: "h5", name: "Μεγάλη Παρασκευή", date: "2026-04-10", kind: "κινητή (Πάσχα)", isOpenedAsException: false },
  { id: "h6", name: "Πάσχα", date: "2026-04-12", kind: "κινητή (Πάσχα)", isOpenedAsException: false },
  { id: "h7", name: "Δευτέρα του Πάσχα", date: "2026-04-13", kind: "κινητή (Πάσχα)", isOpenedAsException: false },
  { id: "h8", name: "Πρωτομαγιά", date: "2026-05-01", kind: "σταθερή", isOpenedAsException: false },
  { id: "h9", name: "Αγίου Πνεύματος", date: "2026-06-01", kind: "κινητή (Πάσχα)", isOpenedAsException: false },
  { id: "h10", name: "Δεκαπενταύγουστος", date: "2026-08-15", kind: "σταθερή", isOpenedAsException: true },
  { id: "h11", name: "28η Οκτωβρίου", date: "2026-10-28", kind: "σταθερή", isOpenedAsException: false },
  { id: "h12", name: "Χριστούγεννα", date: "2026-12-25", kind: "σταθερή", isOpenedAsException: false },
  { id: "h13", name: "Σύναξη Θεοτόκου", date: "2026-12-26", kind: "σταθερή", isOpenedAsException: false },
];

export interface GoogleRules {
  newEvent: string;
  newEventOptions: readonly string[];
  deleteDeadline: string;
  deleteDeadlineOptions: readonly string[];
  writePending: string;
}

export const GOOGLE_RULES: GoogleRules = {
  newEvent: "Κλεισμένος χρόνος",
  newEventOptions: ["Κλεισμένος χρόνος", "τίποτα"],
  deleteDeadline: "24 ώρες",
  deleteDeadlineOptions: ["12 ώρες", "24 ώρες", "48 ώρες"],
  writePending: "ναι",
};
