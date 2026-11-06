// Η απάντηση μιας φόρμας (server action): ένα λάθος, μια ενημέρωση, ή δεδομένα για το επόμενο βήμα της φόρμας
// (π.χ. τα ονόματα πριν από την επιβεβαίωση). Κοινή για όλα τα modules.
export interface FormState<D = never> {
  error?: string;
  notice?: string;
  data?: D;
  // Ήπια προειδοποίηση: η ημερομηνία πέφτει σε κλειστή μέρα· η φόρμα ρωτά «μετακίνηση ή κράτα το».
  closedDay?: ClosedDay;
}

export interface ClosedDay {
  day: string; // YYYY-MM-DD
  reason: string; // π.χ. «Κυριακή — κλειστά», «αργία: Δεκαπενταύγουστος»
  nextOpen: string | null;
}

export const INITIAL_FORM_STATE: FormState = {};
