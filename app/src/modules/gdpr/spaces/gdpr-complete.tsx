"use client";

import { useKeptForm } from "@/lib/use-kept-form";

import { completeGdprRequest } from "../actions";

// Κλείσιμο ενός αιτήματος (completeGdprRequest): ημερομηνία ολοκλήρωσης (κενή = σήμερα) και σημείωση.
export function CompleteForm({ id, label }: { id: string; label: string }) {
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(completeGdprRequest);
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      aria-label={`Ολοκλήρωση: ${label}`}
      className="btn-row"
    >
      <input type="hidden" name="id" value={id} />
      <input
        className="input"
        name="completedOn"
        type="date"
        aria-label="Ημερομηνία ολοκλήρωσης"
      />
      <input
        className="input"
        name="note"
        aria-label="Σημείωση ολοκλήρωσης"
        placeholder="Σημείωση"
        maxLength={1000}
      />
      <button type="submit" className="button" disabled={isPending}>
        {isPending ? "Αποθήκευση…" : "Ολοκλήρωση"}
      </button>
      {(state.error || state.notice) && (
        <span className="note" role={state.error ? "alert" : "status"}>
          {state.error ?? state.notice}
        </span>
      )}
    </form>
  );
}
