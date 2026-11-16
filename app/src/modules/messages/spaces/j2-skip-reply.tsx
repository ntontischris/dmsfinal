"use client";

import { skipReply } from "../actions";
import { withSignal } from "./guide-signal";
import { JForm } from "./j2-form";

// Ο οδηγός μαθαίνει το «Δεν χρειάζεται απάντηση» μόλις αποθηκευτεί (μετά την ανανέωση η Συνομιλία δεν περιμένει πια).
const skipAndTell = withSignal(skipReply, "no-reply");

// «Δεν χρειάζεται απάντηση» (π.χ. «ευχαριστώ»): η Συνομιλία βγαίνει από το «Περιμένει απάντηση» για όλη την ομάδα,
// χωρίς μήνυμα. Αν ο Πελάτης ξαναγράψει, ξαναμπαίνει μόνη της. Δευτερεύον κουμπί: το κύριο είναι η «Αποστολή».
export function SkipReply({ clientId }: { clientId: string }) {
  return (
    <JForm
      action={skipAndTell}
      className="j2-skip"
      submitLabel="Δεν χρειάζεται απάντηση"
      pendingLabel="Αποθήκευση…"
      isSecondary
    >
      <input type="hidden" name="clientId" value={clientId} />
    </JForm>
  );
}
