import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import {
  AccessNotice,
  NewRoleForm,
  getViewer,
  isOwner,
  listRoles,
  type RoleKind,
} from "@/modules/access";

export const metadata = { title: "Νέος Ρόλος" };

// N4 Νέος Ρόλος, ομάδας ή πελάτη. Το είδος έρχεται από το κουμπί που πατήθηκε και δεν αλλάζει μετά.
export default async function NewRolePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind: raw } = await searchParams;
  const kind: RoleKind = raw === "client" ? "client" : "team";
  const viewer = await getViewer();
  const title = kind === "team" ? "Νέος Ρόλος ομάδας" : "Νέος Ρόλος πελάτη";
  if (!isOwner(viewer))
    return (
      <>
        <ScreenHeader eyebrow="N4 · Ρόλοι" title={title} />
        <AccessNotice viewer={viewer}>
          <p className="m-0">Ρόλους φτιάχνει μόνο ο Ιδιοκτήτης.</p>
        </AccessNotice>
      </>
    );

  const roles = await listRoles();
  return (
    <>
      <ScreenHeader eyebrow="N4 · Ρόλοι" title={title} />
      {roles.ok ? (
        <NewRoleForm
          kind={kind}
          sources={roles.data.filter(
            (role) => role.kind === kind && !role.isOwner,
          )}
        />
      ) : (
        <Notice kind="error" title="Δεν φόρτωσαν οι Ρόλοι">
          <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
        </Notice>
      )}
      <p className="mt-4 text-sm">
        <Link href="/app/team/roles" className="text-muted-foreground">
          ← Όλοι οι Ρόλοι
        </Link>
      </p>
    </>
  );
}
