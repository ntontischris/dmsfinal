"use client";

import { useActionState, useState } from "react";

import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { deleteConversation } from "../assistant-actions";

// «Διαγραφή Συζήτησης» σε δύο βήματα. Μαζί φεύγουν τα μηνύματα και οι Αναπάντητες που ήρθαν μόνο από αυτήν.
export function DeleteConversation({ id }: { id: string }) {
  const [state, action, isDeleting] = useActionState(
    deleteConversation,
    INITIAL_FORM_STATE,
  );
  const [isConfirming, setIsConfirming] = useState(false);
  if (!isConfirming)
    return (
      <div className="ml-quick">
        <button
          type="button"
          data-danger="true"
          onClick={() => setIsConfirming(true)}
        >
          Διαγραφή Συζήτησης
        </button>
      </div>
    );
  return (
    <form
      className="k-confirm"
      action={action}
      role="alertdialog"
      aria-label="Επιβεβαίωση διαγραφής"
    >
      <input type="hidden" name="id" value={id} />
      <p>
        Η Συζήτηση θα διαγραφεί οριστικά, μαζί με τις Αναπάντητες ερωτήσεις που
        ήρθαν μόνο από αυτήν.
      </p>
      {state.error && (
        <p className="k-note" role="alert">
          {state.error}
        </p>
      )}
      <div className="ml-quick">
        <button type="submit" data-danger="true" disabled={isDeleting}>
          {isDeleting ? "Διαγραφή…" : "Ναι, διαγραφή"}
        </button>
        <button type="button" onClick={() => setIsConfirming(false)}>
          Άκυρο
        </button>
      </div>
    </form>
  );
}
