import Link from "next/link";

import type { RoleId } from "@/data/roles";
import type { ClientMembership } from "@/data/team";
import { otherClientsOf } from "@/data/team-access";
import {
  clientNameOf,
  hasProposalAwaitingSignature,
  isSignatoryAt,
  personName,
} from "@/screens/n2-members";
import { screenHref } from "@/screens/shared";

import "./n2.css";

// Η προειδοποίηση για τον Υπογράφοντα (κοινή με τη N3).
export function SignatoryWarning({ m }: { m: ClientMembership }) {
  if (!isSignatoryAt(m.email, m.clientId)) return null;
  return (
    <p className="n2-warn" role="status">
      {hasProposalAwaitingSignature(m.clientId)
        ? "Είναι ο Υπογράφων σε πρόταση που περιμένει υπογραφή: η πρόταση θα χρειαστεί νέο Υπογράφοντα."
        : "Είναι ο Υπογράφων του Πελάτη. Η επόμενη πρόταση θα χρειαστεί νέο Υπογράφοντα."}
    </p>
  );
}

interface RemoveProps {
  role: RoleId;
  m: ClientMembership;
  isOwner: boolean;
}

function AccountOutcome({ m }: { m: ClientMembership }) {
  const others = otherClientsOf(m.email, m.clientId);
  if (others.length === 0) {
    return (
      <p>
        Δεν ανήκει σε άλλον Πελάτη, οπότε{" "}
        <strong>ο λογαριασμός του απενεργοποιείται</strong>: οι συνεδρίες του
        κλείνουν και δεν μπαίνει πια. Το όνομά του μένει στα Μηνύματα και στο
        Ίχνος.
      </p>
    );
  }
  return (
    <p>
      Ο λογαριασμός <strong>μένει ενεργός</strong>: συνεχίζει στους Πελάτες{" "}
      {others.map(clientNameOf).join(", ")}. Απλώς δεν βλέπει πια αυτόν τον
      Πελάτη.
    </p>
  );
}

export function RemoveConfirm({ role, m, isOwner }: RemoveProps) {
  const name = personName(m.email);
  const client = clientNameOf(m.clientId);
  const isDeactivated = otherClientsOf(m.email, m.clientId).length === 0;
  return (
    <section
      className="card n2-section"
      role="alertdialog"
      aria-labelledby="n2-remove"
    >
      <h2 id="n2-remove">
        Αφαίρεση {name} από τον Πελάτη «{client}»;
      </h2>
      <p>
        Ο Χρήστης πελάτη βγαίνει από τον Πελάτη «{client}»: δεν βλέπει πια
        Συμφωνίες, Παραγωγές, Οικονομικά και Συνομιλία του.
      </p>
      <AccountOutcome m={m} />
      <SignatoryWarning m={m} />
      {isOwner && isDeactivated && (
        <p className="note">
          Μετά την αφαίρεση, αν το ζητήσει, μπορείς να κάνεις Ανωνυμοποίηση
          (GDPR) στο πρόσωπο.
        </p>
      )}
      <div className="btn-row">
        <button className="button" data-danger="true" type="button">
          Ναι, αφαίρεση
        </button>
        <Link
          className="button"
          href={screenHref(role, "N2", { client: m.clientId })}
        >
          Άκυρο
        </Link>
      </div>
    </section>
  );
}
