import { fmtDate } from "@/spaces/screens/shared";

import type { N2Invitation, N2Member } from "./n2-adapter";
import { N2InvitationButtons, N2RemoveButton } from "./n2-forms";
import { Line, ListSection } from "./n-parts";

import "./n2.css";

// Οι ενότητες της N2 (prototype `screens/n2-members.tsx`, `n2-invites.tsx`) ως γραμμές του money-lines.

interface MembersProps {
  clientId: string;
  clientName: string;
  members: readonly N2Member[];
}

const memberSub = (m: N2Member) =>
  `${m.email} · ${m.invitedBy ? `από ${m.invitedBy}` : "αυτόματα"} · μπήκε ${fmtDate(m.joinedAt)} · Τελευταία είσοδος: ${m.lastSeen ? fmtDate(m.lastSeen) : "δεν έχει μπει ακόμα"}`;

export function MembersSection(props: MembersProps) {
  return (
    <ListSection
      title="Χρήστες πελάτη"
      hint={`${props.members.length} ${props.members.length === 1 ? "Χρήστης" : "Χρήστες"}`}
    >
      {props.members.length === 0 ? (
        <p className="ml-empty">
          Ο Πελάτης δεν έχει ακόμα Χρήστες. Με την πρώτη υπογεγραμμένη Συμφωνία
          ο Υπογράφων προσκαλείται αυτόματα ως «Πλήρης». Μπορείς και να
          προσκαλέσεις κάποιον από κάτω.
        </p>
      ) : (
        <ul className="ml-list">
          {props.members.map((m) => (
            <Line
              key={m.id}
              name={m.name}
              title={m.name}
              tag={m.role}
              sub={memberSub(m)}
              quick={
                m.isMe ? undefined : (
                  <N2RemoveButton
                    clientId={props.clientId}
                    clientName={props.clientName}
                    userId={m.id}
                    name={m.name}
                  />
                )
              }
            />
          ))}
        </ul>
      )}
    </ListSection>
  );
}

function PendingLine({ inv }: { inv: N2Invitation }) {
  const isExpired = inv.state === "έληξε";
  return (
    <Line
      name={inv.name}
      title={inv.name}
      tag={inv.state}
      sub={`${inv.email} · Ρόλος πελάτη: ${inv.roles} · Στάλθηκε ${fmtDate(inv.sentAt)} ${inv.invitedBy} · ${isExpired ? "έληξε" : "λήγει"} ${fmtDate(inv.expiresAt)}`}
      isFaded={isExpired}
      quick={<N2InvitationButtons id={inv.id} canCancel={!isExpired} />}
    />
  );
}

export function PendingInvitations({
  invitations,
}: {
  invitations: readonly N2Invitation[];
}) {
  return (
    <ListSection
      title="Προσκλήσεις σε αναμονή"
      hint="Επαναποστολή: νέος σύνδεσμος 7 ημερών, ο παλιός ακυρώνεται. Μια ληγμένη πρόσκληση μένει εδώ 30 μέρες."
    >
      {invitations.length === 0 ? (
        <p className="ml-empty">Δεν υπάρχουν προσκλήσεις σε αναμονή.</p>
      ) : (
        <ul className="ml-list">
          {invitations.map((inv) => (
            <PendingLine key={inv.id} inv={inv} />
          ))}
        </ul>
      )}
    </ListSection>
  );
}
