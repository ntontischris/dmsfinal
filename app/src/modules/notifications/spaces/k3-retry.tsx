"use client";

import { useActionState, useState } from "react";

import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { retrySend } from "../actions-sends";
import {
  RETRY_CANCEL,
  RETRY_CONFIRM,
  RETRY_CONFIRM_YES,
  RETRY_LABEL,
} from "../sends-labels";
import { KMessage } from "./k-form";

// «Ξαναστείλε» (prototype `k3-table.tsx`) πάνω στην πραγματική ενέργεια, με επιβεβαίωση: πρώτο πάτημα ρωτά, δεύτερο στέλνει.
export function RetryButton({ outboxId }: { outboxId: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [state, action, isPending] = useActionState(
    retrySend,
    INITIAL_FORM_STATE,
  );
  if (state.notice) return <KMessage state={state} />;
  if (!isConfirming)
    return (
      <button
        className="button"
        type="button"
        onClick={() => setIsConfirming(true)}
      >
        {RETRY_LABEL}
      </button>
    );
  return (
    <form action={action}>
      <input type="hidden" name="ref" value={outboxId} />
      <span className="part-sub">{RETRY_CONFIRM}</span>
      <span className="btn-row">
        <button
          className="button"
          data-primary="true"
          type="submit"
          disabled={isPending}
        >
          {RETRY_CONFIRM_YES}
        </button>
        <button
          className="button"
          type="button"
          onClick={() => setIsConfirming(false)}
        >
          {RETRY_CANCEL}
        </button>
      </span>
      <KMessage state={state} />
    </form>
  );
}
