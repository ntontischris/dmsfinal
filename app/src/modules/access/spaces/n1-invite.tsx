"use client";

import { useActionState } from "react";

import { fmtDate } from "@/spaces/screens/shared";

import {
  cancelInvitation,
  resendInvitation,
} from "../invitation-actions";
import type { DeactivatedTeamUser } from "../invitation-schemas";
import { INITIAL_FORM_STATE, type FormState } from "../schemas";
import { setUserActive } from "../team-actions";
import type { N1Invitation } from "./n1-adapter";
import { Line, ListSection } from "./n-parts";

export function InviteMessage({ state }: { state: FormState<unknown> }) {
  if (state.error)
    return (
      <small className="n-msg n-warn" role="alert">
        {state.error}
      </small>
    );
  if (state.notice)
    return (
      <small className="n-msg" role="status">
        {state.notice}
      </small>
    );
  return null;
}

// Το email ανήκει σε απενεργοποιημένο Χρήστη ομάδας: Επανενεργοποίηση με τους Ρόλους του, αντί για νέα πρόσκληση.
export function ReactivateOffer({ user }: { user: DeactivatedTeamUser }) {
  const [state, action, isSaving] = useActionState(
    setUserActive,
    INITIAL_FORM_STATE,
  );
  return (
    <form action={action} className="n1-form n1-section" role="alert">
      <input type="hidden" name="userId" value={user.userId} />
      <input type="hidden" name="active" value="true" />
      <p className="n1-help">
        Το email ανήκει στον/στην {user.name}, που έχει απενεργοποιηθεί. Δεν
        στέλνεται πρόσκληση: με την Επανενεργοποίηση μπαίνει ξανά με τους Ρόλους
        που είχε.
      </p>
      <InviteMessage state={state} />
      {!state.notice && (
        <div className="ml-actions">
          <button type="submit" data-primary disabled={isSaving}>
            {isSaving ? "Αποθήκευση…" : "Επανενεργοποίηση"}
          </button>
        </div>
      )}
    </form>
  );
}

// Επαναποστολή (και για λήξη) και ακύρωση μιας εκκρεμούς πρόσκλησης, με τις πραγματικές ενέργειες.
function InvitationButtons({ invitation }: { invitation: N1Invitation }) {
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
      <form action={resendAction}>
        <input type="hidden" name="id" value={invitation.id} />
        <button type="submit" disabled={isResending}>
          Επαναποστολή
        </button>
      </form>
      {invitation.state === "εκκρεμεί" && (
        <form action={cancelAction}>
          <input type="hidden" name="id" value={invitation.id} />
          <button type="submit" data-danger disabled={isCancelling}>
            Ακύρωση
          </button>
        </form>
      )}
      <InviteMessage state={resend.error || resend.notice ? resend : cancel} />
    </>
  );
}

export function InvitationList({
  invitations,
}: {
  invitations: readonly N1Invitation[];
}) {
  return (
    <ListSection
      title="Προσκλήσεις σε εκκρεμότητα"
      hint="Επαναποστολή = νέος σύνδεσμος 7 ημερών, ο παλιός ακυρώνεται. Μια ληγμένη πρόσκληση μένει εδώ 30 μέρες."
    >
      {invitations.length === 0 ? (
        <p className="ml-empty">Καμία πρόσκληση σε εκκρεμότητα.</p>
      ) : (
        <ul className="ml-list">
          {invitations.map((inv) => (
            <Line
              key={inv.id}
              name={inv.name}
              tag={inv.state}
              title={inv.name}
              sub={
                <span className="n1-email">
                  {inv.email} · {inv.roles} · από {inv.invitedBy} · στάλθηκε{" "}
                  {fmtDate(inv.sentAt)} ·{" "}
                  {inv.state === "έληξε" ? "έληξε" : "λήγει"}{" "}
                  {fmtDate(inv.expiresAt)}
                </span>
              }
              isUrgent={inv.state === "έληξε"}
              quick={<InvitationButtons invitation={inv} />}
            />
          ))}
        </ul>
      )}
    </ListSection>
  );
}
