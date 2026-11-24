"use client";

import { useActionState, useState } from "react";

import { removeClientUser } from "../client-user-actions";
import { cancelInvitation, resendInvitation } from "../invitation-actions";
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
