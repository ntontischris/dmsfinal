// Η Συνομιλία λέει στον οδηγό «Απαντώ σε Πελάτες» τι έγινε (απάντηση, δουλειά Αιτήματος, απόρριψη, «Δεν χρειάζεται
// απάντηση»), ώστε να περάσει μόνος του στο επόμενο βήμα. Χωρίς οδηγό στη σελίδα δεν ακούει κανείς: δεν αλλάζει τίποτα.

import type { FormState } from "@/lib/form-state";

export type GuideOutcome = "reply" | "note" | "worked" | "rejected" | "no-reply";

export const tellGuide = (outcome: GuideOutcome): void => {
  window.dispatchEvent(new CustomEvent("flows:outcome", { detail: outcome }));
};

type FormAction = (state: FormState, form: FormData) => Promise<FormState>;

// Η φόρμα λέει στον οδηγό τι έγινε μόλις πετύχει η αποθήκευση — πριν η σελίδα ανανεωθεί. Μετά την ανανέωση το κλεισμένο
// Αίτημα (ή το «Δεν χρειάζεται απάντηση») δεν έχει πια κουμπιά, η φόρμα φεύγει από την οθόνη και δεν προλαβαίνει να το πει.
export const withSignal =
  (action: FormAction, outcome: GuideOutcome): FormAction =>
  async (state, form) => {
    const result = await action(state, form);
    if (result.notice !== undefined && result.error === undefined)
      tellGuide(outcome);
    return result;
  };

const APANTO = "apanto-se-pelates";

// Είμαστε μέσα στον οδηγό «Απαντώ σε Πελάτες»;
export const isInApanto = (search: URLSearchParams): boolean =>
  search.get("job") === APANTO;

// «Κλείσιμο Γυρίσματος» μέσα στον οδηγό: ανοίγει τη φόρμα στον οδηγό «Στήνω γύρισμα» (βήμα της φόρμας) και κρατά πού
// γυρνάμε μετά (στην απάντηση αυτής της Συνομιλίας). Έξω από τον οδηγό ο σύνδεσμος μένει όπως ήταν.
export const filmingFromRequestHref = (
  base: string,
  thread: { pathname: string; search: URLSearchParams },
): string => {
  if (!isInApanto(thread.search)) return base;
  const back = `${thread.pathname}?job=${APANTO}&step=3`;
  const extra = new URLSearchParams({
    job: "stino-gyrisma",
    step: "2",
    from: back,
  });
  return `${base}&${extra.toString()}`;
};
