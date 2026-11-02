import Link from "next/link";
import type { ReactNode } from "react";

import { getSpaceStrip } from "@/modules/today";
import { codesOfSpace } from "@/spaces/data/spaces";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";
import { Strip } from "@/spaces/shell/strip";

import { listInvitations } from "../invitation-queries";
import {
  getDeactivationPreview,
  listPermissions,
  listRoles,
  listTeamUsers,
} from "../queries";
import { can, getViewer, type Viewer } from "../viewer";
import {
  n1InvitationsOf,
  n1UserOf,
  pickFilter,
  pickerRolesOf,
  type PickerViewer,
} from "./n1-adapter";
import { UserDetail, type DetailConfirm } from "./n1-detail";
import { InvitationList, InviteForm } from "./n1-invite";
import { UserList } from "./n1-list";
import { listTeamUserDates } from "./n1-load";
import { RoleReachTable } from "./n1-reach-table";
import { userReachText } from "./team-reach";

import "./n1.css";

const pickerViewerOf = (viewer: Viewer): PickerViewer =>
  viewer.status === "signed-in" && viewer.team
    ? { isOwner: viewer.team.isOwner, grants: viewer.team.permissions }
    : { isOwner: false, grants: {} };

const viewerIdOf = (viewer: Viewer): string | null =>
  viewer.status === "signed-in" ? viewer.userId : null;

function Denied() {
  return (
    <div data-spaces>
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        Την Ομάδα τη διαχειρίζονται όσοι έχουν «Προσκαλεί και απενεργοποιεί
        Χρήστες ομάδας» (Ιδιοκτήτης, Διαχείριση).
      </StateNotice>
    </div>
  );
}

async function loadTeam() {
  const [users, roles, permissions, invitations, dates] = await Promise.all([
    listTeamUsers(),
    listRoles(),
    listPermissions(),
    listInvitations(null),
    listTeamUserDates(),
  ]);
  return { users, roles, permissions, invitations, dates };
}

interface SpacesTeamProps {
  status: string | undefined;
  // Τα Αιτήματα GDPR (μόνο Ιδιοκτήτης), από το module gdpr.
  gdprRequests: ReactNode;
}

// N1 Ομάδα στη νέα εμφάνιση (prototype `screens/N1.tsx`): οι Χρήστες ομάδας, οι Προσκλήσεις, η πρόσκληση, τι βλέπει κάθε Ρόλος.
export async function SpacesTeam({ status, gdprRequests }: SpacesTeamProps) {
  const viewer = await getViewer();
  if (!can(viewer, "access.team")) return <Denied />;
  const [team, strip] = await Promise.all([
    loadTeam(),
    getSpaceStrip(codesOfSpace("company")),
  ]);
  const { users, roles, permissions, invitations, dates } = team;
  if (!users.ok || !roles.ok || !permissions.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="την Ομάδα" />
      </div>
    );
  const me = pickerViewerOf(viewer);
  const rows = users.data.map((user) =>
    n1UserOf(
      user,
      roles.data,
      dates.ok ? dates.data : null,
      viewerIdOf(viewer),
    ),
  );
  const isAlone = rows.length <= 1;
  return (
    <div data-spaces>
      <Strip stats={strip.stats} now={strip.now} />
      {isAlone ? (
        <StateNotice kind="empty" title="Είσαι ακόμα μόνος στην ομάδα">
          Προσκάλεσε τον πρώτο Χρήστη ομάδας παρακάτω: διαλέγεις Ρόλους και του
          στέλνεται σύνδεσμος που ισχύει 7 μέρες.
        </StateNotice>
      ) : (
        <UserList users={rows} filter={pickFilter(status)} />
      )}
      {invitations.ok ? (
        <InvitationList invitations={n1InvitationsOf(invitations.data)} />
      ) : (
        <ErrorNotice what="οι Προσκλήσεις" />
      )}
      <InviteForm
        roles={pickerRolesOf(roles.data, permissions.data, me, false)}
        isOwner={me.isOwner}
      />
      <RoleReachTable roles={roles.data} permissions={permissions.data} />
      {me.isOwner && !isAlone && gdprRequests}
      {me.isOwner && (
        <p className="note">
          Τι κάνει κάθε Ρόλος (Δικαιώματα, Εύρος, νέοι Ρόλοι) αλλάζει στη{" "}
          <Link href={hrefOf("N4")}>Ρόλοι και Δικαιώματα</Link>.
        </p>
      )}
    </div>
  );
}

interface SpacesTeamUserProps {
  userId: string;
  confirm: string | undefined;
  gdprSection: ReactNode;
  gdprConfirm: ReactNode;
}

const pickConfirm = (value: string | undefined): DetailConfirm =>
  value === "deactivate" || value === "anonymize" ? value : undefined;

// N1 Χρήστης ομάδας στη νέα εμφάνιση (prototype `screens/n1-detail.tsx`): ταυτότητα, Ρόλοι, απενεργοποίηση, GDPR.
export async function SpacesTeamUser({
  userId,
  confirm,
  gdprSection,
  gdprConfirm,
}: SpacesTeamUserProps) {
  const viewer = await getViewer();
  if (!can(viewer, "access.team")) return <Denied />;
  const [team, preview] = await Promise.all([
    loadTeam(),
    getDeactivationPreview(userId),
  ]);
  const { users, roles, permissions, dates } = team;
  if (!users.ok || !roles.ok || !permissions.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="ο Χρήστης" />
      </div>
    );
  const user = users.data.find((row) => row.userId === userId);
  if (!user)
    return (
      <div data-spaces>
        <StateNotice kind="empty" title="Δεν βρέθηκε ο Χρήστης">
          <Link href={hrefOf("N1")}>Πίσω στους Χρήστες ομάδας</Link>
        </StateNotice>
      </div>
    );
  const me = pickerViewerOf(viewer);
  const ownerRoleId = roles.data.find(
    (role) => role.kind === "team" && role.isOwner,
  )?.id;
  const isTargetOwner =
    ownerRoleId !== undefined && user.roleIds.includes(ownerRoleId);
  const target = n1UserOf(
    user,
    roles.data,
    dates.ok ? dates.data : null,
    viewerIdOf(viewer),
  );
  return (
    <div data-spaces>
      <UserDetail
        target={target}
        reach={userReachText(
          roles.data.filter((role) => user.roleIds.includes(role.id)),
          permissions.data,
        )}
        roles={pickerRolesOf(roles.data, permissions.data, me, isTargetOwner)}
        selected={user.roleIds}
        preview={preview.ok ? preview.data : null}
        isOwner={me.isOwner}
        confirm={pickConfirm(confirm)}
        gdprSection={gdprSection}
        gdprConfirm={gdprConfirm}
      />
    </div>
  );
}
