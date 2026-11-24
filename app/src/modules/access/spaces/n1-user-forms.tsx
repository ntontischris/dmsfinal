"use client";

import Link from "next/link";
import { useActionState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import { INITIAL_FORM_STATE, type FormState } from "../schemas";
import { setUserActive, setUserRoles } from "../team-actions";
import type { PickerRole } from "./n1-adapter";
import { RolePicker } from "./n1-roles";

function Message({ state }: { state: FormState<unknown> }) {
  if (!state.error && !state.notice) return null;
  return (
    <p className="muted" role={state.error ? "alert" : "status"}>
      {state.error ?? state.notice}
    </p>
  );
}

interface ChangeRolesFormProps {
  userId: string;
  roles: readonly PickerRole[];
  selected: readonly string[];
}

// «Αλλαγή Ρόλων» με την πραγματική ενέργεια (setUserRoles): η βάση ελέγχει «χωρίς κλιμάκωση» και γράφει στο Ίχνος.
export function ChangeRolesForm({
  userId,
  roles,
  selected,
}: ChangeRolesFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(setUserRoles);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="n1-form">
      <input type="hidden" name="userId" value={userId} />
      <RolePicker roles={roles} idPrefix="n1-edit" selected={selected} />
      <div className="ml-actions">
        <Message state={state} />
        <button type="submit" data-primary disabled={isPending}>
          {isPending ? "Αποθήκευση…" : "Αποθήκευση Ρόλων"}
        </button>
      </div>
    </form>
  );
}

interface ActiveFormProps {
  userId: string;
  // Μετά την επιτυχία: πίσω στη σελίδα του Χρήστη (χωρίς ?confirm).
  backHref?: string;
}

// Επανενεργοποίηση με τους ίδιους Ρόλους (setUserActive).
export function ReactivateButton({ userId }: ActiveFormProps) {
  const [state, action, isSaving] = useActionState(
    setUserActive,
    INITIAL_FORM_STATE,
  );
  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value="true" />
      <div className="ml-actions">
        <Message state={state} />
        <button type="submit" data-primary disabled={isSaving}>
          {isSaving ? "Αποθήκευση…" : "Επανενεργοποίηση"}
        </button>
      </div>
    </form>
  );
}

// «Ναι, απενεργοποίηση» της επιβεβαίωσης (setUserActive). Μετά την επιτυχία μένει μόνο το μήνυμα και η επιστροφή.
export function DeactivateButtons({ userId, backHref = "" }: ActiveFormProps) {
  const [state, action, isSaving] = useActionState(
    setUserActive,
    INITIAL_FORM_STATE,
  );
  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value="false" />
      <Message state={state} />
      <div className="ml-actions">
        <Link href={backHref}>
          {state.notice ? "Πίσω στον Χρήστη" : "Άκυρο"}
        </Link>
        {!state.notice && (
          <button type="submit" data-danger disabled={isSaving}>
            {isSaving ? "Αποθήκευση…" : "Ναι, απενεργοποίηση"}
          </button>
        )}
      </div>
    </form>
  );
}
