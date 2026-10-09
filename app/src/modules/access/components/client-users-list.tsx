import { Rows, type RowItem } from "@/components/ui/rows";

import type { ClientUserRow } from "../invitation-schemas";

import { RemoveClientUserForm } from "./remove-client-user-form";

interface ClientUsersListProps {
  clientId: string;
  users: readonly ClientUserRow[];
  selfId: string;
  canRemove: boolean;
  showTeamDetails: boolean;
}

const joinedText = (iso: string): string =>
  new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

// Το «προσκλήθηκε από» και η τελευταία είσοδος φαίνονται μόνο στην ομάδα (η βάση δεν τα δίνει στον Πελάτη).
const metaText = (user: ClientUserRow, showTeamDetails: boolean): string => {
  const parts = [user.email, user.roleName, `στον Πελάτη από ${joinedText(user.joinedAt)}`];
  if (showTeamDetails && user.invitedBy) parts.push(`προσκλήθηκε από ${user.invitedBy.name}`);
  if (showTeamDetails && user.lastSignInAt) parts.push(`τελευταία είσοδος ${joinedText(user.lastSignInAt)}`);
  return parts.join(" · ");
};

const toItem = (props: ClientUsersListProps) => (user: ClientUserRow): RowItem => ({
  id: user.userId,
  title: user.name,
  meta: <span className="text-sm text-muted-foreground">{metaText(user, props.showTeamDetails)}</span>,
  aside:
    props.canRemove && user.userId !== props.selfId ? (
      <RemoveClientUserForm clientId={props.clientId} userId={user.userId} name={user.name} />
    ) : undefined,
});

// Οι ενεργοί Χρήστες ενός Πελάτη. Αφαίρεση μόνο όπου το επιτρέπει το Δικαίωμα, ποτέ τον εαυτό σου.
export function ClientUsersList(props: ClientUsersListProps) {
  if (props.users.length === 0)
    return <p className="m-0 p-4 text-sm text-muted-foreground">Δεν υπάρχουν ακόμα Χρήστες πελάτη.</p>;
  return <Rows items={props.users.map(toItem(props))} isNumbered={false} />;
}
