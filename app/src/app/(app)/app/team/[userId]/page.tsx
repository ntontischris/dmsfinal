import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Badge } from "@/components/ui/badge";
import { Inspector, Split } from "@/components/ui/inspector";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import {
  AccessNotice,
  UserActiveForm,
  UserRolesForm,
  can,
  getViewer,
  listPermissions,
  listRoles,
  listTeamUsers,
  lockReason,
  type Viewer,
} from "@/modules/access";

export const metadata = { title: "Χρήστης ομάδας" };

const viewerGrants = (viewer: Viewer) =>
  viewer.status === "signed-in" && viewer.team
    ? { isOwner: viewer.team.isOwner, grants: viewer.team.permissions }
    : { isOwner: false, grants: {} };

// N1 Χρήστης ομάδας: ταυτότητα, Ρόλοι (χωρίς κλιμάκωση), απενεργοποίηση.
export default async function TeamUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const viewer = await getViewer();
  const header = <ScreenHeader eyebrow="N1 · Ομάδα" title="Χρήστης ομάδας" />;
  if (!can(viewer, "access.team"))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Τους Χρήστες ομάδας τους βλέπει όποιος «Προσκαλεί και απενεργοποιεί
            Χρήστες ομάδας».
          </p>
        </AccessNotice>
      </>
    );

  const [users, roles, permissions] = await Promise.all([
    listTeamUsers(),
    listRoles(),
    listPermissions(),
  ]);
  if (!users.ok || !roles.ok || !permissions.ok)
    return (
      <>
        {header}
        <Notice kind="error" title="Δεν φόρτωσε ο Χρήστης">
          <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
        </Notice>
      </>
    );

  const user = users.data.find((row) => row.userId === userId);
  if (!user)
    return (
      <>
        {header}
        <Notice kind="empty" title="Αυτός ο Χρήστης δεν υπάρχει">
          <Link href="/app/team">Πίσω στην Ομάδα</Link>
        </Notice>
      </>
    );

  const teamRoles = roles.data.filter((role) => role.kind === "team");
  const ownerRoleId = teamRoles.find((role) => role.isOwner)?.id;
  const labelOf = (code: string) =>
    permissions.data.find((p) => p.code === code)?.label ?? code;
  const me = viewerGrants(viewer);
  const locked = Object.fromEntries(
    teamRoles.flatMap((role) => {
      const reason = lockReason({
        role,
        viewer: me,
        isTargetOwner:
          ownerRoleId !== undefined && user.roleIds.includes(ownerRoleId),
        labelOf,
      });
      return reason ? [[role.id, reason]] : [];
    }),
  );
  const isSelf = viewer.status === "signed-in" && viewer.userId === user.userId;

  return (
    <>
      <ScreenHeader eyebrow="N1 · Ομάδα" title={user.name} />
      <Split>
        <Inspector
          title={user.name}
          fields={[
            {
              label: "Email",
              value: <span className="break-all">{user.email}</span>,
            },
            {
              label: "Κατάσταση",
              value: user.isActive ? (
                <Badge tone="ok">ενεργός</Badge>
              ) : (
                <Badge>απενεργοποιημένος</Badge>
              ),
            },
            {
              label: "Ρόλοι",
              value:
                teamRoles
                  .filter((r) => user.roleIds.includes(r.id))
                  .map((r) => r.name)
                  .join(" · ") || "—",
            },
          ]}
        />
        <div className="grid min-w-0 gap-4">
          <Panel label="Ρόλοι">
            <UserRolesForm
              userId={user.userId}
              roles={teamRoles}
              current={user.roleIds}
              locked={locked}
            />
          </Panel>
          <Panel label={user.isActive ? "Απενεργοποίηση" : "Επανενεργοποίηση"}>
            {isSelf ? (
              <p className="m-0 text-sm text-muted-foreground">
                Δεν απενεργοποιείς τον εαυτό σου.
              </p>
            ) : (
              <UserActiveForm
                userId={user.userId}
                name={user.name}
                isActive={user.isActive}
              />
            )}
          </Panel>
          <Link href="/app/team" className="text-sm text-muted-foreground">
            ← Όλη η Ομάδα
          </Link>
        </div>
      </Split>
    </>
  );
}
