"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useKeptForm } from "@/lib/use-kept-form";

import { inviteTeamUser } from "../invitation-actions";
import type { DeactivatedTeamUser } from "../invitation-schemas";
import { INITIAL_FORM_STATE } from "../schemas";
import { setUserActive } from "../team-actions";

export interface RoleOption {
  id: string;
  name: string;
}

// Το email ανήκει σε απενεργοποιημένο Χρήστη ομάδας: Επανενεργοποίηση με τους Ρόλους του, με το ίδιο Δικαίωμα.
function ReactivateOffer({ user }: { user: DeactivatedTeamUser }) {
  const [state, action, isSaving] = useActionState(setUserActive, INITIAL_FORM_STATE);
  return (
    <form action={action} className="grid max-w-xl justify-items-start gap-2 rounded-sm border px-3 py-3" role="alert">
      <input type="hidden" name="userId" value={user.userId} />
      <input type="hidden" name="active" value="true" />
      <p className="m-0 text-sm">
        Το email ανήκει στον/στην {user.name}, που έχει απενεργοποιηθεί. Δεν χρειάζεται νέα πρόσκληση: με την
        Επανενεργοποίηση μπαίνει ξανά με τους Ρόλους που είχε.
      </p>
      <FormMessage state={state} />
      {!state.notice && (
        <Button variant="primary" type="submit" disabled={isSaving}>
          {isSaving ? "Αποθήκευση…" : "Επανενεργοποίηση"}
        </Button>
      )}
    </form>
  );
}

// N1 Πρόσκληση: ονοματεπώνυμο, email, γλώσσα email, Ρόλοι (μόνο όσους μπορεί να δώσει ο συνδεδεμένος).
export function TeamInviteForm({ roles }: { roles: readonly RoleOption[] }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(inviteTeamUser, { resetOnSuccess: true });
  return (
    <div className="grid gap-4">
      <form ref={formRef} onSubmit={onSubmit} className="grid max-w-xl gap-4">
        <Field label="Ονοματεπώνυμο">
          <Input name="name" required maxLength={120} autoComplete="off" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required autoComplete="off" />
        </Field>
        <Field label="Γλώσσα του email">
          <Select name="locale" defaultValue="el">
            <option value="el">Ελληνικά</option>
            <option value="en">English</option>
          </Select>
        </Field>
        <fieldset className="grid gap-2">
          <legend className="kit-label mb-1.5">Ρόλοι</legend>
          {roles.length === 0 && (
            <p className="m-0 text-sm text-muted-foreground">Δεν έχεις Ρόλο που να μπορείς να δώσεις.</p>
          )}
          {roles.map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="role" value={role.id} />
              {role.name}
            </label>
          ))}
        </fieldset>
        <FormMessage state={state} />
        <Button variant="primary" type="submit" disabled={isPending || roles.length === 0}>
          {isPending ? "Αποστολή…" : "Πρόσκληση"}
        </Button>
      </form>
      {state.data && <ReactivateOffer key={state.data.userId} user={state.data} />}
    </div>
  );
}
