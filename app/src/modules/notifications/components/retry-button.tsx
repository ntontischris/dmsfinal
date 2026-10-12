"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { retrySend } from "../actions-sends";
import {
  RETRY_CANCEL,
  RETRY_CONFIRM,
  RETRY_CONFIRM_YES,
  RETRY_LABEL,
} from "../sends-labels";

// «Ξαναστείλε» με επιβεβαίωση: πρώτο πάτημα ρωτά, δεύτερο στέλνει.
export function RetryButton({ outboxId }: { outboxId: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [state, action, isPending] = useActionState(
    retrySend,
    INITIAL_FORM_STATE,
  );
  if (state.notice) return <FormMessage state={state} />;
  if (!isConfirming)
    return (
      <Button size="sm" onClick={() => setIsConfirming(true)}>
        {RETRY_LABEL}
      </Button>
    );
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="ref" value={outboxId} />
      <p className="m-0 text-sm">{RETRY_CONFIRM}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={isPending}>
          {RETRY_CONFIRM_YES}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsConfirming(false)}
        >
          {RETRY_CANCEL}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
