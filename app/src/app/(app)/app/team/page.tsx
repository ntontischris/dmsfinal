import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Panel, StatGrid } from "@/components/ui/panel";
import {
  AccessNotice,
  TeamTable,
  can,
  getViewer,
  isOwner,
  listRoles,
  listTeamUsers,
} from "@/modules/access";

export const metadata = { title: "Ομάδα" };

// N1 Ομάδα: οι Χρήστες ομάδας, οι Ρόλοι τους, απενεργοποίηση. Για όποιον «Προσκαλεί και απενεργοποιεί Χρήστες ομάδας».
export default async function TeamPage() {
  const viewer = await getViewer();
  const header = (
    <ScreenHeader eyebrow="N1 · Ομάδα και Πρόσβαση" title="Ομάδα" />
  );
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

  const [users, roles] = await Promise.all([listTeamUsers(), listRoles()]);
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
  return (
    <>
      <ScreenHeader eyebrow="N1 · Ομάδα και Πρόσβαση" title="Ομάδα">
        <Button
          variant="primary"
          disabled
          title="Ανοίγει μαζί με την αποστολή email"
        >
          Πρόσκληση
        </Button>
      </ScreenHeader>
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
          Η πρόσκληση νέων Χρηστών ανοίγει μαζί με την αποστολή email. Ως τότε,
          ο developer προσκαλεί από το Supabase.
          {isOwner(viewer) && (
            <>
              {" "}
              Τους ίδιους τους Ρόλους τους αλλάζεις στους{" "}
              <Link href="/app/team/roles">Ρόλους και Δικαιώματα</Link>.
            </>
          )}
        </p>
        <Panel label="Χρήστες ομάδας" aside={String(users.data.length)} isFlush>
          <TeamTable users={users.data} roles={roles.data} />
        </Panel>
      </div>
    </>
  );
}
