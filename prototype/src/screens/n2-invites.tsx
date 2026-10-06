import type { Invitation, RoleDef } from "@/data/team";
import { invitationState, roleNames } from "@/data/team-access";
import { Badge, fmtDate } from "@/screens/shared";

import "./n2.css";

// Κοινά για N2 (η ομάδα) και N3 (ο πελάτης): φόρμα πρόσκλησης και εκκρεμείς προσκλήσεις.

interface InviteFormProps {
  title: string;
  roles: readonly RoleDef[];
  // Ρόλοι που φαίνονται αλλά δεν δίνονται (N3: ξεπερνούν τον δικό σου).
  lockedRoles?: readonly RoleDef[];
  clientName: string;
  footnote: string;
}

const DEFAULT_CLIENT_ROLE = "client-full";

export function InviteForm(props: InviteFormProps) {
  return (
    <section className="card n2-section" aria-labelledby="n2-invite">
      <div className="card-title">
        <h2 id="n2-invite">{props.title}</h2>
      </div>
      <form className="stack" action="#">
        <label className="n2-field">
          Ονοματεπώνυμο
          <input
            className="input"
            name="name"
            placeholder="π.χ. Χαρά Τσολάκη"
          />
        </label>
        <label className="n2-field">
          Email
          <input
            className="input"
            type="email"
            name="email"
            placeholder="π.χ. chara@example.com"
          />
        </label>
        <label className="n2-field">
          Ρόλος πελάτη
          <select
            className="select"
            name="roleId"
            defaultValue={DEFAULT_CLIENT_ROLE}
          >
            {props.roles.map((def) => (
              <option key={def.id} value={def.id}>
                {def.name}
              </option>
            ))}
            {(props.lockedRoles ?? []).map((def) => (
              <option key={def.id} value={def.id} disabled>
                {def.name} (ξεπερνά τον δικό σου Ρόλο)
              </option>
            ))}
          </select>
        </label>
        <label className="n2-field">
          Γλώσσα email
          <select className="select" name="lang" defaultValue="el">
            <option value="el">Ελληνικά</option>
            <option value="en">English</option>
          </select>
        </label>
        <p className="note">
          Ο σύνδεσμος ισχύει 7 μέρες. Ο Χρήστης μπαίνει στον Πελάτη «
          {props.clientName}».
        </p>
        <p className="note n2-help" role="note">
          Παράδειγμα σφάλματος: «Αυτό το email ανήκει σε Χρήστη ομάδας· ένας
          Χρήστης δεν έχει και τα δύο είδη». Αν το email είναι ήδη Χρήστης
          πελάτη άλλου Πελάτη, δεν φτιάχνεται νέος λογαριασμός: προστίθεται εδώ
          και παίρνει email «προστέθηκες».
        </p>
        <button className="button" data-primary="true" type="button">
          Αποστολή πρόσκλησης
        </button>
        <p className="muted">{props.footnote}</p>
      </form>
    </section>
  );
}

interface PendingProps {
  invitations: readonly Invitation[];
  labelOf: (invitedBy: string) => string;
}

function PendingRow({
  inv,
  labelOf,
}: {
  inv: Invitation;
  labelOf: (invitedBy: string) => string;
}) {
  const state = invitationState(inv);
  const isExpired = state === "έληξε";
  return (
    <li className="n2-item">
      <div className="row">
        <strong>{inv.name}</strong>
        <Badge tone={isExpired ? "attention" : undefined}>{state}</Badge>
      </div>
      <div className="muted n2-wrap">
        {inv.email} · Ρόλος πελάτη: {roleNames(inv.roleIds)}
      </div>
      <div className="muted">
        Στάλθηκε {fmtDate(inv.sentAt)} {labelOf(inv.invitedBy)} ·{" "}
        {isExpired ? "έληξε" : "λήγει"} {fmtDate(inv.expiresAt)}
      </div>
      <div className="btn-row n2-actions">
        <button className="button" type="button">
          Επαναποστολή
        </button>
        {!isExpired && (
          <button className="button" data-danger="true" type="button">
            Ακύρωση
          </button>
        )}
      </div>
    </li>
  );
}

export function PendingInvitations({ invitations, labelOf }: PendingProps) {
  return (
    <section className="card n2-section" aria-labelledby="n2-pending">
      <div className="card-title">
        <h2 id="n2-pending">Προσκλήσεις σε αναμονή</h2>
        <Badge>{invitations.length}</Badge>
      </div>
      {invitations.length === 0 ? (
        <p className="muted">Δεν υπάρχουν προσκλήσεις σε αναμονή.</p>
      ) : (
        <ul className="list">
          {invitations.map((inv) => (
            <PendingRow key={inv.id} inv={inv} labelOf={labelOf} />
          ))}
        </ul>
      )}
      <p className="note">
        Επαναποστολή: νέος σύνδεσμος 7 ημερών, ο παλιός ακυρώνεται. Μια ληγμένη
        πρόσκληση μένει εδώ 30 μέρες.
      </p>
    </section>
  );
}
