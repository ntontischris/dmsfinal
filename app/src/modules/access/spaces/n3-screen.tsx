import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice, fmtDate } from "@/spaces/screens/shared";

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
import { N2RemoveButton } from "./n2-forms";
import { PendingInvitations } from "./n2-sections";
import { InvitePanel } from "./invite-panel";
import { Hero, Line, ListSection } from "./n-parts";

import "./n2.css";

const TEAM_NOTE = "Η ομάδα της Devre Media ειδοποιείται για την αφαίρεση.";

const pluralColleagues = (n: number): string =>
  n === 1 ? "1 συνάδελφος" : `${n} συνάδελφοι`;

function ColleagueSub({ m }: { m: N2Member }) {
  return (
    <>
      <span className="n2-wrap">{m.email}</span> · μπήκε {fmtDate(m.joinedAt)}
      {m.isMe && (
        <>
          <br />
          Δεν αφαιρείς τον εαυτό σου. Για αποχώρηση, γράψε στη{" "}
          <Link href={hrefOf("J1")}>Συνομιλία</Link>.
        </>
      )}
    </>
  );
}

function ColleaguesSection(props: {
  members: readonly N2Member[];
  clientId: string;
  clientName: string;
}) {
  return (
    <div role="group" aria-label="Συνάδελφοι">
      <ListSection
        title="Συνάδελφοι"
        hint={pluralColleagues(props.members.length)}
      >
        {props.members.length === 0 ? (
          <p className="ml-empty">
            Δεν υπάρχουν ακόμα συνάδελφοι. Προσκάλεσε κάποιον από την ομάδα σου
            από κάτω.
          </p>
        ) : (
          <ul className="ml-list">
            {props.members.map((m) => (
              <Line
                key={m.id}
                name={m.name}
                title={m.name}
                tag={m.isMe ? `${m.role} · εσύ` : m.role}
                sub={<ColleagueSub m={m} />}
                quick={
                  m.isMe ? undefined : (
                    <N2RemoveButton
                      clientId={props.clientId}
                      clientName={props.clientName}
                      userId={m.id}
                      name={m.name}
                      note={TEAM_NOTE}
                    />
                  )
                }
              />
            ))}
          </ul>
        )}
      </ListSection>
    </div>
  );
}

// N3 Συνάδελφοι: ο Χρήστης πελάτη βλέπει και προσκαλεί συναδέλφους στον τρέχοντα Πελάτη του (c.colleagues).
// Κεφαλίδα με τον τίτλο της σελίδας (το μενού προφίλ δεν έχει κεφαλίδα θέματος), λίστα στο ύφος των «Χρημάτων»,
// προσκλήσεις σε αναμονή και η πρόσκληση σε αριθμημένα βήματα (ίδια με τη N6). Η βάση κρίνει κάθε ενέργεια.
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
    <div data-spaces className="n-stack">
      <Hero
        mono="Σ"
        tag={props.clientName}
        title="Συνάδελφοι"
        lead="Οι άνθρωποι του Πελάτη που μπαίνουν στην πύλη. Όταν προσκαλείς ή αφαιρείς συνάδελφο, ειδοποιείται η ομάδα της Devre Media."
        isDetail
      />
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
      <InvitePanel
        title="Πρόσκληση συναδέλφου"
        team={null}
        client={{
          clients: [{ id: props.clientId, name: props.clientName }],
          roles,
          presetClientId: props.clientId,
        }}
        footnote="Προεπιλογή: «Πλήρης». Δίνεις μόνο Ρόλους που δεν ξεπερνούν τον δικό σου. Η ομάδα της Devre Media ειδοποιείται."
      />
    </div>
  );
}
