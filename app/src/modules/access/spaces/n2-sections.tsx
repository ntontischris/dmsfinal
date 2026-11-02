import { Avatar } from "@/spaces/kit/parts";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import type { N2Invitation, N2Member } from "./n2-adapter";
import { N2InvitationButtons, N2RemoveButton } from "./n2-forms";

import "./n2.css";

// Οι ενότητες της N2 (prototype `screens/n2-members.tsx`, `n2-invites.tsx`), πάνω στα πραγματικά δεδομένα.

interface MembersProps {
  clientId: string;
  clientName: string;
  members: readonly N2Member[];
}

function MemberRow({
  m,
  clientId,
  clientName,
}: { m: N2Member } & Omit<MembersProps, "members">) {
  return (
    <li className="n2-item">
      <div className="n2-head">
        <Avatar name={m.name} size={38} />
        <span className="n2-who">
          <strong>{m.name}</strong>
          <span className="part-sub n2-wrap">{m.email}</span>
        </span>
        <span className="n2-badges">
          <Badge>{m.role}</Badge>
        </span>
      </div>
      <dl className="dl n2-dl">
        <dt>Πρόσκληση</dt>
        <dd>
          {m.invitedBy ? `από ${m.invitedBy}` : "αυτόματα"} · μπήκε{" "}
          {fmtDate(m.joinedAt)}
        </dd>
        <dt>Τελευταία είσοδος</dt>
        <dd>{m.lastSeen ? fmtDate(m.lastSeen) : "δεν έχει μπει ακόμα"}</dd>
      </dl>
      {!m.isMe && (
        <N2RemoveButton
          clientId={clientId}
          clientName={clientName}
          userId={m.id}
          name={m.name}
        />
      )}
    </li>
  );
}

export function MembersSection(props: MembersProps) {
  return (
    <section className="card n2-section" aria-labelledby="n2-members">
      <div className="card-title">
        <h2 id="n2-members">Χρήστες πελάτη</h2>
        <Badge>{props.members.length}</Badge>
      </div>
      {props.members.length === 0 ? (
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
          {props.members.map((m) => (
            <MemberRow
              key={m.id}
              m={m}
              clientId={props.clientId}
              clientName={props.clientName}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function PendingRow({ inv }: { inv: N2Invitation }) {
  const isExpired = inv.state === "έληξε";
  return (
    <li className="n2-item">
      <div className="n2-head">
        <Avatar name={inv.name} size={38} />
        <span className="n2-who">
          <strong>{inv.name}</strong>
          <span className="part-sub n2-wrap">
            {inv.email} · Ρόλος πελάτη: {inv.roles}
          </span>
        </span>
        <Badge tone={isExpired ? "attention" : "waiting"}>{inv.state}</Badge>
      </div>
      <div className="muted">
        Στάλθηκε {fmtDate(inv.sentAt)} {inv.invitedBy} ·{" "}
        {isExpired ? "έληξε" : "λήγει"} {fmtDate(inv.expiresAt)}
      </div>
      <N2InvitationButtons id={inv.id} canCancel={!isExpired} />
    </li>
  );
}

export function PendingInvitations({
  invitations,
}: {
  invitations: readonly N2Invitation[];
}) {
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
            <PendingRow key={inv.id} inv={inv} />
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
