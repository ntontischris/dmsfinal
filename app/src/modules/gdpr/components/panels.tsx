import Link from "next/link";

import { Panel } from "@/components/ui/panel";

import { GDPR_OWNER_ONLY, GDPR_PATH, ZIP_NOTE } from "../labels";
import { getGdprSubjects } from "../queries";
import { GdprExportButton } from "./export-button";
import { SubjectActions } from "./subject-actions";

// Τα τμήματα GDPR στις σελίδες του Χρήστη ομάδας (N1) και του Πελάτη (B2). Τα δείχνει η σελίδα μόνο στον Ιδιοκτήτη·
// τα δεδομένα τα δίνει η βάση μόνο σε αυτόν.

const PANEL_LABEL = `GDPR · ${GDPR_OWNER_ONLY}`;

function LoadFailed() {
  return (
    <Panel label={PANEL_LABEL}>
      <p className="m-0 text-sm text-destructive">
        Δεν φόρτωσε το GDPR. Δοκίμασε ξανά σε λίγο.
      </p>
    </Panel>
  );
}

const RegisterLink = () => (
  <p className="m-0 text-sm text-muted-foreground">
    Κάθε αίτημα καταγράφεται στα <Link href={GDPR_PATH}>Αιτήματα GDPR</Link>, με
    προθεσμία 1 μήνα.
  </p>
);

export async function GdprTeamUserPanel({ userId }: { userId: string }) {
  const subjects = await getGdprSubjects();
  if (!subjects.ok) return <LoadFailed />;
  const user = subjects.data.teamUsers.find((row) => row.id === userId);
  if (!user) return null;
  return (
    <Panel label={PANEL_LABEL}>
      <div className="grid gap-3">
        <SubjectActions
          kind="team_user"
          id={user.id}
          name={user.name}
          block={user.block}
        />
        <p className="m-0 text-sm text-muted-foreground">{ZIP_NOTE}</p>
        <RegisterLink />
      </div>
    </Panel>
  );
}

export async function GdprClientPanel({ clientId }: { clientId: string }) {
  const subjects = await getGdprSubjects();
  if (!subjects.ok) return <LoadFailed />;
  const client = subjects.data.clients.find((row) => row.id === clientId);
  if (!client) return null;
  const users = subjects.data.clientUsers.filter((user) =>
    user.clientIds.includes(clientId),
  );
  return (
    <Panel label={PANEL_LABEL}>
      <div className="grid gap-5">
        <section className="grid gap-2">
          <h3 className="m-0 text-base font-medium">
            Εξαγωγή δεδομένων Πελάτη
          </h3>
          <p className="m-0 text-sm text-muted-foreground">
            Στοιχεία, Χρήστες, Συμφωνίες, Τιμολόγια σε PDF, Εισπράξεις,
            Γυρίσματα, Παραδοτέα με links και Συνομιλία. {ZIP_NOTE}
          </p>
          <GdprExportButton
            subjectKind="client"
            subjectId={client.id}
            label="Εξαγωγή δεδομένων Πελάτη"
          />
        </section>
        <section className="grid gap-2">
          <h3 className="m-0 text-base font-medium">
            Επαφή: {client.contactName}
          </h3>
          <SubjectActions
            kind="contact"
            id={client.id}
            name={client.contactName}
            block={client.contactBlock}
            exportLabel="Εξαγωγή δεδομένων Επαφής"
          />
        </section>
        {users.length > 0 && (
          <section className="grid gap-2">
            <h3 className="m-0 text-base font-medium">Χρήστες πελάτη</h3>
            <ul className="m-0 grid list-none gap-3 p-0">
              {users.map((user) => (
                <li key={user.id} className="grid gap-1">
                  <span className="text-sm">{user.name}</span>
                  <GdprExportButton
                    subjectKind="client_user"
                    subjectId={user.id}
                    label={`Εξαγωγή: ${user.name}`}
                  />
                </li>
              ))}
            </ul>
            <p className="m-0 text-sm text-muted-foreground">
              Στους ενεργούς Χρήστες πελάτη υπάρχει μόνο Εξαγωγή. Ανωνυμοποίηση
              γίνεται αφού αφαιρεθούν από κάθε Πελάτη, από τα{" "}
              <Link href={GDPR_PATH}>Αιτήματα GDPR</Link>.
            </p>
          </section>
        )}
        <RegisterLink />
      </div>
    </Panel>
  );
}
