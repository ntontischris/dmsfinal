"use client";

import { useActionState } from "react";

import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { markAllRead } from "../actions";

// «Όλες διαβασμένες» του prototype, δεμένο στο πραγματικό markAllRead.
export function MarkAllRead({ isDisabled }: { isDisabled: boolean }) {
  const [state, action, isPending] = useActionState(
    markAllRead,
    INITIAL_FORM_STATE,
  );
  return (
    <form action={action} className="ml-quick a2-mark-all">
      <button
        type="submit"
        disabled={isPending || isDisabled}
      >
        Όλες διαβασμένες
      </button>
      {state.error && (
        <span className="muted" role="alert">
          {state.error}
        </span>
      )}
      {state.notice && (
        <span className="muted" role="status">
          {state.notice}
        </span>
      )}
    </form>
  );
}
