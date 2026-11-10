// Module «Ομάδα και Πρόσβαση» (κεφ. 1): είσοδος, ποιος βλέπει τη σελίδα, Ομάδα (N1), Ρόλοι (N4),
// Προσκλήσεις, Χρήστες πελάτη (N2, N3), Ενσωματώσεις (O8). Έξω φαίνεται μόνο ό,τι εξάγεται εδώ.
export {
  can,
  canSeeClientWork,
  getViewer,
  isClientViewer,
  isOwner,
  type TeamMember,
  type Viewer,
} from "./viewer";
export { handleCodeLink, handleTokenLink } from "./links";
export { safeNext } from "./schemas";
export { demoLabels } from "./demo";
export { lockReason } from "./permissions";
export { grantableTeamRoles } from "./grantable-roles";
export {
  getDeactivationPreview,
  getRole,
  listPermissions,
  listRoles,
  listMyRoleNames,
  listTeamUsers,
  type PermissionDef,
  type RoleKind,
  type RoleSummary,
  type TeamUserRow,
} from "./queries";
export {
  listClientUsers,
  listInvitations,
  listMemberships,
} from "./invitation-queries";
export { listClientRoleChoices } from "./role-choices";
export type {
  ClientUserRow,
  InvitationRow,
  MembershipRow,
} from "./invitation-schemas";
export { AccessNotice } from "./components/access-notice";
export { ClientInviteForm } from "./components/client-invite-form";
export { ClientSwitcher } from "./components/client-switcher";
export { ClientUsersSection } from "./components/client-users-section";
export { InvitationList } from "./components/invitation-list";
export { SignOutButton } from "./components/sign-out-button";
export { signOut } from "./actions";
export { sendTestEmail } from "./integrations-actions";
export { SpacesTeam, SpacesTeamUser } from "./spaces/n1-screen";
export { SpacesNewRole, SpacesRole, SpacesRoles } from "./spaces/n4-screen";
// Νέα εμφάνιση των δημόσιων σελίδων (R9 Είσοδος, R10 Επαναφορά/Νέος κωδικός, R13 Ο σύνδεσμος δεν ισχύει πια).
export { AuthPage } from "./spaces/r-frame";
export { SpacesLoginForm } from "./spaces/r9-login-form";
export { SpacesDemoLogins } from "./spaces/r9-demo";
export { SpacesResetForm, SpacesSetPasswordForm } from "./spaces/r10-forms";
export { getPasswordContext } from "./password-context";
export { SpacesDeadLink } from "./spaces/r13-dead-link";
// N2 Χρήστες πελάτη (μέσα στη B2) και N3 Συνάδελφοι στη νέα εμφάνιση.
export { SpacesClientUsers } from "./spaces/n2-screen";
export { SpacesColleagues } from "./spaces/n3-screen";
export { SpacesSwitchClient } from "./spaces/a4-screen";
