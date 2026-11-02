// N2 Χρήστες πελάτη και N3 Συνάδελφοι (νέα εμφάνιση): οι πραγματικοί Χρήστες πελάτη και οι προσκλήσεις στις μορφές
// του prototype (`screens/n2-members.tsx`, `n2-invites.tsx`, `n3-colleagues.tsx`). Καθαρές συναρτήσεις.

import type { ClientUserRow, InvitationRow } from "../invitation-schemas";

export interface N2Member {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  // Ποιος προσκάλεσε και η τελευταία είσοδος: η βάση τα δίνει μόνο στην ομάδα.
  invitedBy: string | null;
  lastSeen: string | null;
  isMe: boolean;
}

export const n2MembersOf = (
  rows: readonly ClientUserRow[],
  selfId: string,
): readonly N2Member[] =>
  rows.map((row) => ({
    id: row.userId,
    name: row.name,
    email: row.email,
    role: row.roleName,
    joinedAt: row.joinedAt,
    invitedBy: row.invitedBy?.name ?? null,
    lastSeen: row.lastSignInAt,
    isMe: row.userId === selfId,
  }));

export type N2InvitationState = "εκκρεμεί" | "έληξε";

export interface N2Invitation {
  id: string;
  name: string;
  email: string;
  roles: string;
  // Ο προσκαλών όπως τον βλέπει ο θεατής (ο πελάτης δεν βλέπει ονόματα της ομάδας).
  invitedBy: string;
  sentAt: string;
  expiresAt: string;
  state: N2InvitationState;
}

// Στον πελάτη: όνομα μόνο αν προσκάλεσε συνάδελφος, αλλιώς «από την ομάδα της Devre Media» (prototype `colleagueInvitedBy`).
export const colleagueInvitedBy =
  (members: readonly N2Member[]) =>
  (invitedBy: InvitationRow["invitedBy"]): string => {
    const colleague = members.find((member) => member.id === invitedBy?.id);
    return colleague
      ? `από ${colleague.name}`
      : "από την ομάδα της Devre Media";
  };

export const teamInvitedBy = (invitedBy: InvitationRow["invitedBy"]): string =>
  invitedBy ? `από ${invitedBy.name}` : "αυτόματα";

// «Σε αναμονή» = όσες περιμένουν ή έληξαν (οι αποδεκτές και οι ακυρωμένες δεν μένουν στη λίστα).
export const n2InvitationsOf = (
  rows: readonly InvitationRow[],
  labelOf: (invitedBy: InvitationRow["invitedBy"]) => string,
): readonly N2Invitation[] =>
  rows.flatMap((row) =>
    row.status === "pending" || row.status === "expired"
      ? [
          {
            id: row.id,
            name: row.name,
            email: row.email,
            roles: row.roles.map((role) => role.name).join(", ") || "Πλήρης",
            invitedBy: labelOf(row.invitedBy),
            sentAt: row.createdAt,
            expiresAt: row.expiresAt,
            state: row.status === "expired" ? "έληξε" : "εκκρεμεί",
          },
        ]
      : [],
  );
