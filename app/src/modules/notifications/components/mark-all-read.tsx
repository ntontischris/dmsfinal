"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { markAllRead } from "../actions";
import { MARK_ALL_READ } from "../labels";

// «Όλες διαβασμένες»: ένα κουμπί, με το αποτέλεσμα δίπλα του.
export function MarkAllRead({ isDisabled }: { isDisabled: boolean }) {
  const [state, action, isPending] = useActionState(
    markAllRead,
    INITIAL_FORM_STATE,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Button type="submit" disabled={isPending || isDisabled}>
        {MARK_ALL_READ}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
