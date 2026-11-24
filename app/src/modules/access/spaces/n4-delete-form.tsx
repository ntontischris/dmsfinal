"use client";

import Link from "next/link";
import { useActionState } from "react";

import { INITIAL_FORM_STATE } from "../schemas";
import type { RoleSummary } from "../queries";
import { deleteRole } from "../team-actions";
import type { MoveTarget } from "./n4-adapter";

interface Move {
  // «Μετακίνησε τους 3 σε…»
  label: string;
  // «3 Χρήστες ομάδας και 1 ανοιχτή πρόσκληση»
  usage: string;
  targets: readonly MoveTarget[];
}

interface DeleteRoleConfirmProps {
  role: RoleSummary;
  backHref: string;
  // null = δεν τον έχει κανείς· αλλιώς πού πάνε όσοι τον έχουν.
  move: Move | null;
}

// Η επιβεβαίωση της διαγραφής (deleteRole → role_delete). Η βάση ξαναμετρά και μετακινεί στην ίδια συναλλαγή.
export function DeleteRoleConfirm({
  role,
  backHref,
  move,
}: DeleteRoleConfirmProps) {
  const [state, action, isDeleting] = useActionState(
    deleteRole,
    INITIAL_FORM_STATE,
  );
  const submitLabel = move ? "Μετακίνηση και διαγραφή" : "Ναι, διαγραφή";
  return (
    <form
      action={action}
      className="n-confirm"
      role="alertdialog"
      aria-label="Επιβεβαίωση"
    >
      <h2 className="ml-box-title">Διαγραφή: {role.name}</h2>
      <input type="hidden" name="id" value={role.id} />
      {move ? (
        <>
          <p>
            Τον Ρόλο «{role.name}» τον έχουν {move.usage}. Πρώτα πάνε όλα σε
            άλλον Ρόλο, και μετά ο «{role.name}» διαγράφεται. Γράφεται στο
            Ίχνος.
          </p>
          <div className="ml-fields">
            <label className="ml-field">
              <span>{move.label}</span>
              <select className="input" name="moveTo" required defaultValue="">
                <option value="" disabled>
                  Διάλεξε Ρόλο
                </option>
                {move.targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      ) : (
        <p>
          Να διαγραφεί ο Ρόλος «{role.name}»; Δεν τον έχει κανείς. Η διαγραφή
          γράφεται στο Ίχνος.
        </p>
      )}
      <div className="ml-actions">
        {state.error && (
          <small className="n-msg n-warn" role="alert">
            {state.error}
          </small>
        )}
        <Link href={backHref}>Άκυρο</Link>
        <button type="submit" data-danger="true" disabled={isDeleting}>
          {isDeleting ? "Διαγραφή…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
