"use client";

import { useCallback } from "react";

import { skipReply } from "../actions";
import { JForm } from "./j2-form";
import { tellGuide } from "./guide-signal";

// «Δεν χρειάζεται απάντηση» (π.χ. «ευχαριστώ»): η Συνομιλία βγαίνει από το «Περιμένει απάντηση» για όλη την ομάδα,
// χωρίς μήνυμα. Αν ο Πελάτης ξαναγράψει, ξαναμπαίνει μόνη της.
export function SkipReply({ clientId }: { clientId: string }) {
  const handleDone = useCallback(() => tellGuide("no-reply"), []);
  return (
    <JForm
      action={skipReply}
      className="j2-skip"
      submitLabel="Δεν χρειάζεται απάντηση"
      pendingLabel="Αποθήκευση…"
      onSuccess={handleDone}
    >
      <input type="hidden" name="clientId" value={clientId} />
    </JForm>
  );
}
