import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { Panel, StatGrid } from "@/components/ui/panel";
import {
  AccessNotice,
  InvitationList,
  TeamInviteForm,
  TeamTable,
  can,
  getViewer,
  grantableTeamRoles,
  isOwner,
  listInvitations,
  listRoles,
  listTeamUsers,
} from "@/modules/access";

export const metadata = { title: "Ομάδα" };

const header = <ScreenHeader eyebrow="N1 · Ομάδα και Πρόσβαση" title="Ομάδα" />;

// N1 Ομάδα: οι Χρήστες ομάδας, οι προσκλήσεις, η πρόσκληση νέου Χρήστη, απενεργοποίηση. Για όποιον «Προσκαλεί και απενεργοποιεί Χρήστες ομάδας».
export default async function TeamPage() {
  const viewer = await getViewer();
  if (!can(viewer, "access.team"))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Την Ομάδα τη βλέπει όποιος «Προσκαλεί και απενεργοποιεί Χρήστες
            ομάδας».
          </p>
        </AccessNotice>
      </>
    );

  const [users, roles, invitations] = await Promise.all([
    listTeamUsers(),
    listRoles(),
    listInvitations(null),
  ]);
  if (!users.ok || !roles.ok)
    return (
      <>
        {header}
        <Notice kind="error" title="Δεν φόρτωσε η Ομάδα">
          <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
        </Notice>
      </>
    );

  const active = users.data.filter((user) => user.isActive).length;
  const grantable =
    viewer.status === "signed-in" && viewer.team
      ? grantableTeamRoles(roles.data, viewer.team)
      : [];
  const rows = invitations.ok ? invitations.data : [];
  return (
    <>
      <ScreenHeader eyebrow="N1 · Ομάδα και Πρόσβαση" title="Ομάδα" />
      <div className="grid gap-4">
        <StatGrid
          items={[
            { label: "Ενεργοί", value: String(active), tone: "ok" },
            {
              label: "Απενεργοποιημένοι",
              value: String(users.data.length - active),
            },
          ]}
        />
        <p className="m-0 text-sm text-muted-foreground">
          Αν το email ανήκει σε Χρήστη που έχει απενεργοποιηθεί, κάνε
          Επανενεργοποίηση στη λίστα Χρηστών και μετά πρόσκληση.
          {isOwner(viewer) && (
            <>
              {" "}
              Τους ίδιους τους Ρόλους τους αλλάζεις στους{" "}
              <Link href="/app/team/roles">Ρόλους και Δικαιώματα</Link>.
            </>
          )}
        </p>
        <Panel label="Πρόσκληση Χρήστη ομάδας">
          <TeamInviteForm roles={grantable} />
        </Panel>
        <Panel label="Προσκλήσεις" isFlush>
          <InvitationList invitations={rows} empty="Καμία πρόσκληση ακόμα." />
        </Panel>
        <Panel label="Χρήστες ομάδας" aside={String(users.data.length)} isFlush>
          <TeamTable users={users.data} roles={roles.data} />
        </Panel>
      </div>
    </>
  );
}
