"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { deleteConversation } from "../assistant-actions";

// «Διαγραφή Συζήτησης» σε δύο βήματα. Μαζί φεύγουν τα μηνύματα και οι Αναπάντητες που ήρθαν μόνο από αυτήν.
export function DeleteConversationForm({ id }: { id: string }) {
  const [state, action, isDeleting] = useActionState(
    deleteConversation,
    INITIAL_FORM_STATE,
  );
  const [isConfirming, setIsConfirming] = useState(false);
  if (!isConfirming)
    return (
      <div>
        <Button variant="danger" onClick={() => setIsConfirming(true)}>
          Διαγραφή Συζήτησης
        </Button>
      </div>
    );
  return (
    <form
      action={action}
      role="alertdialog"
      aria-label="Επιβεβαίωση διαγραφής"
      className="grid justify-items-start gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <p className="m-0 text-sm">
        Η Συζήτηση θα διαγραφεί οριστικά, μαζί με τις Αναπάντητες ερωτήσεις που
        ήρθαν μόνο από αυτήν.
      </p>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" type="submit" disabled={isDeleting}>
          {isDeleting ? "Διαγραφή…" : "Ναι, διαγραφή"}
        </Button>
        <Button onClick={() => setIsConfirming(false)}>Άκυρο</Button>
      </div>
    </form>
  );
}
