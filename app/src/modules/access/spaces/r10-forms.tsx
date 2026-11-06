"use client";

import { useKeptForm } from "@/lib/use-kept-form";

import { requestPasswordReset, setPassword } from "../actions";
import type { PasswordContext } from "../password-change";
import { MIN_PASSWORD } from "../schemas";
import { FormMsg } from "./r-msg";

// R10 στη νέα εμφάνιση (prototype `screens/r10-reset.tsx`), με τα ίδια actions με την κλασική.

// Επαναφορά κωδικού: σύνδεσμος στο email.
export function SpacesResetForm() {
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(requestPasswordReset);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="r-form">
      <label>
        <span>Email</span>
        <input
          className="input"
          type="email"
          name="email"
          autoComplete="email"
          required
        />
      </label>
      <FormMsg state={state} />
      <button className="site-button" type="submit" disabled={isPending}>
        {isPending ? "Αποστολή…" : "Στείλτε μου σύνδεσμο"}
      </button>
    </form>
  );
}

function PasswordField({ label, name, isNew = true }: { label: string; name: string; isNew?: boolean }) {
  return (
    <label>
      <span>{label}</span>
      <input
        className="input"
        type="password"
        name={name}
        autoComplete={isNew ? "new-password" : "current-password"}
        minLength={isNew ? MIN_PASSWORD : undefined}
        required
      />
    </label>
  );
}

// Δεν θυμάται τον τωρινό (ή η αλλαγή θέλει πρόσφατη επιβεβαίωση): σύνδεσμος αλλαγής στο δικό του email.
function SendChangeLink({ email }: { email: string }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(requestPasswordReset);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="r-form">
      <p className="r-muted">Δεν θυμάσαι τον τωρινό κωδικό; Σου στέλνουμε σύνδεσμο αλλαγής στο {email}.</p>
      <input type="hidden" name="email" value={email} />
      <FormMsg state={state} />
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? "Αποστολή…" : "Στείλε μου σύνδεσμο αλλαγής"}
      </button>
    </form>
  );
}

// Νέος κωδικός: μετά από πρόσκληση ή επαναφορά («link»), ή αλλαγή από το Προφίλ («profile») με τον τωρινό κωδικό.
export function SpacesSetPasswordForm({ context, email }: { context: PasswordContext; email: string }) {
  const isProfile = context === "profile";
  const { state, isPending, onSubmit, formRef } = useKeptForm(setPassword, { resetOnSuccess: isProfile });
  return (
    <>
      <p className="r-muted">
        Ο κωδικός θέλει τουλάχιστον {MIN_PASSWORD} χαρακτήρες. Δεν υπάρχει άλλος
        κανόνας.
      </p>
      <form ref={formRef} onSubmit={onSubmit} className="r-form">
        {isProfile && <PasswordField label="Τωρινός κωδικός" name="current" isNew={false} />}
        <PasswordField label="Νέος κωδικός" name="password" />
        <PasswordField label="Ξανά ο κωδικός" name="confirm" />
        <FormMsg state={state} />
        <button className="site-button" type="submit" disabled={isPending}>
          {isPending ? "Αποθήκευση…" : isProfile ? "Αλλαγή κωδικού" : "Αποθήκευση και είσοδος"}
        </button>
      </form>
      {isProfile && <SendChangeLink email={email} />}
    </>
  );
}
