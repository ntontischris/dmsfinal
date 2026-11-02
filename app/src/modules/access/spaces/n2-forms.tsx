"use client";

import { useActionState, useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import { removeClientUser } from "../client-user-actions";
import {
  cancelInvitation,
  inviteClientUser,
  resendInvitation,
} from "../invitation-actions";
import { INITIAL_FORM_STATE, type FormState } from "../schemas";

// Οι φόρμες της N2/N3 (prototype `screens/n2-invites.tsx`, `n2-remove.tsx`) με τις πραγματικές ενέργειες της κλασικής.

export function N2Message({ state }: { state: FormState<unknown> }) {
  if (state.error)
    return (
      <p className="note n2-warn" role="alert">
        {state.error}
      </p>
    );
  if (state.notice)
    return (
      <p className="note" role="status">
        {state.notice}
      </p>
    );
  return null;
}

interface InviteFormProps {
  title: string;
  clientId: string;
  clientName: string;
  roles: readonly { id: string; name: string }[];
  footnote: string;
}

// Πρόσκληση Χρήστη πελάτη. Κενός Ρόλος = «Πλήρης»· η λίστα Ρόλων έρχεται φιλτραρισμένη από τη βάση.
export function N2InviteForm(props: InviteFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(
    inviteClientUser,
    { resetOnSuccess: true },
  );
  return (
    <section className="card n2-section" aria-labelledby="n2-invite">
      <div className="card-title">
        <h2 id="n2-invite">{props.title}</h2>
      </div>
      <form ref={formRef} onSubmit={onSubmit} className="stack">
        <input type="hidden" name="clientId" value={props.clientId} />
        <label className="n2-field">
          <span>Ονοματεπώνυμο</span>
          <input
            className="input"
            name="name"
            required
            maxLength={120}
            autoComplete="off"
            placeholder="π.χ. Χαρά Τσολάκη"
          />
        </label>
        <label className="n2-field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            name="email"
            required
            autoComplete="off"
            placeholder="π.χ. chara@example.com"
          />
        </label>
        <label className="n2-field">
          <span>Ρόλος πελάτη</span>
          <select className="select" name="roleId" defaultValue="">
            <option value="">Πλήρης</option>
            {props.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label className="n2-field">
          <span>Γλώσσα email</span>
          <select className="select" name="locale" defaultValue="el">
            <option value="el">Ελληνικά</option>
            <option value="en">English</option>
          </select>
        </label>
        <p className="note">
          Ο σύνδεσμος ισχύει 7 μέρες. Ο Χρήστης μπαίνει στον Πελάτη «
          {props.clientName}».
        </p>
        <p className="note n2-help" role="note">
          Αν το email είναι ήδη Χρήστης πελάτη άλλου Πελάτη, δεν φτιάχνεται νέος
          λογαριασμός: προστίθεται εδώ και παίρνει email «προστέθηκες».
        </p>
        <N2Message state={state} />
        <button
          className="button"
          data-primary="true"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Αποστολή…" : "Αποστολή πρόσκλησης"}
        </button>
        <p className="muted">{props.footnote}</p>
      </form>
    </section>
  );
}

// Επαναποστολή (και για λήξη) και ακύρωση μιας πρόσκλησης σε αναμονή.
export function N2InvitationButtons(props: { id: string; canCancel: boolean }) {
  const [resend, resendAction, isResending] = useActionState(
    resendInvitation,
    INITIAL_FORM_STATE,
  );
  const [cancel, cancelAction, isCancelling] = useActionState(
    cancelInvitation,
    INITIAL_FORM_STATE,
  );
  return (
    <>
      <div className="btn-row n2-actions">
        <form action={resendAction}>
          <input type="hidden" name="id" value={props.id} />
          <button className="button" type="submit" disabled={isResending}>
            Επαναποστολή
          </button>
        </form>
        {props.canCancel && (
          <form action={cancelAction}>
            <input type="hidden" name="id" value={props.id} />
            <button
              className="button"
              data-danger="true"
              type="submit"
              disabled={isCancelling}
            >
              Ακύρωση
            </button>
          </form>
        )}
      </div>
      <N2Message state={resend.error || resend.notice ? resend : cancel} />
    </>
  );
}

interface RemoveProps {
  clientId: string;
  clientName: string;
  userId: string;
  name: string;
  // Η σημείωση κάτω από την ερώτηση (N3: «ειδοποιείται η ομάδα»).
  note?: string;
}

// Αφαίρεση σε δύο βήματα (prototype `RemoveConfirm`): πρώτα ερώτηση, μετά η ενέργεια. Το αν κλείνει ο λογαριασμός
// και αν ήταν Υπογράφων το λέει η απάντηση της βάσης.
export function N2RemoveButton(props: RemoveProps) {
  const [state, action, isSaving] = useActionState(
    removeClientUser,
    INITIAL_FORM_STATE,
  );
  const [isConfirming, setIsConfirming] = useState(false);
  if (!isConfirming || state.notice)
    return (
      <>
        <div className="btn-row n2-actions">
          {!state.notice && (
            <button
              className="button"
              data-danger="true"
              type="button"
              onClick={() => setIsConfirming(true)}
            >
              Αφαίρεση
            </button>
          )}
        </div>
        <N2Message state={state} />
      </>
    );
  return (
    <form
      action={action}
      className="n2-confirm"
      role="alertdialog"
      aria-label={`Αφαίρεση ${props.name}`}
    >
      <input type="hidden" name="clientId" value={props.clientId} />
      <input type="hidden" name="userId" value={props.userId} />
      <h3>
        Αφαίρεση {props.name} από τον Πελάτη «{props.clientName}»;
      </h3>
      <p>
        Ο Χρήστης πελάτη βγαίνει από τον Πελάτη «{props.clientName}»: δεν βλέπει
        πια Συμφωνίες, Παραγωγές, Οικονομικά και Συνομιλία του. Αν δεν ανήκει σε
        άλλον Πελάτη, ο λογαριασμός του κλείνει.
      </p>
      {props.note && <p className="note">{props.note}</p>}
      <N2Message state={state} />
      <div className="btn-row">
        <button
          className="button"
          data-danger="true"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? "Αφαίρεση…" : "Ναι, αφαίρεση"}
        </button>
        <button
          className="button"
          type="button"
          onClick={() => setIsConfirming(false)}
        >
          Άκυρο
        </button>
      </div>
    </form>
  );
}
