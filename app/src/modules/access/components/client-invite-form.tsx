"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useKeptForm } from "@/lib/use-kept-form";

import { inviteClientUser } from "../invitation-actions";

import type { RoleOption } from "./team-invite-form";

// N2/N3 Πρόσκληση Χρήστη πελάτη. Κενός Ρόλος = «Πλήρης». Η λίστα Ρόλων έρχεται έτοιμη από τη σελίδα.
export function ClientInviteForm({ clientId, roles }: { clientId: string; roles: readonly RoleOption[] }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(inviteClientUser, { resetOnSuccess: true });
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <input type="hidden" name="clientId" value={clientId} />
      <Field label="Ονοματεπώνυμο">
        <Input name="name" required maxLength={120} autoComplete="off" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="off" />
      </Field>
      <Field label="Ρόλος">
        <Select name="roleId" defaultValue="">
          <option value="">Πλήρης</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Γλώσσα του email">
        <Select name="locale" defaultValue="el">
          <option value="el">Ελληνικά</option>
          <option value="en">English</option>
        </Select>
      </Field>
      <FormMessage state={state} />
      <Button variant="primary" type="submit" disabled={isPending}>
        {isPending ? "Αποστολή…" : "Πρόσκληση Χρήστη πελάτη"}
      </Button>
    </form>
  );
}
