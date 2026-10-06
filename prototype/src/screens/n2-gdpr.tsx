import Link from "next/link";

import type { RoleId } from "@/data/roles";
import type { SalesClient } from "@/data/sales";
import type { ClientMembership } from "@/data/team";
import { screenHref } from "@/screens/shared";

import "./n2.css";

// GDPR στη N2: μόνο ο Ιδιοκτήτης το βλέπει. Η Διαχείριση δεν βλέπει τίποτα από αυτά.

const ZIP_CONTENTS: readonly string[] = [
  "Στοιχεία Πελάτη (JSON)",
  "Χρήστες πελάτη (CSV)",
  "Συμφωνίες (PDF)",
  "Τιμολόγια σε PDF",
  "Εισπράξεις (CSV)",
  "Γυρίσματα (CSV)",
  "Παραδοτέα με links (CSV)",
  "Συνομιλία χωρίς Εσωτερικά Μηνύματα (JSON)",
];

const ERASED =
  "όνομα (→ «Ανωνυμοποιημένος Χρήστης N»), email, τηλέφωνο, φωτογραφία, προτιμήσεις, Σύνδεσμος ημερολογίου";
const KEPT =
  "Μηνύματα και Ίχνος (με το νέο όνομα), υπογεγραμμένες Συμφωνίες και Τιμολόγια (νομική υποχρέωση διατήρησης, δεν αλλάζουν)";

interface GdprProps {
  role: RoleId;
  client: SalesClient;
  members: readonly ClientMembership[];
}

// Η Επαφή ανωνυμοποιείται μόνο αν δεν είναι και ενεργός Χρήστης πελάτη.
const contactIsActiveUser = (props: GdprProps): boolean =>
  props.members.some((m) => m.email === props.client.contact.email);

export function GdprSection(props: GdprProps) {
  const { role, client } = props;
  const isBlocked = contactIsActiveUser(props);
  return (
    <section className="card n2-section" aria-labelledby="n2-gdpr">
      <div className="card-title">
        <h2 id="n2-gdpr">GDPR</h2>
        <span className="muted">μόνο ο Ιδιοκτήτης</span>
      </div>
      <h3>Εξαγωγή δεδομένων Πελάτη (GDPR)</h3>
      <p className="muted">
        Ένα ZIP με JSON, CSV και PDF για τον «{client.name}»:
      </p>
      <ul className="n2-zip">
        {ZIP_CONTENTS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <button className="button" type="button">
        Εξαγωγή δεδομένων Πελάτη
      </button>
      <h3>Επαφή του Πελάτη</h3>
      <p>
        {client.contact.name}{" "}
        <span className="muted n2-wrap">· {client.contact.email}</span>
      </p>
      <div className="btn-row">
        <button className="button" type="button">
          Εξαγωγή
        </button>
        {isBlocked ? (
          <button className="button" type="button" disabled>
            Ανωνυμοποίηση
          </button>
        ) : (
          <Link
            className="button"
            data-danger="true"
            href={screenHref(role, "N2", {
              client: client.id,
              anon: "contact",
            })}
          >
            Ανωνυμοποίηση
          </Link>
        )}
      </div>
      {isBlocked && (
        <p className="muted">
          Η Επαφή είναι και ενεργός Χρήστης πελάτη: πρώτα την αφαιρείς, μετά
          ανωνυμοποιείται.
        </p>
      )}
      <p className="note">
        Ανωνυμοποίηση γίνεται μόνο σε Χρήστη πελάτη που αφαιρέθηκε ή στην Επαφή·
        στους ενεργούς Χρήστες υπάρχει μόνο Εξαγωγή. Ο Πελάτης ως επιχείρηση δεν
        ανωνυμοποιείται. Κάθε αίτημα γράφεται στα Αιτήματα GDPR (N1, προθεσμία 1
        μήνας) και στο Ίχνος.
      </p>
    </section>
  );
}

export function AnonymizeConfirm({
  role,
  client,
}: {
  role: RoleId;
  client: SalesClient;
}) {
  const name = client.contact.name;
  return (
    <section
      className="card n2-section"
      role="alertdialog"
      aria-labelledby="n2-anon"
    >
      <h2 id="n2-anon">Ανωνυμοποίηση: {name}</h2>
      <p className="n2-warn">Μη αναστρέψιμη. Δεν υπάρχει αναίρεση.</p>
      <dl className="dl">
        <dt>Σβήνονται</dt>
        <dd>{ERASED}</dd>
        <dt>Μένουν</dt>
        <dd>{KEPT}</dd>
      </dl>
      <form className="stack" action="#">
        <label className="n2-field">
          Γράψε «{name}» για επιβεβαίωση
          <input className="input" name="confirmName" autoComplete="off" />
        </label>
        <div className="btn-row">
          <button className="button" data-danger="true" type="button" disabled>
            Ανωνυμοποίηση
          </button>
          <Link
            className="button"
            href={screenHref(role, "N2", { client: client.id })}
          >
            Άκυρο
          </Link>
        </div>
        <p className="muted">
          Το κουμπί ενεργοποιείται μόλις το όνομα ταιριάξει ακριβώς.
        </p>
      </form>
    </section>
  );
}
