import { lockReason } from "./permissions";
import type { RoleSummary } from "./queries";
import type { TeamMember } from "./viewer";

// Οι Ρόλοι ομάδας που μπορεί να δώσει ο συνδεδεμένος: ό,τι η βάση θα δεχόταν (χωρίς κλιμάκωση, χωρίς Ιδιοκτήτη).
export const grantableTeamRoles = (roles: readonly RoleSummary[], member: TeamMember): RoleSummary[] =>
  roles.filter(
    (role) =>
      role.kind === "team" &&
      lockReason({
        role,
        viewer: { isOwner: member.isOwner, grants: member.permissions },
        isTargetOwner: false,
        labelOf: (permission) => permission,
      }) === null,
  );
