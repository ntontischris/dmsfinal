"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import type { RoleSummary } from "../queries";
import { INITIAL_FORM_STATE } from "../schemas";
import { setUserRoles } from "../team-actions";
import { FormMessage } from "./form-message";

interface UserRolesFormProps {
  userId: string;
  roles: readonly RoleSummary[];
  current: readonly string[];
  // Ρόλος → γιατί δεν μπορείς να τον δώσεις ή να τον αφαιρέσεις (χωρίς κλιμάκωση).
  locked: Readonly<Record<string, string>>;
}

// N1: οι Ρόλοι ενός Χρήστη ομάδας. Όσους δεν μπορείς να δώσεις τους βλέπεις κλειδωμένους, με τον λόγο.
export function UserRolesForm({
  userId,
  roles,
  current,
  locked,
}: UserRolesFormProps) {
  const [state, action, isSaving] = useActionState(
    setUserRoles,
    INITIAL_FORM_STATE,
  );
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="userId" value={userId} />
      <ul className="m-0 grid list-none gap-1 p-0">
        {roles.map((role) => {
          const reason = locked[role.id];
          const isChecked = current.includes(role.id);
          return (
            <li key={role.id}>
              <label className="flex items-start gap-2 rounded-sm px-2 py-1.5 hover:bg-muted has-disabled:hover:bg-transparent">
                <input
                  type="checkbox"
                  name="role"
                  value={role.id}
                  defaultChecked={isChecked}
                  disabled={Boolean(reason)}
                  className="mt-1 accent-primary"
                />
                <span className="grid">
                  <span className="text-sm font-medium">{role.name}</span>
                  {reason ? (
                    <span className="text-xs text-muted-foreground">
                      Κλειδωμένος: {reason}
                    </span>
                  ) : (
                    role.description && (
                      <span className="text-xs text-muted-foreground">
                        {role.description}
                      </span>
                    )
                  )}
                </span>
              </label>
              {/* Ένα κλειδωμένο κουτί δεν στέλνεται με τη φόρμα· ο Ρόλος που ήδη έχει μένει όπως είναι. */}
              {reason && isChecked && (
                <input type="hidden" name="role" value={role.id} />
              )}
            </li>
          );
        })}
      </ul>
      <FormMessage state={state} />
      <div>
        <Button variant="primary" type="submit" disabled={isSaving}>
          {isSaving ? "Αποθήκευση…" : "Αποθήκευση Ρόλων"}
        </Button>
      </div>
    </form>
  );
}
