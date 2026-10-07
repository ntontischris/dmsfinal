"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import { INITIAL_FORM_STATE } from "../schemas";
import { setUserActive } from "../team-actions";
import { FormMessage } from "./form-message";

// N1: απενεργοποίηση (σε δύο βήματα) ή επανενεργοποίηση ενός Χρήστη ομάδας. Δεν διαγράφεται ποτέ.
export function UserActiveForm({
  userId,
  name,
  isActive,
}: {
  userId: string;
  name: string;
  isActive: boolean;
}) {
  const [state, action, isSaving] = useActionState(
    setUserActive,
    INITIAL_FORM_STATE,
  );
  const [isConfirming, setIsConfirming] = useState(false);

  if (isActive && !isConfirming)
    return (
      <div className="grid justify-items-start gap-2">
        <FormMessage state={state} />
        <Button variant="danger" onClick={() => setIsConfirming(true)}>
          Απενεργοποίηση
        </Button>
      </div>
    );

  return (
    <form
      action={action}
      className="grid justify-items-start gap-2"
      role={isActive ? "alertdialog" : undefined}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />
      {isActive ? (
        <p className="m-0 text-sm">
          Ο/Η {name} χάνει αμέσως κάθε πρόσβαση. Το όνομά του μένει στο ιστορικό
          και οι Ρόλοι του κρατιούνται για μια πιθανή επανενεργοποίηση.
        </p>
      ) : (
        <p className="m-0 text-sm text-muted-foreground">
          Επανενεργοποίηση με τους ίδιους Ρόλους.
        </p>
      )}
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <Button
          variant={isActive ? "danger" : "primary"}
          type="submit"
          disabled={isSaving}
        >
          {isSaving
            ? "Αποθήκευση…"
            : isActive
              ? "Ναι, απενεργοποίηση"
              : "Επανενεργοποίηση"}
        </Button>
        {isActive && (
          <Button onClick={() => setIsConfirming(false)}>Άκυρο</Button>
        )}
      </div>
    </form>
  );
}
