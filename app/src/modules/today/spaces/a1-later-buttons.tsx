"use client";

import { useActionState } from "react";

import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { snoozeTodayItem, unsnoozeTodayItems } from "../actions";

// «Αργότερα» και «Αναίρεση» (#241 Σ8): μικρές φόρμες με server action, μόνο με κρυφά πεδία (τίποτα να χαθεί), οπότε
// δουλεύουν και πριν ζωντανέψει η σελίδα. Μετά η Σήμερα ξαναφορτώνει (revalidatePath).

export function LaterButton({
  itemKey,
  label,
}: {
  itemKey: string;
  label: string;
}) {
  const [state, action, isPending] = useActionState(
    snoozeTodayItem,
    INITIAL_FORM_STATE,
  );
  return (
    <form action={action} className="a1-later-form">
      <input type="hidden" name="key" value={itemKey} />
      <button
        type="submit"
        className="button"
        data-ghost="true"
        disabled={isPending}
        aria-label={`Αργότερα: ${label}`}
      >
        Αργότερα
      </button>
      {state.error && (
        <span className="muted" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

export function UndoLater({ keys }: { keys: readonly string[] }) {
  const [state, action, isPending] = useActionState(
    unsnoozeTodayItems,
    INITIAL_FORM_STATE,
  );
  return (
    <form action={action} className="a1-later-form">
      {keys.map((key) => (
        <input key={key} type="hidden" name="key" value={key} />
      ))}
      <button type="submit" className="a1-link-button" disabled={isPending}>
        {keys.length === 1 ? "Αναίρεση" : "Αναίρεση όλων"}
      </button>
      {state.error && (
        <span className="muted" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
