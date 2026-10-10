// Ελληνικές ετικέτες των Κρατήσεων: μέρες της εβδομάδας (ISO 1 = Δευτέρα) και βήμα ώρας.
export const BOOKING_DAY_LABELS: Readonly<Record<number, string>> = {
  1: "Δευτέρα",
  2: "Τρίτη",
  3: "Τετάρτη",
  4: "Πέμπτη",
  5: "Παρασκευή",
  6: "Σάββατο",
  7: "Κυριακή",
};

export const STEP_LABELS: Readonly<Record<number, string>> = {
  15: "Κάθε 15 λεπτά",
  30: "Κάθε 30 λεπτά",
  60: "Κάθε ώρα",
};
