import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import type { RoleSummary, TeamUserRow } from "../queries";

const roleNames = (user: TeamUserRow, roles: readonly RoleSummary[]): string =>
  user.roleIds
    .map((id) => roles.find((role) => role.id === id)?.name)
    .filter((name): name is string => Boolean(name))
    .join(" · ");

// N1: οι Χρήστες ομάδας, οι ενεργοί πρώτα. Κάθε γραμμή ανοίγει τον Χρήστη.
export function TeamTable({
  users,
  roles,
}: {
  users: readonly TeamUserRow[];
  roles: readonly RoleSummary[];
}) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Όνομα</Th>
          <Th>Email</Th>
          <Th>Ρόλοι</Th>
          <Th>Κατάσταση</Th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <Tr key={user.userId}>
            <Td data-label="Όνομα">
              <Link href={`/app/team/${user.userId}`} className="font-medium">
                {user.name}
              </Link>
            </Td>
            <Td data-label="Email" className="break-all">
              {user.email}
            </Td>
            <Td data-label="Ρόλοι">{roleNames(user, roles) || "—"}</Td>
            <Td data-label="Κατάσταση">
              {user.isActive ? (
                <Badge tone="ok">ενεργός</Badge>
              ) : (
                <Badge>απενεργοποιημένος</Badge>
              )}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
