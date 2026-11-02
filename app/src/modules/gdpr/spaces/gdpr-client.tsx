import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";

import { BLOCK_TEXT, GDPR_PATH, ZIP_NOTE } from "../labels";
import { getGdprSubjects } from "../queries";
import { AnonymizeInline } from "./gdpr-anonymize-inline";
import { ExportButton } from "./gdpr-export";

import "./gdpr.css";

const PANEL_LABEL = "GDPR (μόνο Ιδιοκτήτης)";

// Το GDPR της σελίδας Πελάτη (B2) στη νέα εμφάνιση, με τις ίδιες ενέργειες με την κλασική: εξαγωγή Πελάτη,
// εξαγωγή/ανωνυμοποίηση της Επαφής, εξαγωγή των Χρηστών πελάτη. Μόνο για τον Ιδιοκτήτη· η βάση αρνείται σε άλλους.
export async function GdprClientSection({ clientId }: { clientId: string }) {
  const subjects = await getGdprSubjects();
  if (!subjects.ok)
    return (
      <Panel label={PANEL_LABEL}>
        <p className="muted">Δεν φόρτωσε το GDPR. Δοκίμασε ξανά σε λίγο.</p>
      </Panel>
    );
  const client = subjects.data.clients.find((row) => row.id === clientId);
  if (!client) return null;
  const users = subjects.data.clientUsers.filter((user) =>
    user.clientIds.includes(clientId),
  );
  return (
    <Panel label={PANEL_LABEL}>
      <p className="muted">
        Στοιχεία, Χρήστες, Συμφωνίες, Τιμολόγια σε PDF, Εισπράξεις, Γυρίσματα,
        Παραδοτέα με links και Συνομιλία. {ZIP_NOTE}
      </p>
      <div className="btn-row">
        <ExportButton
          subjectKind="client"
          subjectId={client.id}
          label="Εξαγωγή δεδομένων Πελάτη"
        />
      </div>
      <div className="n1-section">
        <p>
          <strong>Επαφή: {client.contactName}</strong>
        </p>
        <div className="btn-row">
          {client.contactBlock !== "anonymized" && (
            <ExportButton
              subjectKind="contact"
              subjectId={client.id}
              label="Εξαγωγή δεδομένων Επαφής"
            />
          )}
          {client.contactBlock === null && (
            <AnonymizeInline
              subjectKind="contact"
              subjectId={client.id}
              name={client.contactName}
            />
          )}
        </div>
        {client.contactBlock && (
          <p className="note">{BLOCK_TEXT[client.contactBlock]}</p>
        )}
      </div>
      {users.length > 0 && (
        <div className="n1-section">
          <p>
            <strong>Χρήστες πελάτη</strong>
          </p>
          <div className="n1-bleed">
            <RowList>
              {users.map((user) => (
                <ListRow
                  key={user.id}
                  title={user.name}
                  aside={
                    <ExportButton
                      subjectKind="client_user"
                      subjectId={user.id}
                      label={`Εξαγωγή: ${user.name}`}
                    />
                  }
                />
              ))}
            </RowList>
          </div>
          <p className="note">
            Στους ενεργούς Χρήστες πελάτη υπάρχει μόνο Εξαγωγή. Ανωνυμοποίηση
            γίνεται αφού αφαιρεθούν από κάθε Πελάτη, από τα{" "}
            <Link href={GDPR_PATH}>Αιτήματα GDPR</Link>.
          </p>
        </div>
      )}
      <p className="note">
        Κάθε αίτημα καταγράφεται στα <Link href={GDPR_PATH}>Αιτήματα GDPR</Link>
        , με προθεσμία 1 μήνα.
      </p>
    </Panel>
  );
}
