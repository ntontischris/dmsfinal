import Link from "next/link";

import type { RoleId } from "@/data/roles";
import {
  CURRENT_CLIENT_USER,
  type ClientMembership,
  type RoleDef,
} from "@/data/team";
import { clientRoles, findRoleDef, invitedByLabel } from "@/data/team-access";
import { SignatoryWarning } from "@/screens/n2-remove";
import {
  clientNameOf,
  isSignatoryAt,
  personName,
  roleNameOf,
} from "@/screens/n2-members";
import { Badge, fmtDate, screenHref } from "@/screens/shared";

import "./n2.css";

// Ο πελάτης δεν βλέπει ποιο μέλος ομάδας προσκάλεσε: μόνο «από την ομάδα της Delta Films».
export const colleagueInvitedBy = (invitedBy: string): string =>
  invitedBy === "system" || invitedBy.includes("@")
    ? invitedByLabel(invitedBy)
    : "από την ομάδα της Delta Films";

// Ρόλοι πελάτη που δεν ξεπερνούν τον δικό μου.
const isWithin = (def: RoleDef, mine: RoleDef | undefined): boolean =>
  Object.keys(def.grants).every((perm) => perm in (mine?.grants ?? {}));

export const splitGrantable = (myRoleId: string) => {
  const mine = findRoleDef(myRoleId);
  return {
    allowed: clientRoles().filter((def) => isWithin(def, mine)),
    locked: clientRoles().filter((def) => !isWithin(def, mine)),
  };
};

function ColleagueRow({ role, m }: { role: RoleId; m: ClientMembership }) {
  const isMe = m.email === CURRENT_CLIENT_USER;
  return (
    <li className="n2-item">
      <div className="row">
        <strong>
          {personName(m.email)} {isMe && <Badge tone="strong">εσύ</Badge>}
        </strong>
        <span className="n2-badges">
          <Badge>{roleNameOf(m.roleId)}</Badge>
          {isSignatoryAt(m.email, m.clientId) && <Badge>Υπογράφων</Badge>}
        </span>
      </div>
      <div className="muted n2-wrap">{m.email}</div>
      <div className="muted">
        Μπήκε {fmtDate(m.joinedAt)}, {colleagueInvitedBy(m.invitedBy)}
      </div>
      {isMe ? (
        <p className="muted">
          Δεν αφαιρείς τον εαυτό σου. Για αποχώρηση, γράψε στη{" "}
          <Link href={screenHref(role, "J3", {})}>Συνομιλία</Link>.
        </p>
      ) : (
        <div className="btn-row n2-actions">
          <Link
            className="button"
            data-danger="true"
            href={screenHref(role, "N3", { remove: m.email })}
          >
            Αφαίρεση
          </Link>
        </div>
      )}
    </li>
  );
}

export function ColleaguesSection(props: {
  role: RoleId;
  members: readonly ClientMembership[];
}) {
  return (
    <section className="card n2-section" aria-labelledby="n3-list">
      <div className="card-title">
        <h2 id="n3-list">Συνάδελφοι</h2>
        <Badge>{props.members.length}</Badge>
      </div>
      {props.members.length === 0 ? (
        <p className="muted">
          Δεν υπάρχουν ακόμα συνάδελφοι. Προσκάλεσε κάποιον από την ομάδα σου
          από κάτω.
        </p>
      ) : (
        <ul className="list">
          {props.members.map((m) => (
            <ColleagueRow key={m.email} role={props.role} m={m} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function ColleagueRemoveConfirm(props: {
  role: RoleId;
  m: ClientMembership;
}) {
  const client = clientNameOf(props.m.clientId);
  return (
    <section
      className="card n2-section"
      role="alertdialog"
      aria-labelledby="n3-remove"
    >
      <h2 id="n3-remove">Αφαίρεση {personName(props.m.email)};</h2>
      <p>
        Δεν θα βλέπει πια τον Πελάτη «{client}»: Συμφωνίες, Παραγωγές,
        Οικονομικά και Συνομιλία.
      </p>
      <SignatoryWarning m={props.m} />
      <p className="note">
        Η ομάδα της Delta Films ειδοποιείται για την αφαίρεση.
      </p>
      <div className="btn-row">
        <button className="button" data-danger="true" type="button">
          Ναι, αφαίρεση
        </button>
        <Link className="button" href={screenHref(props.role, "N3", {})}>
          Άκυρο
        </Link>
      </div>
    </section>
  );
}
