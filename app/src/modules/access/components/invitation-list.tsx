import { Rows, type RowItem } from "@/components/ui/rows";

import type { InvitationRow } from "../invitation-schemas";

import { InvitationActions } from "./invitation-actions";

export const STATUS_LABEL: Record<InvitationRow["status"], string> = {
  pending: "Εκκρεμεί",
  accepted: "Αποδεκτή",
  expired: "Έληξε",
  cancelled: "Ακυρώθηκε",
};

const day = (iso: string): string =>
  new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "short" }).format(new Date(iso));

const rolesText = (row: InvitationRow): string => row.roles.map((role) => role.name).join(", ");

const toItem = (row: InvitationRow): RowItem => ({
  id: row.id,
  title: row.name,
  meta: (
    <span className="text-sm text-muted-foreground">
      {row.email} · {rolesText(row)}
      {row.client ? ` · ${row.client.name}` : ""} · {STATUS_LABEL[row.status]}
      {row.status === "pending" ? ` έως ${day(row.expiresAt)}` : ""}
    </span>
  ),
  aside:
    row.status === "pending" || row.status === "expired" ? (
      <InvitationActions id={row.id} canCancel={row.status === "pending"} />
    ) : undefined,
});

// Εκκρεμείς, ληγμένες και πρόσφατα αποδεκτές προσκλήσεις. Οι ακυρωμένες δεν μένουν στη λίστα.
export function InvitationList({ invitations, empty }: { invitations: readonly InvitationRow[]; empty: string }) {
  if (invitations.length === 0) return <p className="m-0 p-4 text-sm text-muted-foreground">{empty}</p>;
  return <Rows items={invitations.map(toItem)} isNumbered={false} />;
}
