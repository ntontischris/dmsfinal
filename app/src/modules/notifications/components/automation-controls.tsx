"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { useKeptForm } from "@/lib/use-kept-form";

import { deleteAutomation, setAutomationEnabled } from "../actions-automations";
import {
  ADD_AUTOMATION,
  DELETE_CONFIRM,
  DELETE_LABEL,
  ENABLED_LABEL,
  NEW_AUTOMATION_TITLE,
} from "../automation-labels";
import type { EventPage } from "../automation-view-schema";
import { AutomationForm } from "./automation-form";

// Ο διακόπτης «Ενεργός», η διαγραφή (δύο βήματα) και η «Προσθήκη Αυτοματισμού» (K1, #173).

export function EnabledToggle({
  id,
  isEnabled,
}: {
  id: string;
  isEnabled: boolean;
}) {
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(setAutomationEnabled);
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid justify-items-end gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="isEnabled"
          defaultChecked={isEnabled}
          disabled={isPending}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        />
        {ENABLED_LABEL}
      </label>
      <FormMessage state={state} />
    </form>
  );
}

export function DeleteAutomation({ id }: { id: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { state, isPending, onSubmit, formRef } = useKeptForm(deleteAutomation);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      {/* Διαφορετικά keys: αλλιώς η React ξαναχρησιμοποιεί το ίδιο κουμπί, γίνεται submit μέσα στο ίδιο κλικ και διαγράφει χωρίς επιβεβαίωση. */}
      <div>
        {isConfirming ? (
          <Button
            key="confirm"
            type="submit"
            variant="danger"
            disabled={isPending}
          >
            {DELETE_CONFIRM}
          </Button>
        ) : (
          <Button
            key="ask"
            variant="danger"
            onClick={() => setIsConfirming(true)}
          >
            {DELETE_LABEL}
          </Button>
        )}
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function NewAutomation({ page }: { page: EventPage }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!isOpen)
    return (
      <div>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          {ADD_AUTOMATION}
        </Button>
      </div>
    );
  return (
    <section
      aria-label={NEW_AUTOMATION_TITLE}
      className="grid gap-3 rounded-md border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-base font-semibold">{NEW_AUTOMATION_TITLE}</h2>
        <Button variant="ghost" onClick={() => setIsOpen(false)}>
          Ακύρωση
        </Button>
      </div>
      <AutomationForm
        page={page}
        automation={null}
        onSuccess={() => setIsOpen(false)}
      />
    </section>
  );
}
