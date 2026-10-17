"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

import {
  assignmentGroups,
  BLOCK_TEXT,
  type DeactivationPreview,
} from "../deactivation";
import { INITIAL_FORM_STATE } from "../schemas";
import { setUserActive } from "../team-actions";

interface UserActiveFormProps {
  userId: string;
  name: string;
  isActive: boolean;
  // Από τη βάση (team_deactivation_preview)· null όταν δεν φόρτωσε.
  preview: DeactivationPreview | null;
}

// Τι επιστρέφει για νέα ανάθεση, ονομαστικά, όπως το λέει η βάση.
function AssignmentList({ preview }: { preview: DeactivationPreview }) {
  const groups = assignmentGroups(preview.items);
  if (groups.length === 0)
    return (
      <p className="m-0 text-sm text-muted-foreground">
        Καμία ανοιχτή ανάθεση.
      </p>
    );
  return (
    <ul className="m-0 grid list-none gap-3 p-0 text-sm">
      {groups.map((group) => (
        <li key={group.kind} className="grid gap-1">
          <span className="font-medium">{group.title}</span>
          <ul className="m-0 grid gap-0.5 pl-5 text-muted-foreground">
            {group.names.map((itemName, index) => (
              <li key={`${index}-${itemName}`}>{itemName}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

// N1: απενεργοποίηση σε δύο βήματα (πρώτα τι θα επιστρέψει, μετά η επιβεβαίωση) ή επανενεργοποίηση. Δεν διαγράφεται ποτέ.
export function UserActiveForm({
  userId,
  name,
  isActive,
  preview,
}: UserActiveFormProps) {
  const [state, action, isSaving] = useActionState(
    setUserActive,
    INITIAL_FORM_STATE,
  );
  const [isConfirming, setIsConfirming] = useState(false);

  if (isActive && !preview)
    return (
      <p className="m-0 text-sm text-destructive">
        Δεν φόρτωσε τι θα επιστρέψει η απενεργοποίηση. Δοκίμασε ξανά.
      </p>
    );

  if (isActive && preview?.block)
    return (
      <div className="grid gap-1" role="alert">
        <p className="m-0 text-sm font-medium">Δεν γίνεται η Απενεργοποίηση</p>
        <p className="m-0 text-sm text-muted-foreground">
          {BLOCK_TEXT[preview.block]}
        </p>
      </div>
    );

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
      className="grid justify-items-start gap-3"
      role={isActive ? "alertdialog" : undefined}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />
      {isActive && preview ? (
        <>
          <p className="m-0 text-sm">Επιστρέφουν για νέα ανάθεση:</p>
          <AssignmentList preview={preview} />
          <p className="m-0 text-sm text-muted-foreground">
            Ο/Η {name} χάνει αμέσως κάθε πρόσβαση και ο Σύνδεσμος ημερολογίου
            παύει. Το όνομά του μένει στο ιστορικό. Με Επανενεργοποίηση κρατά
            τους Ρόλους του, αλλά οι αναθέσεις δεν επιστρέφουν.
          </p>
        </>
      ) : (
        <p className="m-0 text-sm text-muted-foreground">
          Επανενεργοποίηση με τους ίδιους Ρόλους. Οι αναθέσεις που είχε δεν
          επιστρέφουν.
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
