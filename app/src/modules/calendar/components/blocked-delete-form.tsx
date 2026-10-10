"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { useKeptForm } from "@/lib/use-kept-form";

import { deleteBlockedTime } from "../actions-blocked";

// Διαγραφή κλεισμένου χρόνου: πρώτα επιβεβαίωση, μετά η κλήση. Δεν αναιρείται.

export function BlockedDeleteForm({ id, day }: { id: string; day: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(deleteBlockedTime);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid max-w-xl gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="day" value={day} />
      {isConfirming ? (
        <div className="grid gap-2" role="alert">
          <p className="m-0 text-sm">
            Ο κλεισμένος χρόνος θα σβηστεί. Δεν αναιρείται.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="danger" disabled={isPending}>
              {isPending ? "Διαγραφή…" : "Διαγραφή τώρα"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsConfirming(false)}
            >
              Άκυρο
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button
            type="button"
            variant="danger"
            onClick={() => setIsConfirming(true)}
          >
            Διαγραφή
          </Button>
        </div>
      )}
      <FormMessage state={state} />
    </form>
  );
}
