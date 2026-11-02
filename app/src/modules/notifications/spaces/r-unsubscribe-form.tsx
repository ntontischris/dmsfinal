"use client";

import { useActionState } from "react";

import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { unsubscribe } from "../actions-public";
import { UNSUBSCRIBE_BUTTON } from "../labels";

// Η επιβεβαίωση της διακοπής στη νέα εμφάνιση (κάρτα των R9/R10/R13): POST με κουμπί, ώστε ένα prefetch του
// συνδέσμου να μη σβήνει τίποτα. Ίδιο action με την κλασική.
export function SpacesUnsubscribeForm({ token }: { token: string }) {
  const [state, action, isPending] = useActionState(
    unsubscribe,
    INITIAL_FORM_STATE,
  );
  return (
    <form action={action} className="r-form">
      <input type="hidden" name="token" value={token} />
      {!state.notice && (
        <button className="site-button" type="submit" disabled={isPending}>
          {UNSUBSCRIBE_BUTTON}
        </button>
      )}
      {state.error && (
        <p className="r-msg" data-kind="error" role="alert">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className="r-msg" data-kind="info" role="status">
          {state.notice}
        </p>
      )}
    </form>
  );
}
