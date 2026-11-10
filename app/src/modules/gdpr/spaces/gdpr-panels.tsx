import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import {
  BLOCK_TEXT,
  deadlineBadge,
  GDPR_EMPTY,
  GDPR_PATH,
  GDPR_TITLE,
  KIND_LABEL,
  SUBJECT_KIND_LABEL,
  ZIP_NOTE,
} from "../labels";
import { getGdprRegister, getGdprSubjects } from "../queries";
import type { GdprRequest } from "../schemas";
import { AnonymizeConfirm } from "./gdpr-anonymize";
import { CompleteForm } from "./gdpr-complete";
import { ExportButton } from "./gdpr-export";

// Τα τμήματα GDPR της N1 στη νέα εμφάνιση (prototype `screens/n1-gdpr.tsx`). Μόνο για τον Ιδιοκτήτη· η βάση αρνείται σε άλλους.

// Πού ζει το υποκείμενο: Χρήστης ομάδας στη N1, Επαφή και Πελάτης στη B2. Ο Χρήστης πελάτη δεν έχει δική του σελίδα.
export const subjectHref = (request: GdprRequest): string | undefined => {
  if (request.subjectKind === "team_user")
    return `/app/team/${request.subjectId}`;
  if (request.subjectKind === "client_user") return undefined;
  return `/app/clients/${request.subjectId}`;
};

function DeadlineBadge({ request }: { request: GdprRequest }) {
  const badge = deadlineBadge(request);
  return <Badge tone={badge.tone}>{badge.text}</Badge>;
}

export function GdprRequestRows({
  requests,
  canComplete = false,
}: {
  requests: readonly GdprRequest[];
  // Στη σελίδα των Αιτημάτων: τα ανοιχτά κλείνουν από τη γραμμή τους.
  canComplete?: boolean;
}) {
  return (
    <div className="n1-bleed">
      <RowList>
        {requests.map((r) => (
          <ListRow
            key={r.id}
            href={subjectHref(r)}
            title={`${KIND_LABEL[r.kind]}: ${r.subjectLabel}`}
            sub={`${SUBJECT_KIND_LABEL[r.subjectKind]} · Λήψη ${fmtDate(r.receivedOn)} · προθεσμία ${fmtDate(r.deadline)}${r.note ? ` · ${r.note}` : ""}`}
            aside={
              <>
                <DeadlineBadge request={r} />
                {canComplete && !r.completedOn && (
                  <CompleteForm
                    id={r.id}
                    label={`${KIND_LABEL[r.kind]}: ${r.subjectLabel}`}
                  />
                )}
              </>
            }
          />
        ))}
      </RowList>
    </div>
  );
}

// Το μητρώο με μια ματιά, στη σελίδα της Ομάδας. Η καταγραφή και το κλείσιμο γίνονται στα Αιτήματα GDPR.
export async function GdprRequests() {
  const register = await getGdprRegister();
  return (
    <Panel
      label="Αιτήματα GDPR"
      aside={<Link href={GDPR_PATH}>Όλα τα αιτήματα</Link>}
    >
      {!register.ok ? (
        <p className="muted">
          Δεν φόρτωσαν τα Αιτήματα GDPR. Δοκίμασε ξανά σε λίγο.
        </p>
      ) : register.data.requests.length === 0 ? (
        <p className="muted">{GDPR_EMPTY}</p>
      ) : (
        <GdprRequestRows requests={register.data.requests} />
      )}
      <p className="note">
        Μόνο ο Ιδιοκτήτης. Προθεσμία 1 μήνας από τη λήψη. Η εξαγωγή για πρόσωπο
        γίνεται από τη σελίδα του Χρήστη· για Πελάτη ολόκληρο, από τη σελίδα του
        Πελάτη. Νέο αίτημα καταγράφεις στα{" "}
        <Link href={GDPR_PATH}>{GDPR_TITLE}</Link>.
      </p>
    </Panel>
  );
}

interface GdprUserSectionProps {
  userId: string;
  // Η διεύθυνση της επιβεβαίωσης ανωνυμοποίησης (?confirm=anonymize).
  anonymizeHref: string;
}

// Εξαγωγή και Ανωνυμοποίηση ενός Χρήστη ομάδας. Ό,τι δεν γίνεται λέει γιατί, με τα λόγια της βάσης.
export async function GdprUserSection({
  userId,
  anonymizeHref,
}: GdprUserSectionProps) {
  const subjects = await getGdprSubjects();
  if (!subjects.ok)
    return (
      <Panel label="GDPR (μόνο Ιδιοκτήτης)">
        <p className="muted">Δεν φόρτωσε το GDPR. Δοκίμασε ξανά σε λίγο.</p>
      </Panel>
    );
  const user = subjects.data.teamUsers.find((row) => row.id === userId);
  if (!user) return null;
  return (
    <Panel label="GDPR (μόνο Ιδιοκτήτης)">
      <div className="btn-row">
        {user.block !== "anonymized" && (
          <ExportButton
            subjectKind="team_user"
            subjectId={user.id}
            label="Εξαγωγή δεδομένων"
          />
        )}
        {user.block === null ? (
          <Link className="button" data-danger href={anonymizeHref}>
            Ανωνυμοποίηση
          </Link>
        ) : (
          <button type="button" className="button" disabled>
            Ανωνυμοποίηση
          </button>
        )}
      </div>
      <p className="note">
        {ZIP_NOTE}
        {user.block && ` ${BLOCK_TEXT[user.block]}`}
      </p>
      <p className="note">
        Κάθε αίτημα καταγράφεται στα <Link href={GDPR_PATH}>{GDPR_TITLE}</Link>,
        με προθεσμία 1 μήνα.
      </p>
    </Panel>
  );
}

interface GdprAnonymizeProps {
  userId: string;
  backHref: string;
}

// Η επιβεβαίωση, ή γιατί δεν γίνεται (prototype: AnonymizeConfirm).
export async function GdprAnonymize({ userId, backHref }: GdprAnonymizeProps) {
  const subjects = await getGdprSubjects();
  const user = subjects.ok
    ? subjects.data.teamUsers.find((row) => row.id === userId)
    : undefined;
  // Μετά την ανωνυμοποίηση η σελίδα ξαναφορτώνει: εδώ λέμε ότι έγινε, όχι ότι «δεν γίνεται».
  if (user?.block === "anonymized")
    return (
      <div className="n1-danger" role="status">
        <Panel label="Ανωνυμοποίηση">
          <p>{BLOCK_TEXT.anonymized}</p>
          <Link className="button" href={backHref}>
            Πίσω στον Χρήστη
          </Link>
        </Panel>
      </div>
    );
  if (!user || user.block !== null)
    return (
      <div className="n1-danger" role="alert">
        <Panel label="Δεν γίνεται η Ανωνυμοποίηση">
          <p>
            {user?.block
              ? BLOCK_TEXT[user.block]
              : "Δεν φόρτωσε το GDPR. Δοκίμασε ξανά σε λίγο."}
          </p>
          <Link className="button" href={backHref}>
            Πίσω στον Χρήστη
          </Link>
        </Panel>
      </div>
    );
  return (
    <AnonymizeConfirm
      subjectKind="team_user"
      subjectId={user.id}
      name={user.name}
      backHref={backHref}
    />
  );
}
