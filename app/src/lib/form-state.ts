// Η απάντηση μιας φόρμας (server action): ένα λάθος, μια ενημέρωση, ή δεδομένα για το επόμενο βήμα της φόρμας
// (π.χ. τα ονόματα πριν από την επιβεβαίωση). Κοινή για όλα τα modules.
export interface FormState<D = never> {
  error?: string;
  notice?: string;
  data?: D;
}

export const INITIAL_FORM_STATE: FormState = {};
