"use client";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useKeptForm } from "@/lib/use-kept-form";

import { openToClients, setReadinessConfirmation } from "../actions";

// Ο Ιδιοκτήτης επιβεβαιώνει (ή αναιρεί) μια γραμμή που δεν φαίνεται στα δεδομένα.
export function ConfirmItemForm({
  item,
  isDone,
}: {
  item: string;
  isDone: boolean;
}) {
  const { state, isPending: isSaving, onSubmit: action, formRef: actionRef } = useKeptForm(setReadinessConfirmation);
  return (
    <form ref={actionRef} onSubmit={action} className="grid justify-items-end gap-1">
      <input type="hidden" name="item" value={item} />
      <input type="hidden" name="confirmed" value={isDone ? "false" : "true"} />
      <Button
        size="sm"
        variant={isDone ? "ghost" : "default"}
        type="submit"
        disabled={isSaving}
      >
        {isDone ? "Αναίρεση" : "Επιβεβαιώνω"}
      </Button>
      {state.error && <FormMessage state={state} />}
    </form>
  );
}

// «Άνοιγμα σε πελάτες»: μία φορά, δεν αναιρείται. Θέλει να γραφτεί η λέξη, για να μη γίνει κατά λάθος.
export function OpenToClientsForm({ pending }: { pending: number }) {
  const { state, isPending: isOpening, onSubmit: action, formRef: actionRef } = useKeptForm(openToClients);
  if (pending > 0)
    return (
      <p className="m-0 text-sm text-muted-foreground">
        Μένουν {pending === 1 ? "1 «εκκρεμεί»" : `${pending} «εκκρεμεί»`}. Όσο
        υπάρχουν, το σύστημα δεν ανοίγει σε πελάτες· η ομάδα δουλεύει κανονικά.
      </p>
    );
  return (
    <form ref={actionRef} onSubmit={action} className="grid max-w-md gap-3">
      <p className="m-0 text-sm">
        Από τη στιγμή του ανοίγματος φεύγουν emails προς πελάτες, ανοίγουν οι
        δημόσιες φόρμες και οι προσκλήσεις πελατών. Δεν αναιρείται.
      </p>
      <Field label="Γράψε ΑΝΟΙΓΜΑ για επιβεβαίωση">
        <Input name="confirm" autoComplete="off" />
      </Field>
      <FormMessage state={state} />
      <div>
        <Button variant="primary" type="submit" disabled={isOpening}>
          {isOpening ? "Άνοιγμα…" : "Άνοιγμα σε πελάτες"}
        </Button>
      </div>
    </form>
  );
}
