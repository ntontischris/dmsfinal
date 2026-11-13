import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { listClientUsers, listInvitations } from "../invitation-queries";
import { listClientRoleChoices } from "../role-choices";
import { can, type Viewer } from "../viewer";
import { n2InvitationsOf, n2MembersOf, teamInvitedBy } from "./n2-adapter";
import { InvitePanel } from "./invite-panel";
import { MembersSection, PendingInvitations } from "./n2-sections";

interface SpacesClientUsersProps {
  clientId: string;
  clientName: string;
  viewer: Viewer;
}

// N2 Χρήστες πελάτη στη νέα εμφάνιση (prototype `screens/N2.tsx`), μέσα στη Σελίδα Πελάτη (B2): οι Χρήστες, οι
// προσκλήσεις σε αναμονή και η πρόσκληση. Όποιος «Προσκαλεί και αφαιρεί Χρήστες πελάτη»· η βάση κρίνει κάθε ενέργεια.
export async function SpacesClientUsers({
  clientId,
  clientName,
  viewer,
}: SpacesClientUsersProps) {
  if (viewer.status !== "signed-in" || !can(viewer, "access.clientUsers"))
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τους Χρήστες πελάτη τους διαχειρίζονται όσοι έχουν «Προσκαλεί και
          αφαιρεί Χρήστες πελάτη».
        </StateNotice>
      </div>
    );
  const [users, invitations, roles] = await Promise.all([
    listClientUsers(clientId),
    listInvitations(clientId),
    listClientRoleChoices(clientId),
  ]);
  return (
    <div data-spaces>
      {users.ok ? (
        <MembersSection
          clientId={clientId}
          clientName={clientName}
          members={n2MembersOf(users.data, viewer.userId)}
        />
      ) : (
        <ErrorNotice what="τους Χρήστες πελάτη" />
      )}
      {invitations.ok ? (
        <PendingInvitations
          invitations={n2InvitationsOf(invitations.data, teamInvitedBy)}
        />
      ) : (
        <ErrorNotice what="τις προσκλήσεις" />
      )}
      {/* Η ίδια «Πρόσκληση» με το «+ Νέο» και την Ομάδα, με τον Πελάτη ήδη διαλεγμένο. */}
      <InvitePanel
        title="Πρόσκληση Χρήστη πελάτη"
        team={null}
        client={{
          clients: [{ id: clientId, name: clientName }],
          roles,
          presetClientId: clientId,
        }}
        footnote="Ο Υπογράφων της πρώτης υπογεγραμμένης Συμφωνίας προσκαλείται αυτόματα ως «Πλήρης»."
      />
    </div>
  );
}
