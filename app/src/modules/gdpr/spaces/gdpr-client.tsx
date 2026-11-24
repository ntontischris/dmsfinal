import Link from "next/link";

import { BLOCK_TEXT, GDPR_PATH, GDPR_TITLE, ZIP_NOTE } from "../labels";
import { getGdprSubjects } from "../queries";
import { AnonymizeInline } from "./gdpr-anonymize-inline";
import { ExportButton } from "./gdpr-export";
import { GdprBox, GdprLine, GdprSection } from "./gdpr-parts";

const PANEL_LABEL = "GDPR (μόνο Ιδιοκτήτης)";

// Το GDPR της σελίδας Πελάτη (B2) στο ίδιο ύφος με την Ομάδα και τη σελίδα Χρήστη, με τις ίδιες ενέργειες: εξαγωγή
// Πελάτη, εξαγωγή/ανωνυμοποίηση της Επαφής, εξαγωγή των Χρηστών πελάτη. Μόνο για τον Ιδιοκτήτη· η βάση αρνείται σε άλλους.
export async function GdprClientSection({ clientId }: { clientId: string }) {
  const subjects = await getGdprSubjects();
  if (!subjects.ok)
    return (
      <GdprBox title={PANEL_LABEL} hint="Εξαγωγή και Ανωνυμοποίηση">
        <p className="muted">Δεν φόρτωσε το GDPR. Δοκίμασε ξανά σε λίγο.</p>
      </GdprBox>
    );
  const client = subjects.data.clients.find((row) => row.id === clientId);
  if (!client) return null;
  const users = subjects.data.clientUsers.filter((user) =>
    user.clientIds.includes(clientId),
  );
  return (
    <GdprBox
      title={PANEL_LABEL}
      hint="Εξαγωγή Πελάτη, Επαφής και Χρηστών"
      isDanger
    >
      <p className="g-note">
        Στοιχεία, Χρήστες, Συμφωνίες, Τιμολόγια σε PDF, Εισπράξεις, Γυρίσματα,
        Παραδοτέα με links και Συνομιλία. {ZIP_NOTE}
      </p>
      <div className="ml-actions">
        <ExportButton
          subjectKind="client"
          subjectId={client.id}
          label="Εξαγωγή δεδομένων Πελάτη"
        />
      </div>
      <GdprSection
        title={`Επαφή: ${client.contactName}`}
        hint={client.contactBlock ? BLOCK_TEXT[client.contactBlock] : undefined}
      >
        <div className="ml-actions">
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
      </GdprSection>
      {users.length > 0 && (
        <GdprSection
          title="Χρήστες πελάτη"
          hint="Μόνο Εξαγωγή όσο ανήκουν σε Πελάτη"
        >
          <ul className="ml-list">
            {users.map((user) => (
              <GdprLine
                key={user.id}
                name={user.name}
                title={user.name}
                quick={
                  <ExportButton
                    subjectKind="client_user"
                    subjectId={user.id}
                    label={`Εξαγωγή: ${user.name}`}
                  />
                }
              />
            ))}
          </ul>
          <p className="g-note">
            Ανωνυμοποίηση γίνεται αφού αφαιρεθούν από κάθε Πελάτη, από τα
            Αιτήματα GDPR.
          </p>
        </GdprSection>
      )}
      <p className="g-note">
        Κάθε αίτημα καταγράφεται στα Αιτήματα GDPR, με προθεσμία 1 μήνα.
      </p>
      <div className="ml-actions">
        <Link data-primary href={GDPR_PATH}>
          {GDPR_TITLE}
        </Link>
      </div>
    </GdprBox>
  );
}
