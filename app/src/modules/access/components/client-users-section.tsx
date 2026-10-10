import { Panel } from "@/components/ui/panel";

import { listInvitations, listClientUsers } from "../invitation-queries";
import { listClientRoleChoices } from "../role-choices";
import type { Viewer } from "../viewer";

import { ClientInviteForm } from "./client-invite-form";
import { ClientUsersList } from "./client-users-list";
import { InvitationList } from "./invitation-list";

// N2/N3: οι Χρήστες ενός Πελάτη, οι εκκρεμείς προσκλήσεις του, και η πρόσκληση. Η βάση κρίνει κάθε ενέργεια.
export async function ClientUsersSection({ clientId, viewer }: { clientId: string; viewer: Viewer }) {
  if (viewer.status !== "signed-in") return null;
  const isTeam = viewer.team !== null;
  const [users, invitations, roles] = await Promise.all([
    listClientUsers(clientId),
    listInvitations(clientId),
    listClientRoleChoices(clientId),
  ]);
  const rows = invitations.ok ? invitations.data : [];
  return (
    <div className="grid gap-4">
      <Panel label="Χρήστες πελάτη" aside={users.ok ? String(users.data.length) : undefined} isFlush>
        {users.ok ? (
          <ClientUsersList
            clientId={clientId}
            users={users.data}
            selfId={viewer.userId}
            canRemove
            showTeamDetails={isTeam}
          />
        ) : (
          <p className="m-0 p-4 text-sm text-destructive">Δεν φόρτωσαν οι Χρήστες πελάτη. Δοκίμασε ξανά.</p>
        )}
      </Panel>
      <Panel label="Προσκλήσεις" isFlush>
        <InvitationList invitations={rows} empty="Καμία πρόσκληση ακόμα." />
      </Panel>
      <Panel label="Πρόσκληση Χρήστη πελάτη">
        <ClientInviteForm clientId={clientId} roles={roles} />
      </Panel>
    </div>
  );
}
