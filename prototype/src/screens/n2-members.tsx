import Link from "next/link";

import { agreementsOfClient } from "@/data/agreements";
import type { RoleId } from "@/data/roles";
import { SALES_CLIENTS, findClient } from "@/data/sales";
import { INVITATIONS, type ClientMembership } from "@/data/team";
import {
  findRoleDef,
  invitedByLabel,
  otherClientsOf,
} from "@/data/team-access";
import { Badge, fmtDate, screenHref } from "@/screens/shared";

import "./n2.css";

// Βοηθοί για τους Χρήστες πελάτη (κοινοί με τη N3).

export const personName = (email: string): string =>
  SALES_CLIENTS.flatMap((c) => c.users).find((u) => u.email === email)?.name ??
  INVITATIONS.find((inv) => inv.email === email)?.name ??
  email;

export const isSignatoryAt = (email: string, clientId: string): boolean =>
  findClient(clientId)?.users.some((u) => u.email === email && u.isSignatory) ??
  false;

// Πρόταση που περιμένει υπογραφή του Υπογράφοντος.
export const hasProposalAwaitingSignature = (clientId: string): boolean =>
  agreementsOfClient(clientId).some(
    (a) => a.state === "πρόταση" && a.path === "Εστάλη",
  );

export const clientNameOf = (id: string): string => findClient(id)?.name ?? id;

export const roleNameOf = (roleId: string): string =>
  findRoleDef(roleId)?.name ?? roleId;

interface MembersProps {
  role: RoleId;
  members: readonly ClientMembership[];
  isOwner: boolean;
}

function MemberRow(props: {
  role: RoleId;
  m: ClientMembership;
  isOwner: boolean;
}) {
  const { role, m, isOwner } = props;
  const others = otherClientsOf(m.email, m.clientId);
  return (
    <li className="n2-item">
      <div className="row">
        <strong>{personName(m.email)}</strong>
        <span className="n2-badges">
          <Badge>{roleNameOf(m.roleId)}</Badge>
          {isSignatoryAt(m.email, m.clientId) && (
            <Badge tone="strong">Υπογράφων</Badge>
          )}
        </span>
      </div>
      <div className="muted n2-wrap">{m.email}</div>
      <dl className="dl n2-dl">
        <dt>Πρόσκληση</dt>
        <dd>
          {invitedByLabel(m.invitedBy)} · μπήκε {fmtDate(m.joinedAt)}
        </dd>
        <dt>Άλλοι Πελάτες</dt>
        <dd>
          {others.length === 0
            ? "κανένας"
            : others.map((id, i) => (
                <span key={id}>
                  {i > 0 && ", "}
                  <Link href={screenHref(role, "N2", { client: id })}>
                    {clientNameOf(id)}
                  </Link>
                </span>
              ))}
        </dd>
        <dt>Τελευταία είσοδος</dt>
        <dd>{m.lastSeen ? fmtDate(m.lastSeen) : "δεν έχει μπει ακόμα"}</dd>
      </dl>
      <div className="btn-row n2-actions">
        <Link
          className="button"
          data-danger="true"
          href={screenHref(role, "N2", { client: m.clientId, remove: m.email })}
        >
          Αφαίρεση
        </Link>
        {isOwner && (
          <button className="button" type="button">
            Εξαγωγή δεδομένων (GDPR)
          </button>
        )}
      </div>
    </li>
  );
}

export function MembersSection({
  role,
  members,
  isOwner,
}: MembersProps) {
  return (
    <section className="card n2-section" aria-labelledby="n2-members">
      <div className="card-title">
        <h2 id="n2-members">Χρήστες πελάτη</h2>
        <Badge>{members.length}</Badge>
      </div>
      {members.length === 0 ? (
        <div className="n2-empty">
          <p>
            <strong>Ο Πελάτης δεν έχει ακόμα Χρήστες.</strong>
          </p>
          <p className="muted">
            Με την πρώτη υπογεγραμμένη Συμφωνία ο Υπογράφων προσκαλείται
            αυτόματα ως «Πλήρης». Μπορείς και να προσκαλέσεις κάποιον από κάτω.
          </p>
        </div>
      ) : (
        <ul className="list">
          {members.map((m) => (
            <MemberRow key={m.email} role={role} m={m} isOwner={isOwner} />
          ))}
        </ul>
      )}
    </section>
  );
}
