"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useKeptForm } from "@/lib/use-kept-form";

import { inviteTeamUser } from "../invitation-actions";

export interface RoleOption {
  id: string;
  name: string;
}

// N1 Πρόσκληση: ονοματεπώνυμο, email, γλώσσα email, Ρόλοι (μόνο όσους μπορεί να δώσει ο συνδεδεμένος).
export function TeamInviteForm({ roles }: { roles: readonly RoleOption[] }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(inviteTeamUser, { resetOnSuccess: true });
  return (
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
  );
}
