import Link from "next/link";

import { isOwner, type Viewer } from "@/modules/access";
import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import {
  BLOCK_TEXT,
  GDPR_EMPTY,
  GDPR_NO_ACCESS,
  GDPR_NOTE,
  GDPR_PATH,
} from "../labels";
import { getGdprRegister, getGdprSubjects } from "../queries";
import type { GdprSubjects } from "../schemas";
import { AnonymizeConfirm } from "./gdpr-anonymize";
import { ExportButton } from "./gdpr-export";
import { GdprRequestRows } from "./gdpr-panels";
import { RequestForm } from "./gdpr-request";

import "./gdpr.css";

// Οι Χρήστες πελάτη που δεν ανήκουν πια σε κανέναν Πελάτη: δεν έχουν άλλη σελίδα, άρα η Εξαγωγή και η Ανωνυμοποίησή τους ζουν εδώ.
function DetachedClientUsers({ subjects }: { subjects: GdprSubjects }) {
  const users = subjects.clientUsers.filter(
    (user) => user.clientIds.length === 0,
  );
  return (
    <Panel label={`Χρήστες πελάτη χωρίς Πελάτη (${users.length})`}>
      {users.length === 0 ? (
        <p className="muted">
          Κανένας. Όποιος αφαιρεθεί από κάθε Πελάτη εμφανίζεται εδώ.
        </p>
      ) : (
        <div className="n1-bleed">
          <RowList>
            {users.map((user) => (
              <ListRow
                key={user.id}
                lead={<Avatar name={user.name} size={36} />}
                title={user.name}
                sub={user.block ? BLOCK_TEXT[user.block] : undefined}
                aside={
                  <>
                    {user.block !== "anonymized" && (
                      <ExportButton
                        subjectKind="client_user"
                        subjectId={user.id}
                        label="Εξαγωγή δεδομένων"
                      />
                    )}
                    {user.block === null && (
                      <Link
                        className="button"
                        data-danger
                        href={`${GDPR_PATH}?anonymize=${encodeURIComponent(user.id)}`}
                      >
                        Ανωνυμοποίηση
                      </Link>
                    )}
                  </>
                }
              />
            ))}
          </RowList>
        </div>
      )}
    </Panel>
  );
}

function Confirm({
  subjects,
  userId,
}: {
  subjects: GdprSubjects;
  userId: string;
}) {
  const user = subjects.clientUsers.find(
    (row) => row.id === userId && row.clientIds.length === 0,
  );
  if (!user || user.block !== null)
    return (
      <div className="n1-danger" role="alert">
        <Panel label="Δεν γίνεται η Ανωνυμοποίηση">
          <p>
            {user?.block ? BLOCK_TEXT[user.block] : "Το πρόσωπο δεν βρέθηκε."}
          </p>
          <Link className="button" href={GDPR_PATH}>
            Πίσω στα Αιτήματα
          </Link>
        </Panel>
      </div>
    );
  return (
    <AnonymizeConfirm
      subjectKind="client_user"
      subjectId={user.id}
      name={user.name}
      backHref={GDPR_PATH}
    />
  );
}

interface SpacesGdprProps {
  viewer: Viewer;
  anonymize: string | undefined;
}

// Αιτήματα GDPR στη νέα εμφάνιση: το μητρώο του prototype (`screens/n1-gdpr.tsx`) με κλείσιμο ανά γραμμή, η καταγραφή
// νέου αιτήματος και οι Χρήστες πελάτη χωρίς Πελάτη. Μόνο ο Ιδιοκτήτης.
export async function SpacesGdpr({ viewer, anonymize }: SpacesGdprProps) {
  if (!isOwner(viewer))
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {GDPR_NO_ACCESS}
        </StateNotice>
      </div>
    );
  const [register, subjects] = await Promise.all([
    getGdprRegister(),
    getGdprSubjects(),
  ]);
  if (!register.ok || !subjects.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="τα Αιτήματα GDPR" />
      </div>
    );
  const open = register.data.requests.filter((r) => !r.completedOn).length;
  return (
    <div data-spaces>
      <p>
        <Link href={hrefOf("N1")}>← Ομάδα</Link>
      </p>
      {anonymize && <Confirm subjects={subjects.data} userId={anonymize} />}
      <Panel label="Αιτήματα GDPR" aside={`${open} ανοιχτά`}>
        {register.data.requests.length === 0 ? (
          <p className="muted">{GDPR_EMPTY}</p>
        ) : (
          <GdprRequestRows requests={register.data.requests} canComplete />
        )}
        <p className="note">Μόνο ο Ιδιοκτήτης. {GDPR_NOTE}</p>
      </Panel>
      <Panel label="Νέο αίτημα">
        <RequestForm subjects={subjects.data} />
      </Panel>
      <DetachedClientUsers subjects={subjects.data} />
    </div>
  );
}
