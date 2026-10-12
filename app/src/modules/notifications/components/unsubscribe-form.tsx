"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { unsubscribe } from "../actions-public";
import { UNSUBSCRIBE_BUTTON } from "../labels";

// Η επιβεβαίωση της διακοπής: POST με κουμπί, ώστε ένα prefetch του συνδέσμου να μη σβήνει τίποτα.
export function UnsubscribeForm({ token }: { token: string }) {
  const [state, action, isPending] = useActionState(
    unsubscribe,
    INITIAL_FORM_STATE,
  );
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="token" value={token} />
      {!state.notice && (
        <div>
          <Button type="submit" disabled={isPending}>
            {UNSUBSCRIBE_BUTTON}
          </Button>
        </div>
      )}
      <FormMessage state={state} />
    </form>
  );
}
