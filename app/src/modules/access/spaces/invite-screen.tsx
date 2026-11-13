import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { listPermissions, listRoles } from "../queries";
import type { RoleOption } from "../role-choices";
import { can, getViewer, type Viewer } from "../viewer";
import { InvitePanel } from "./invite-panel";
import { inviteOptionsOf, pickInviteKind } from "./invite-options";

interface SpacesInviteProps {
  kind: string | undefined;
  clientId: string | undefined;
  // Οι Πελάτες που βλέπει ο Χρήστης (από τη σελίδα, module sales).
  clients: readonly RoleOption[];
}

const meOf = (viewer: Viewer) =>
  viewer.status === "signed-in" && viewer.team
    ? { isOwner: viewer.team.isOwner, grants: viewer.team.permissions }
    : { isOwner: false, grants: {} };

// N6 Πρόσκληση: η μία φόρμα για άνθρωπο της ομάδας ή Πελάτη, από το «+ Νέο». ?kind=client&client=<id> την ανοίγει έτοιμη.
export async function SpacesInvite({
  kind,
  clientId,
  clients,
}: SpacesInviteProps) {
  const viewer = await getViewer();
  const canTeam = can(viewer, "access.team");
  const canClient = can(viewer, "access.clientUsers");
  if (!canTeam && !canClient)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Προσκαλούν όσοι έχουν «Προσκαλεί και απενεργοποιεί Χρήστες ομάδας» ή
          «Προσκαλεί και αφαιρεί Χρήστες πελάτη».
        </StateNotice>
      </div>
    );
  const [roles, permissions] = await Promise.all([
    listRoles(),
    listPermissions(),
  ]);
  if (!roles.ok || !permissions.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="την πρόσκληση" />
      </div>
    );
  const options = inviteOptionsOf({
    canTeam,
    canClient,
    me: meOf(viewer),
    roles: roles.data,
    permissions: permissions.data,
    clients,
    presetClientId: clientId,
  });
  return (
    <div data-spaces>
      <InvitePanel
        title="Πρόσκληση Χρήστη"
        {...options}
        initialKind={pickInviteKind(kind)}
      />
    </div>
  );
}
