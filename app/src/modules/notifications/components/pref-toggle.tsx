"use client";

import { FormMessage } from "@/components/ui/form-message";
import { useKeptForm } from "@/lib/use-kept-form";

import { setPref } from "../actions-prefs";
import { RECEIVE_LABEL } from "../automation-labels";

// «Λαμβάνω» ενός Αυτοματισμού (#173): αλλάζει με το κλικ. Κλειδωμένο όταν είναι απαραίτητο για πελάτη.
interface PrefToggleProps {
  automationId: string;
  receive: boolean;
  canMute: boolean;
  name: string;
}

export function PrefToggle({
  automationId,
  receive,
  canMute,
  name,
}: PrefToggleProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(setPref);
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid justify-items-end gap-1"
    >
      <input type="hidden" name="automationId" value={automationId} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="receive"
          defaultChecked={receive}
          disabled={!canMute || isPending}
          aria-label={`${RECEIVE_LABEL}: ${name}`}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        />
        {RECEIVE_LABEL}
      </label>
      <FormMessage state={state} />
    </form>
  );
}
