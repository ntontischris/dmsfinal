"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useKeptForm } from "@/lib/use-kept-form";

import { completeGdprRequest } from "../actions";

// Κλείσιμο ενός αιτήματος: ημερομηνία ολοκλήρωσης (κενή = σήμερα) και σημείωση.
export function CompleteRequestForm({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(completeGdprRequest);
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      aria-label={`Ολοκλήρωση: ${label}`}
      className="grid justify-items-start gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          name="completedOn"
          type="date"
          aria-label="Ημερομηνία ολοκλήρωσης"
          className="w-auto"
        />
        <Input
          name="note"
          aria-label="Σημείωση ολοκλήρωσης"
          placeholder="Σημείωση"
          maxLength={1000}
          className="w-48"
        />
        <Button size="sm" type="submit" disabled={isPending}>
          {isPending ? "Αποθήκευση…" : "Ολοκλήρωση"}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
