"use client";

import { useEffect, useRef } from "react";

import { FormMessage } from "@/components/ui/form-message";
import { useKeptForm } from "@/lib/use-kept-form";

import { setPref } from "../actions-prefs";
import { RECEIVE_LABEL } from "../automation-labels";

// «Λαμβάνω» ενός Αυτοματισμού (#173): αλλάζει με το κλικ. Κλειδωμένο όταν είναι απαραίτητο για πελάτη.
// Αν η αποθήκευση αποτύχει, το κουτί γυρίζει στην τιμή που ισχύει ακόμα.
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
  const boxRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef(receive);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    if (state.error) box.checked = savedRef.current;
    if (state.notice) savedRef.current = box.checked;
  }, [state]);
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid justify-items-end gap-1"
    >
      <input type="hidden" name="automationId" value={automationId} />
      <label className="flex items-center gap-2 text-sm">
        <input
          ref={boxRef}
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
