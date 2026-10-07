"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import { INITIAL_FORM_STATE } from "../schemas";
import { deleteRole } from "../team-actions";
import { FormMessage } from "./form-message";

// Διαγραφή Ρόλου σε δύο βήματα. Γίνεται μόνο όταν δεν τον έχει κανείς (το ελέγχει και η βάση).
export function DeleteRoleForm({
  roleId,
  roleName,
}: {
  roleId: string;
  roleName: string;
}) {
  const [state, action, isDeleting] = useActionState(
    deleteRole,
    INITIAL_FORM_STATE,
  );
  const [isConfirming, setIsConfirming] = useState(false);
  if (!isConfirming)
    return (
      <Button variant="danger" onClick={() => setIsConfirming(true)}>
        Διαγραφή Ρόλου
      </Button>
    );
  return (
    <form
      action={action}
      role="alertdialog"
      aria-label="Επιβεβαίωση διαγραφής"
      className="grid justify-items-start gap-2"
    >
      <input type="hidden" name="id" value={roleId} />
      <p className="m-0 text-sm">
        Ο Ρόλος «{roleName}» θα διαγραφεί. Η διαγραφή γράφεται στο Ίχνος.
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
