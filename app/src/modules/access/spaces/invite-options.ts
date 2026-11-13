import type { PermissionDef, RoleSummary } from "../queries";
import type { RoleOption } from "../role-choices";
import type { ClientInviteOptions, TeamInviteOptions } from "./invite-panel";
import { pickerRolesOf, type PickerViewer } from "./n1-adapter";

// Τι μπορεί να προσκαλέσει ο Χρήστης: άνθρωπο της ομάδας («Προσκαλεί και απενεργοποιεί Χρήστες ομάδας»),
// άνθρωπο Πελάτη («Προσκαλεί και αφαιρεί Χρήστες πελάτη»), ή και τα δύο. Η βάση κρίνει ξανά κάθε πρόσκληση.

interface InviteOptionsInput {
  canTeam: boolean;
  canClient: boolean;
  me: PickerViewer;
  roles: readonly RoleSummary[];
  permissions: readonly PermissionDef[];
  clients: readonly RoleOption[];
  presetClientId?: string;
}

export interface InviteOptions {
  team: TeamInviteOptions | null;
  client: ClientInviteOptions | null;
}

// Οι Ρόλοι πελάτη που δίνει η ομάδα: όλοι εκτός από Ρόλο Ιδιοκτήτη (ίδιο με το client_role_choices για την ομάδα).
export const clientRoleOptionsOf = (
  roles: readonly RoleSummary[],
): readonly RoleOption[] =>
  roles
    .filter((role) => role.kind === "client" && !role.isOwner)
    .map(({ id, name }) => ({ id, name }));

export const inviteOptionsOf = (input: InviteOptionsInput): InviteOptions => ({
  team: input.canTeam
    ? {
        roles: pickerRolesOf(input.roles, input.permissions, input.me, false),
        isOwner: input.me.isOwner,
      }
    : null,
  client: input.canClient
    ? {
        clients: input.clients,
        roles: clientRoleOptionsOf(input.roles),
        presetClientId: input.clients.some(
          (client) => client.id === input.presetClientId,
        )
          ? input.presetClientId
          : undefined,
      }
    : null,
});

// Από το ?kind= της σελίδας «Πρόσκληση».
export const pickInviteKind = (value: string | undefined): "team" | "client" =>
  value === "client" ? "client" : "team";
