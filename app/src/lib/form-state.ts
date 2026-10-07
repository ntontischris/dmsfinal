// Η απάντηση μιας φόρμας (server action): ένα λάθος ή μια ενημέρωση. Κοινή για όλα τα modules.
export interface FormState {
  error?: string;
  notice?: string;
}

export const INITIAL_FORM_STATE: FormState = {};
