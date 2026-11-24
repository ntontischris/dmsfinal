"use client";

import { useKeptForm } from "@/lib/use-kept-form";

import { sendInvoiceReminder } from "../actions-reminders";
import { FormFeedback } from "./i3-fields";

// Τ4, βήμα 2: ένα κουμπί που στέλνει την υπενθύμιση που φαίνεται από πάνω.
export function SendReminderForm({ invoiceId }: { invoiceId: string }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(sendInvoiceReminder);
  const isSent = state.notice !== undefined;
  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <input type="hidden" name="id" value={invoiceId} />
      <p>
        <button type="submit" className="button" data-primary="true" disabled={isPending || isSent}>
          {isPending ? "Στέλνεται…" : "Στείλε υπενθύμιση"}
        </button>{" "}
        <FormFeedback error={state.error} notice={state.notice} />
      </p>
    </form>
  );
}
