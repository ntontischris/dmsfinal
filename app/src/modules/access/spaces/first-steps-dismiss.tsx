"use client";

import { useKeptForm } from "@/lib/use-kept-form";

import { dismissFirstSteps } from "../first-steps-actions";

// «Κατάλαβα»: η κάρτα «Πρώτα βήματα» κλείνει και δεν ξαναφαίνεται.
export function FirstStepsDismiss() {
  const { state, isPending, onSubmit } = useKeptForm(dismissFirstSteps);
  return (
    <form onSubmit={onSubmit} className="btn-row">
      <button type="submit" className="button" disabled={isPending}>
        {isPending ? "Κλείνει…" : "Κατάλαβα"}
      </button>
      {state.error && (
        <span role="alert" className="muted">
          {state.error}
        </span>
      )}
    </form>
  );
}
