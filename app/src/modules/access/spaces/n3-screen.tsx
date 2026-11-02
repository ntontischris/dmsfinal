import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { hrefOf } from "@/spaces/data/screens";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  fmtDate,
} from "@/spaces/screens/shared";

import {
  listClientUsers,
  listInvitations,
  listMemberships,
} from "../invitation-queries";
import { listClientRoleChoices } from "../role-choices";
import { can, type Viewer } from "../viewer";
import {
  colleagueInvitedBy,
  n2InvitationsOf,
  n2MembersOf,
  type N2Member,
} from "./n2-adapter";
import { N2InviteForm, N2RemoveButton } from "./n2-forms";
import { PendingInvitations } from "./n2-sections";

import "./n2.css";

const TEAM_NOTE = "Η ομάδα της Devre Media ειδοποιείται για την αφαίρεση.";

function ColleagueRow(props: {
  m: N2Member;
  clientId: string;
  clientName: string;
}) {
  const { m } = props;
  return (
    <ListRow
      lead={<Avatar name={m.name} size={36} />}
      title={
        <>
          {m.name} {m.isMe && <Badge tone="strong">εσύ</Badge>}
        </>
      }
      sub={
        <>
          <span className="n2-wrap">{m.email}</span>
          <br />
          Μπήκε {fmtDate(m.joinedAt)}
          {m.isMe && (
            <>
              <br />
              Δεν αφαιρείς τον εαυτό σου. Για αποχώρηση, γράψε στη{" "}
              <Link href={hrefOf("J1")}>Συνομιλία</Link>.
            </>
          )}
        </>
      }
      aside={
        <>
          <Badge>{m.role}</Badge>
          {!m.isMe && (
            <N2RemoveButton
              clientId={props.clientId}
              clientName={props.clientName}
              userId={m.id}
              name={m.name}
              note={TEAM_NOTE}
            />
          )}
        </>
      }
    />
  );
}

function ColleaguesSection(props: {
  members: readonly N2Member[];
  clientId: string;
  clientName: string;
}) {
  return (
    <div role="group" aria-label="Συνάδελφοι">
      <Panel label="Συνάδελφοι" aside={<Badge>{props.members.length}</Badge>}>
        {props.members.length === 0 ? (
          <p className="muted">
            Δεν υπάρχουν ακόμα συνάδελφοι. Προσκάλεσε κάποιον από την ομάδα σου
            από κάτω.
          </p>
        ) : (
          <div className="n2-bleed">
            <RowList>
              {props.members.map((m) => (
                <ColleagueRow
                  key={m.id}
                  m={m}
                  clientId={props.clientId}
                  clientName={props.clientName}
                />
              ))}
            </RowList>
          </div>
        )}
      </Panel>
    </div>
  );
}

// N3 Συνάδελφοι στη νέα εμφάνιση (prototype `screens/N3.tsx`): ο Χρήστης πελάτη βλέπει και προσκαλεί συναδέλφους στον
// τρέχοντα Πελάτη του (c.colleagues). Η βάση κρίνει κάθε ενέργεια και ποιους Ρόλους μπορεί να δώσει.
export async function SpacesColleagues({ viewer }: { viewer: Viewer }) {
  if (viewer.status !== "signed-in" || !can(viewer, "c.colleagues"))
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τους συναδέλφους τους βλέπει όποιος έχει το Δικαίωμα «Βλέπει και
          προσκαλεί συναδέλφους».
        </StateNotice>
      </div>
    );
  const memberships = await listMemberships();
  if (!memberships.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="τους συναδέλφους σου" />
      </div>
    );
  const current =
    memberships.data.find((row) => row.isCurrent) ?? memberships.data[0];
  if (!current)
    return (
      <div data-spaces>
        <StateNotice kind="empty" title="Δεν έχεις Πελάτη ακόμα">
          Ζήτησε από την ομάδα να σε προσθέσει σε Πελάτη.
        </StateNotice>
      </div>
    );
  return (
    <Colleagues
      viewer={viewer}
      clientId={current.clientId}
      clientName={current.name}
    />
  );
}

async function Colleagues(props: {
  viewer: Extract<Viewer, { status: "signed-in" }>;
  clientId: string;
  clientName: string;
}) {
  const [users, invitations, roles] = await Promise.all([
    listClientUsers(props.clientId),
    listInvitations(props.clientId),
    listClientRoleChoices(props.clientId),
  ]);
  if (!users.ok || !invitations.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="τους συναδέλφους σου" />
      </div>
    );
  const members = n2MembersOf(users.data, props.viewer.userId);
  return (
    <div data-spaces>
      <p className="note">
        Οι άνθρωποι του Πελάτη «{props.clientName}» που μπαίνουν στην πύλη. Όταν
        προσκαλείς ή αφαιρείς συνάδελφο, ειδοποιείται η ομάδα της Devre Media.
      </p>
      <ColleaguesSection
        members={members}
        clientId={props.clientId}
        clientName={props.clientName}
      />
      <PendingInvitations
        invitations={n2InvitationsOf(
          invitations.data,
          colleagueInvitedBy(members),
        )}
      />
      <N2InviteForm
        title="Πρόσκληση συναδέλφου"
        clientId={props.clientId}
        clientName={props.clientName}
        roles={roles}
        footnote="Προεπιλογή: «Πλήρης». Δίνεις μόνο Ρόλους που δεν ξεπερνούν τον δικό σου. Η ομάδα της Devre Media ειδοποιείται."
      />
    </div>
  );
}
