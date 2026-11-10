import { SpacesRole, getViewer } from "@/modules/access";
import { SpacesHistoryLink } from "@/modules/audit";

export const metadata = { title: "Ρόλος" };

// N4 Ρόλος: όνομα, Δικαιώματα με Εύρος, ποιοι τον έχουν, διαγραφή όταν δεν τον έχει κανείς.
export default async function RolePage({
  params,
  searchParams,
}: {
  params: Promise<{ roleId: string }>;
  searchParams: Promise<{ confirm?: string }>;
}) {
  const [{ roleId }, { confirm }, viewer] = await Promise.all([
    params,
    searchParams,
    getViewer(),
  ]);
  return (
    <SpacesRole
      roleId={roleId}
      confirm={typeof confirm === "string" ? confirm : undefined}
      history={<SpacesHistoryLink viewer={viewer} entity="roles" id={roleId} />}
    />
  );
}
