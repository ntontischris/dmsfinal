import Link from "next/link";

import type { RoleId } from "@/data/roles";
import { GDPR_REQUESTS, type GdprRequest, type TeamUser } from "@/data/team";
import { TODAY, teamUserName } from "@/data/team-access";
import { Badge, fmtDate, screenHref } from "@/screens/shared";

const DAY_MS = 86_400_000;

// Προθεσμία: 1 μήνας από τη λήψη.
const deadlineOf = (receivedAt: string): string => {
  const date = new Date(`${receivedAt}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
};

const daysUntil = (iso: string): number =>
  Math.round(
    (Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${TODAY}T00:00:00Z`)) /
      DAY_MS,
  );

function DeadlineBadge({ request }: { request: GdprRequest }) {
  if (request.doneAt)
    return <Badge>ολοκληρώθηκε {fmtDate(request.doneAt)}</Badge>;
  const days = daysUntil(deadlineOf(request.receivedAt));
  if (days < 0) return <Badge tone="attention">η προθεσμία πέρασε</Badge>;
  return (
    <Badge tone={days <= 7 ? "attention" : undefined}>
      λήγει σε {days} μέρες
    </Badge>
  );
}

export function GdprRequests() {
  return (
    <section className="card n1-section">
      <h2 className="card-title">Αιτήματα GDPR</h2>
      {GDPR_REQUESTS.length === 0 ? (
        <p className="muted">
          Κανένα αίτημα. Κάθε εξαγωγή ή ανωνυμοποίηση καταγράφεται εδώ.
        </p>
      ) : (
        <ul className="list">
          {GDPR_REQUESTS.map((r) => (
            <li key={r.id} className="row">
              <div>
                <strong>{r.kind}</strong>: {r.subject}
                <div className="muted">
                  Λήψη {fmtDate(r.receivedAt)} · προθεσμία{" "}
                  {fmtDate(deadlineOf(r.receivedAt))} · {teamUserName(r.by)}
                </div>
              </div>
              <DeadlineBadge request={r} />
            </li>
          ))}
        </ul>
      )}
      <p className="note">
        Μόνο ο Ιδιοκτήτης. Προθεσμία 1 μήνας από τη λήψη. Η εξαγωγή για πρόσωπο
        γίνεται από τη σελίδα του Χρήστη· για Πελάτη ολόκληρο, από τη σελίδα του
        Πελάτη.
      </p>
    </section>
  );
}

interface GdprUserProps {
  role: RoleId;
  target: TeamUser;
}

export function GdprUserSection({ role, target }: GdprUserProps) {
  const canAnonymize = target.status === "απενεργοποιημένος";
  return (
    <section className="card n1-section">
      <h2 className="card-title">GDPR (μόνο Ιδιοκτήτης)</h2>
      <div className="btn-row">
        <button type="button" className="button">
          Εξαγωγή δεδομένων
        </button>
        {canAnonymize ? (
          <Link
            className="button"
            data-danger
            href={screenHref(role, "N1", {
              user: target.id,
              confirm: "anonymize",
            })}
          >
            Ανωνυμοποίηση
          </Link>
        ) : (
          <button type="button" className="button" disabled>
            Ανωνυμοποίηση
          </button>
        )}
      </div>
      <p className="note">
        Εξαγωγή: ένα ZIP με JSON, CSV και PDF· γράφεται στο Ίχνος.
        {!canAnonymize &&
          " Ανωνυμοποίηση γίνεται μόνο σε απενεργοποιημένο Χρήστη ομάδας."}
      </p>
    </section>
  );
}

export function AnonymizeConfirm({ role, target }: GdprUserProps) {
  const back = screenHref(role, "N1", { user: target.id });
  if (target.status !== "απενεργοποιημένος") {
    return (
      <section className="card n1-section n1-danger" role="alert">
        <h2 className="card-title">Δεν γίνεται η Ανωνυμοποίηση</h2>
        <p>
          Ανωνυμοποιείται μόνο απενεργοποιημένος Χρήστης ομάδας. Πρώτα
          Απενεργοποίηση.
        </p>
        <Link className="button" href={back}>
          Πίσω στον Χρήστη
        </Link>
      </section>
    );
  }
  return (
    <section className="card n1-section n1-danger">
      <h2 className="card-title">Ανωνυμοποίηση: {target.name}</h2>
      <p>
        <strong>Μη αναστρέψιμη.</strong> Σβήνονται: όνομα (γίνεται
        «Ανωνυμοποιημένος Χρήστης N»), email, τηλέφωνο, φωτογραφία, προτιμήσεις,
        Σύνδεσμος ημερολογίου.
      </p>
      <p className="muted">
        Μένουν: Μηνύματα και Ίχνος (με το νέο όνομα), υπογεγραμμένες Συμφωνίες
        και Τιμολόγια (νομική υποχρέωση διατήρησης, δεν αλλάζουν).
      </p>
      <div className="n1-field">
        <label htmlFor="n1-anon-name">
          Γράψε «{target.name}» για επιβεβαίωση
        </label>
        <input id="n1-anon-name" className="input" autoComplete="off" />
      </div>
      <div className="btn-row n1-section">
        <button type="button" className="button" data-danger disabled>
          Ανωνυμοποίηση οριστικά
        </button>
        <Link className="button" href={back}>
          Άκυρο
        </Link>
      </div>
      <p className="note">
        Το κουμπί ενεργοποιείται όταν το όνομα ταιριάζει ακριβώς.
      </p>
    </section>
  );
}
