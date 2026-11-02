"use client";

import { useState, type ReactNode } from "react";

import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

// Φόρμα μιας γραμμής ουράς: η γραμμή φεύγει από τη λίστα μόλις πετύχει η ενέργεια (η σελίδα ξαναφορτώνει), οπότε το
// μήνυμα επιτυχίας ανεβαίνει στη λίστα με onDone και μένει εκεί. Το λάθος μένει μέσα στη φόρμα.
export function RowForm({
  action,
  submitLabel,
  isPrimary = false,
  isDanger = false,
  isDisabled = false,
  className = "btn-row",
  onDone,
  children,
}: {
  action: Action;
  submitLabel: string;
  isPrimary?: boolean;
  isDanger?: boolean;
  isDisabled?: boolean;
  className?: string;
  onDone: (notice: string) => void;
  children?: ReactNode;
}) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(
    async (previous, data: FormData) => {
      const next = await action(previous, data);
      if (next.notice) onDone(next.notice);
      return next;
    },
  );
  return (
    <form ref={formRef} className={className} onSubmit={onSubmit}>
      {children}
      <button
        type="submit"
        className="button"
        data-primary={isPrimary ? "true" : undefined}
        data-danger={isDanger ? "true" : undefined}
        disabled={isPending || isDisabled}
      >
        {submitLabel}
      </button>
      {state.error && (
        <span className="note" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

// Τα μηνύματα των ενεργειών που έγιναν, κάτω από τη λίστα.
export function useDoneNotes() {
  const [notes, setNotes] = useState<readonly { id: string; text: string }[]>(
    [],
  );
  const add = (id: string, text: string) =>
    setNotes((current) => [...current, { id, text }]);
  const isDone = (id: string) => notes.some((note) => note.id === id);
  const view = notes.map((note) => (
    <p key={note.id} className="note" role="status">
      {note.text}
    </p>
  ));
  return { add, isDone, view };
}
