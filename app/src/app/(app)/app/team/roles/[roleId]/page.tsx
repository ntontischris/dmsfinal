import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import {
  AccessNotice,
  DeleteRoleForm,
  RoleEditor,
  getRole,
  getViewer,
  isOwner,
  listPermissions,
  listTeamUsers,
} from "@/modules/access";

export const metadata = { title: "Ρόλος" };

// N4 Ρόλος: όνομα, Δικαιώματα με Εύρος, ποιοι τον έχουν, διαγραφή όταν δεν τον έχει κανείς.
export default async function RolePage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  const viewer = await getViewer();
  if (!isOwner(viewer))
    return (
      <>
        <ScreenHeader eyebrow="N4 · Ρόλοι" title="Ρόλος" />
        <AccessNotice viewer={viewer}>
          <p className="m-0">Τους Ρόλους τους αλλάζει μόνο ο Ιδιοκτήτης.</p>
        </AccessNotice>
      </>
    );

  const [role, permissions, users] = await Promise.all([
    getRole(roleId),
    listPermissions(),
    listTeamUsers(),
  ]);
  if (!role.ok || !permissions.ok || !users.ok)
    return (
      <Notice kind="error" title="Δεν φόρτωσε ο Ρόλος">
        <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
      </Notice>
    );
  if (!role.data)
    return (
      <Notice kind="empty" title="Αυτός ο Ρόλος δεν υπάρχει">
        <p className="m-0">Ίσως διαγράφηκε.</p>
        <Link href="/app/team/roles">Όλοι οι Ρόλοι</Link>
      </Notice>
    );

  const current = role.data;
  const holders = users.data.filter((user) =>
    current.holders.includes(user.userId),
  );
  const isDeletable =
    !current.isOwner &&
    !(current.kind === "client" && current.isBuiltin) &&
    holders.length === 0;
  return (
    <>
      <ScreenHeader eyebrow="N4 · Ρόλοι" title={current.name}>
        {current.isOwner ? (
          <Badge tone="attention">κλειδωμένος</Badge>
        ) : current.isBuiltin ? (
          <Badge>έτοιμος</Badge>
        ) : (
          <Badge tone="strong">δικός σου</Badge>
        )}
      </ScreenHeader>
      <div className="grid gap-4">
        <RoleEditor
          role={current}
          permissions={permissions.data.filter((p) => p.kind === current.kind)}
        />
        {current.kind === "team" && (
          <Panel label="Ποιοι τον έχουν" aside={String(holders.length)}>
            {holders.length === 0 ? (
              <p className="m-0 text-sm text-muted-foreground">Κανείς ακόμα.</p>
            ) : (
              <ul className="m-0 grid gap-1 pl-5 text-sm">
                {holders.map((user) => (
                  <li key={user.userId}>
                    <Link href={`/app/team/${user.userId}`}>{user.name}</Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
        <Panel label="Διαγραφή">
          {isDeletable ? (
            <DeleteRoleForm roleId={current.id} roleName={current.name} />
          ) : (
            <p className="m-0 text-sm text-muted-foreground">
              {current.isOwner
                ? "Ο Ιδιοκτήτης δεν διαγράφεται."
                : current.kind === "client" && current.isBuiltin
                  ? "Ο «Πλήρης» δεν διαγράφεται: είναι ο Ρόλος της αυτόματης πρόσκλησης του Υπογράφοντος."
                  : "Διαγράφεται μόνο όταν δεν τον έχει κανείς."}
            </p>
          )}
        </Panel>
        <Link href="/app/team/roles" className="text-sm text-muted-foreground">
          ← Όλοι οι Ρόλοι
        </Link>
      </div>
    </>
  );
}
