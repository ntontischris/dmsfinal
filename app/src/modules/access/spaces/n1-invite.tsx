"use client";

import { useActionState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";
import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import {
  cancelInvitation,
  inviteTeamUser,
  resendInvitation,
} from "../invitation-actions";
import type { DeactivatedTeamUser } from "../invitation-schemas";
import { INITIAL_FORM_STATE, type FormState } from "../schemas";
import { setUserActive } from "../team-actions";
import type { N1Invitation, PickerRole } from "./n1-adapter";
import { RolePicker } from "./n1-roles";

function Message({ state }: { state: FormState<unknown> }) {
  if (state.error)
    return (
      <p className="note" role="alert">
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

// Το email ανήκει σε απενεργοποιημένο Χρήστη ομάδας: Επανενεργοποίηση με τους Ρόλους του, αντί για νέα πρόσκληση.
function ReactivateOffer({ user }: { user: DeactivatedTeamUser }) {
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
      <Message state={state} />
      {!state.notice && (
        <div className="btn-row">
          <button
            type="submit"
            className="button"
            data-primary
            disabled={isSaving}
          >
            {isSaving ? "Αποθήκευση…" : "Επανενεργοποίηση"}
          </button>
        </div>
      )}
    </form>
  );
}

interface InviteFormProps {
  roles: readonly PickerRole[];
  isOwner: boolean;
}

// N1 Πρόσκληση Χρήστη ομάδας (prototype `screens/n1-invite.tsx`), σταλμένη από την πραγματική ενέργεια (inviteTeamUser).
export function InviteForm({ roles, isOwner }: InviteFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(inviteTeamUser, {
    resetOnSuccess: true,
  });
  const grantable = roles.filter((role) => role.reason === null);
  return (
    <div id="n1-invite">
      <Panel label="Πρόσκληση Χρήστη">
        <form ref={formRef} onSubmit={onSubmit} className="n1-form">
          <div className="n1-field">
            <label htmlFor="n1-inv-name">Ονοματεπώνυμο</label>
            <input
              id="n1-inv-name"
              className="input"
              name="name"
              required
              maxLength={120}
              autoComplete="off"
            />
          </div>
          <div className="n1-field">
            <label htmlFor="n1-inv-email">Email</label>
            <input
              id="n1-inv-email"
              className="input"
              type="email"
              name="email"
              required
              autoComplete="off"
            />
            <p className="muted">
              Αν το email ανήκει σε απενεργοποιημένο Χρήστη ομάδας, δεν
              στέλνεται πρόσκληση: προτείνεται Επανενεργοποίηση.
            </p>
          </div>
          <RolePicker roles={grantable} idPrefix="n1-inv" selected={[]} />
          <div className="n1-field">
            <label htmlFor="n1-inv-lang">Γλώσσα πρόσκλησης</label>
            <select
              id="n1-inv-lang"
              className="input"
              name="locale"
              defaultValue="el"
            >
              <option value="el">Ελληνικά</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="btn-row">
            <button
              type="submit"
              className="button"
              data-primary="true"
              disabled={isPending || grantable.length === 0}
            >
              {isPending ? "Αποστολή…" : "Αποστολή πρόσκλησης"}
            </button>
            <Message state={state} />
          </div>
        </form>
        {state.data && (
          <ReactivateOffer key={state.data.userId} user={state.data} />
        )}
        <p className="note">
          Ο σύνδεσμος της πρόσκλησης ισχύει 7 μέρες. Δίνεις μόνο Ρόλους που δεν
          ξεπερνούν τα δικά σου Δικαιώματα· τον Ρόλο Ιδιοκτήτης τον δίνει μόνο ο
          Ιδιοκτήτης.
        </p>
        <p className="note">
          {isOwner
            ? "Όταν άλλος (π.χ. η Διαχείριση) προσκαλεί ή αλλάζει Ρόλους, παίρνεις Ειδοποίηση («Αλλαγή πρόσβασης ομάδας»)."
            : "Ο Ιδιοκτήτης παίρνει Ειδοποίηση για κάθε πρόσκληση ή αλλαγή Ρόλων που κάνεις («Αλλαγή πρόσβασης ομάδας»)."}
        </p>
      </Panel>
    </div>
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
        <button type="submit" className="button" disabled={isResending}>
          Επαναποστολή
        </button>
      </form>
      {invitation.state === "εκκρεμεί" && (
        <form action={cancelAction}>
          <input type="hidden" name="id" value={invitation.id} />
          <button
            type="submit"
            className="button"
            data-danger
            disabled={isCancelling}
          >
            Ακύρωση
          </button>
        </form>
      )}
      <Message state={resend.error || resend.notice ? resend : cancel} />
    </>
  );
}

export function InvitationList({
  invitations,
}: {
  invitations: readonly N1Invitation[];
}) {
  return (
    <Panel label="Προσκλήσεις σε εκκρεμότητα">
      {invitations.length === 0 ? (
        <p className="muted">Καμία πρόσκληση σε εκκρεμότητα.</p>
      ) : (
        <div className="n1-bleed">
          <RowList>
            {invitations.map((inv) => (
              <ListRow
                key={inv.id}
                lead={<Avatar name={inv.name} size={36} />}
                title={
                  <>
                    {inv.name}{" "}
                    <span className="n1-email muted">{inv.email}</span>
                  </>
                }
                sub={`${inv.roles} · από ${inv.invitedBy} · στάλθηκε ${fmtDate(inv.sentAt)} · ${inv.state === "έληξε" ? "έληξε" : "λήγει"} ${fmtDate(inv.expiresAt)}`}
                aside={
                  <>
                    <Badge
                      tone={inv.state === "έληξε" ? "attention" : "waiting"}
                    >
                      {inv.state}
                    </Badge>
                    <InvitationButtons invitation={inv} />
                  </>
                }
              />
            ))}
          </RowList>
        </div>
      )}
      <p className="note">
        Επαναποστολή = νέος σύνδεσμος 7 ημερών, ο παλιός ακυρώνεται. Μια ληγμένη
        πρόσκληση μένει εδώ 30 μέρες.
      </p>
    </Panel>
  );
}
