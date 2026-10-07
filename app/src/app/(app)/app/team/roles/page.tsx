import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import {
  AccessNotice,
  RoleList,
  can,
  getViewer,
  isOwner,
  listRoles,
} from "@/modules/access";

export const metadata = { title: "Ρόλοι και Δικαιώματα" };

// N4 Ρόλοι και Δικαιώματα: μόνο ο Ιδιοκτήτης φτιάχνει, αλλάζει και διαγράφει Ρόλους.
export default async function RolesPage() {
  const viewer = await getViewer();
  const header = (
    <ScreenHeader
      eyebrow="N4 · Ομάδα και Πρόσβαση"
      title="Ρόλοι και Δικαιώματα"
    />
  );
  if (!isOwner(viewer))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Τους Ρόλους και τα Δικαιώματά τους τους αλλάζει μόνο ο Ιδιοκτήτης.
          </p>
          {can(viewer, "access.team") && (
            <p className="m-0">
              Ρόλους σε Χρήστες ομάδας δίνεις στην{" "}
              <Link href="/app/team">Ομάδα</Link>.
            </p>
          )}
        </AccessNotice>
      </>
    );

  const roles = await listRoles();
  return (
    <>
      {header}
      {roles.ok ? (
        <RoleList roles={roles.data} />
      ) : (
        <Notice kind="error" title="Δεν φόρτωσαν οι Ρόλοι">
          <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
        </Notice>
      )}
    </>
  );
}
