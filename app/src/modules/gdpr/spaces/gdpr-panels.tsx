import Link from "next/link";

import { fmtDate } from "@/spaces/screens/shared";

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
import { GdprBox, GdprConfirmCard, GdprLine } from "./gdpr-parts";

// Τα τμήματα GDPR (prototype `screens/n1-gdpr.tsx`) στο ύφος των κλειστών κουτιών. Μόνο για τον Ιδιοκτήτη· η βάση
// αρνείται σε άλλους. Το κεντρικό σπίτι είναι τα Αιτήματα GDPR (/app/team/gdpr)· η Ομάδα και η σελίδα Χρήστη δείχνουν εκεί.

// Πού ζει το υποκείμενο: Χρήστης ομάδας στη N1, Επαφή και Πελάτης στη B2. Ο Χρήστης πελάτη δεν έχει δική του σελίδα.
export const subjectHref = (request: GdprRequest): string | undefined => {
  if (request.subjectKind === "team_user")
    return `/app/team/${request.subjectId}`;
  if (request.subjectKind === "client_user") return undefined;
  return `/app/clients/${request.subjectId}`;
};

const PANEL_LABEL = "GDPR (μόνο Ιδιοκτήτης)";
const LOAD_FAILED = "Δεν φόρτωσε το GDPR. Δοκίμασε ξανά σε λίγο.";

export function GdprRequestRows({
  requests,
  canComplete = false,
}: {
  requests: readonly GdprRequest[];
  // Στη σελίδα των Αιτημάτων: τα ανοιχτά κλείνουν από τη γραμμή τους.
  canComplete?: boolean;
}) {
  return (
    <ul className="ml-list">
      {requests.map((r) => {
        const title = `${KIND_LABEL[r.kind]}: ${r.subjectLabel}`;
        return (
          <GdprLine
            key={r.id}
            name={r.subjectLabel}
            href={subjectHref(r)}
            title={title}
            tag={deadlineBadge(r).text}
            isFaded={Boolean(r.completedOn)}
            sub={`${SUBJECT_KIND_LABEL[r.subjectKind]} · Λήψη ${fmtDate(r.receivedOn)} · προθεσμία ${fmtDate(r.deadline)}${r.note ? ` · ${r.note}` : ""}`}
            quick={
              canComplete && !r.completedOn ? (
                <CompleteForm id={r.id} label={title} />
              ) : undefined
            }
          />
        );
      })}
    </ul>
  );
}

function GoToRequests({ label }: { label: string }) {
  return (
    <div className="ml-actions">
      <Link data-primary href={GDPR_PATH}>
        {label}
      </Link>
    </div>
  );
}

// Το μητρώο με μια ματιά, στη σελίδα της Ομάδας. Η καταγραφή και το κλείσιμο γίνονται στα Αιτήματα GDPR.
export async function GdprRequests() {
  const register = await getGdprRegister();
  const open = register.ok
    ? register.data.requests.filter((r) => !r.completedOn).length
    : 0;
  return (
    <GdprBox title={GDPR_TITLE} hint={`Μόνο ο Ιδιοκτήτης · ${open} ανοιχτά`}>
      {!register.ok ? (
        <p className="muted">
          Δεν φόρτωσαν τα Αιτήματα GDPR. Δοκίμασε ξανά σε λίγο.
        </p>
      ) : register.data.requests.length === 0 ? (
        <p className="ml-empty">{GDPR_EMPTY}</p>
      ) : (
        <GdprRequestRows requests={register.data.requests} />
      )}
      <p className="g-note">
        Προθεσμία 1 μήνας από τη λήψη. Η εξαγωγή για πρόσωπο γίνεται από τη
        σελίδα του Χρήστη· για Πελάτη ολόκληρο, από τη σελίδα του Πελάτη.
      </p>
      <GoToRequests label="Όλα τα αιτήματα" />
    </GdprBox>
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
      <GdprBox title={PANEL_LABEL} hint="Εξαγωγή και Ανωνυμοποίηση">
        <p className="muted">{LOAD_FAILED}</p>
      </GdprBox>
    );
  const user = subjects.data.teamUsers.find((row) => row.id === userId);
  if (!user) return null;
  return (
    <GdprBox
      title={PANEL_LABEL}
      hint={user.block ? BLOCK_TEXT[user.block] : "Εξαγωγή και Ανωνυμοποίηση"}
    >
      <p className="g-note">
        {ZIP_NOTE}
        {user.block && ` ${BLOCK_TEXT[user.block]}`}
      </p>
      <div className="ml-actions">
        {user.block !== "anonymized" && (
          <ExportButton
            subjectKind="team_user"
            subjectId={user.id}
            label="Εξαγωγή δεδομένων"
          />
        )}
        {user.block === null ? (
          <Link data-danger href={anonymizeHref}>
            Ανωνυμοποίηση
          </Link>
        ) : (
          <button type="button" disabled>
            Ανωνυμοποίηση
          </button>
        )}
      </div>
      <p className="g-note">
        Κάθε αίτημα καταγράφεται στα Αιτήματα GDPR, με προθεσμία 1 μήνα.
      </p>
      <GoToRequests label={GDPR_TITLE} />
    </GdprBox>
  );
}

interface GdprAnonymizeProps {
  userId: string;
  backHref: string;
}

function BackToUser({ href }: { href: string }) {
  return (
    <div className="ml-actions">
      <Link href={href}>Πίσω στον Χρήστη</Link>
    </div>
  );
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
      <GdprConfirmCard title="Ανωνυμοποίηση" role="status">
        <p>{BLOCK_TEXT.anonymized}</p>
        <BackToUser href={backHref} />
      </GdprConfirmCard>
    );
  if (!user || user.block !== null)
    return (
      <GdprConfirmCard title="Δεν γίνεται η Ανωνυμοποίηση" role="alert">
        <p>{user?.block ? BLOCK_TEXT[user.block] : LOAD_FAILED}</p>
        <BackToUser href={backHref} />
      </GdprConfirmCard>
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
