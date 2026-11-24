import Link from "next/link";

import { isOwner, type Viewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import {
  BLOCK_TEXT,
  GDPR_EMPTY,
  GDPR_NO_ACCESS,
  GDPR_NOTE,
  GDPR_PATH,
  GDPR_TITLE,
} from "../labels";
import { getGdprRegister, getGdprSubjects } from "../queries";
import type { GdprSubjects } from "../schemas";
import { AnonymizeConfirm } from "./gdpr-anonymize";
import { ExportButton } from "./gdpr-export";
import { GdprRequestRows } from "./gdpr-panels";
import { GdprConfirmCard, GdprLine, GdprSection } from "./gdpr-parts";
import { RequestForm } from "./gdpr-request";

// Οι Χρήστες πελάτη που δεν ανήκουν πια σε κανέναν Πελάτη: δεν έχουν άλλη σελίδα, άρα η Εξαγωγή και η Ανωνυμοποίησή τους ζουν εδώ.
function DetachedClientUsers({ subjects }: { subjects: GdprSubjects }) {
  const users = subjects.clientUsers.filter(
    (user) => user.clientIds.length === 0,
  );
  return (
    <GdprSection
      title={`Χρήστες πελάτη χωρίς Πελάτη (${users.length})`}
      hint="Δεν έχουν άλλη σελίδα: Εξαγωγή και Ανωνυμοποίηση γίνονται εδώ"
    >
      {users.length === 0 ? (
        <p className="ml-empty">
          Κανένας. Όποιος αφαιρεθεί από κάθε Πελάτη εμφανίζεται εδώ.
        </p>
      ) : (
        <ul className="ml-list">
          {users.map((user) => (
            <GdprLine
              key={user.id}
              name={user.name}
              title={user.name}
              sub={user.block ? BLOCK_TEXT[user.block] : undefined}
              isFaded={user.block === "anonymized"}
              quick={
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
        </ul>
      )}
    </GdprSection>
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
      <GdprConfirmCard title="Δεν γίνεται η Ανωνυμοποίηση" role="alert">
        <p>
          {user?.block ? BLOCK_TEXT[user.block] : "Το πρόσωπο δεν βρέθηκε."}
        </p>
        <div className="ml-actions">
          <Link href={GDPR_PATH}>Πίσω στα Αιτήματα</Link>
        </div>
      </GdprConfirmCard>
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
    <div data-spaces className="g-stack">
      <p>
        <Link href={hrefOf("N1")}>← Ομάδα</Link>
      </p>
      <header className="ml-hero">
        <span className="ml-hero-mono" aria-hidden="true">
          G
        </span>
        <div>
          <span className="ml-tag">{`μόνο ο Ιδιοκτήτης · ${open} ανοιχτά`}</span>
          <h1 data-page-title>{GDPR_TITLE}</h1>
          <p>{GDPR_NOTE}</p>
        </div>
      </header>
      {anonymize && <Confirm subjects={subjects.data} userId={anonymize} />}
      <GdprSection
        title="Όλα τα αιτήματα"
        hint={`${register.data.requests.length} συνολικά · ${open} ανοιχτά`}
      >
        {register.data.requests.length === 0 ? (
          <p className="ml-empty">{GDPR_EMPTY}</p>
        ) : (
          <GdprRequestRows requests={register.data.requests} canComplete />
        )}
      </GdprSection>
      <GdprSection
        title="Νέο αίτημα"
        hint="Η προθεσμία υπολογίζεται από την ημερομηνία λήψης"
      >
        <RequestForm subjects={subjects.data} />
      </GdprSection>
      <DetachedClientUsers subjects={subjects.data} />
    </div>
  );
}
