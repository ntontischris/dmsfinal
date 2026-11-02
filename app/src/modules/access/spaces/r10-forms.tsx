"use client";

import { useKeptForm } from "@/lib/use-kept-form";

import { requestPasswordReset, setPassword } from "../actions";
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

// Νέος κωδικός: μετά από πρόσκληση ή επαναφορά.
export function SpacesSetPasswordForm() {
  const { state, isPending, onSubmit, formRef } = useKeptForm(setPassword);
  return (
    <>
      <p className="r-muted">
        Ο κωδικός θέλει τουλάχιστον {MIN_PASSWORD} χαρακτήρες. Δεν υπάρχει άλλος
        κανόνας.
      </p>
      <form ref={formRef} onSubmit={onSubmit} className="r-form">
        <label>
          <span>Νέος κωδικός</span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            required
          />
        </label>
        <label>
          <span>Ξανά ο κωδικός</span>
          <input
            className="input"
            type="password"
            name="confirm"
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            required
          />
        </label>
        <FormMsg state={state} />
        <button className="site-button" type="submit" disabled={isPending}>
          {isPending ? "Αποθήκευση…" : "Αποθήκευση και είσοδος"}
        </button>
      </form>
    </>
  );
}
