import Link from "next/link";

import { CURRENT_CLIENT_ID, CURRENT_CLIENT_USER } from "@/data/team";
import {
  clientInvitations,
  membershipsOfClient,
  teamCapsOf,
} from "@/data/team-access";
import { InviteForm, PendingInvitations } from "@/screens/n2-invites";
import { clientNameOf } from "@/screens/n2-members";
import {
  ColleagueRemoveConfirm,
  ColleaguesSection,
  colleagueInvitedBy,
  splitGrantable,
} from "@/screens/n3-colleagues";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

export function N3({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = teamCapsOf(role);
  const header = <StateSwitcher role={role} code="N3" state={state} />;
  if (!caps.isClient) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Οι Συνάδελφοι είναι η οθόνη του Χρήστη πελάτη. Η ομάδα διαχειρίζεται
            τους Χρήστες πελάτη στη N2.
          </p>
          {caps.canManageClientUsers && (
            <p>
              <Link
                href={screenHref(role, "N2", { client: CURRENT_CLIENT_ID })}
              >
                Χρήστες πελάτη (N2)
              </Link>
            </p>
          )}
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="τους συναδέλφους σου" />
      </>
    );
  }
  const isEmpty = state === "empty";
  const all = membershipsOfClient(CURRENT_CLIENT_ID);
  const me = all.find((m) => m.email === CURRENT_CLIENT_USER);
  const members = isEmpty ? all.filter((m) => m === me) : all;
  const invitations = isEmpty ? [] : clientInvitations(CURRENT_CLIENT_ID);
  const removing = members.find(
    (m) => m.email === query.remove && m.email !== CURRENT_CLIENT_USER,
  );
  const grantable = splitGrantable(me?.roleId ?? "client-full");
  return (
    <>
      {header}
      <p className="note">
        Οι άνθρωποι του Πελάτη «{clientNameOf(CURRENT_CLIENT_ID)}» που μπαίνουν
        στην πύλη. Όταν προσκαλείς ή αφαιρείς συνάδελφο, ειδοποιείται η ομάδα
        της Delta Films.
      </p>
      {removing && <ColleagueRemoveConfirm role={role} m={removing} />}
      <ColleaguesSection role={role} members={members} />
      <PendingInvitations
        invitations={invitations}
        labelOf={colleagueInvitedBy}
      />
      <InviteForm
        title="Πρόσκληση συναδέλφου"
        roles={grantable.allowed}
        lockedRoles={grantable.locked}
        clientName={clientNameOf(CURRENT_CLIENT_ID)}
        footnote="Προεπιλογή: «Πλήρης». Δίνεις μόνο Ρόλους πελάτη που δεν ξεπερνούν τον δικό σου. Η ομάδα της Delta Films ειδοποιείται."
      />
    </>
  );
}
