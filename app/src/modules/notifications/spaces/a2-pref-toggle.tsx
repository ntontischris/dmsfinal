"use client";

import { useEffect, useRef } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import { setPref } from "../actions-prefs";

interface PrefToggleProps {
  automationId: string;
  receive: boolean;
  canMute: boolean;
  name: string;
}

// Το «Λαμβάνω» του prototype (`screens/a2-prefs.tsx`): αλλάζει με το κλικ, στο πραγματικό setPref. Αν η αποθήκευση
// αποτύχει, το κουτί γυρίζει στην τιμή που ισχύει ακόμα.
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
    <form ref={formRef} onSubmit={onSubmit} style={{ display: "contents" }}>
      <input type="hidden" name="automationId" value={automationId} />
      <label className="a2-pref-label">
        <input
          ref={boxRef}
          type="checkbox"
          name="receive"
          defaultChecked={receive}
          disabled={!canMute || isPending}
          aria-label={`Λαμβάνω: ${name}`}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        />
        Λαμβάνω
      </label>
      {state.error && (
        <span className="muted" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
