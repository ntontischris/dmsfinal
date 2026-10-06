import Link from "next/link";

import type { RoleId } from "@/data/roles";
import type { TeamUser } from "@/data/team";
import {
  invitationState,
  roleNames,
  teamInvitations,
  teamUserName,
} from "@/data/team-access";
import { RolePicker } from "@/screens/n1-roles";
import { Badge, fmtDate, screenHref } from "@/screens/shared";

interface InviteProps {
  role: RoleId;
  actor: TeamUser;
}

export function InviteForm({ role, actor }: InviteProps) {
  return (
    <section className="card n1-section" id="n1-invite">
      <h2 className="card-title">Πρόσκληση Χρήστη</h2>
      <form className="n1-form">
        <div className="n1-field">
          <label htmlFor="n1-inv-name">Ονοματεπώνυμο</label>
          <input id="n1-inv-name" className="input" name="name" />
        </div>
        <div className="n1-field">
          <label htmlFor="n1-inv-email">Email</label>
          <input
            id="n1-inv-email"
            className="input"
            type="email"
            name="email"
          />
          <p className="n1-help">
            Παράδειγμα σφάλματος: «Αυτό το email ανήκει σε Χρήστη πελάτη· ένας
            Χρήστης δεν έχει και τα δύο είδη».
          </p>
          <p className="muted">
            Αν το email ανήκει σε απενεργοποιημένο Χρήστη ομάδας (π.χ.
            petros@example.com), δεν στέλνεται πρόσκληση: προτείνεται{" "}
            <Link href={screenHref(role, "N1", { user: "petros" })}>
              Επανενεργοποίηση
            </Link>
            .
          </p>
        </div>
        <RolePicker actor={actor} idPrefix="n1-inv" selected={[]} />
        <div className="n1-field">
          <label htmlFor="n1-inv-lang">Γλώσσα πρόσκλησης</label>
          <select
            id="n1-inv-lang"
            className="input"
            name="lang"
            defaultValue="el"
          >
            <option value="el">Ελληνικά</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="btn-row">
          <button type="button" className="button" data-primary>
            Αποστολή πρόσκλησης
          </button>
        </div>
      </form>
      <p className="note">
        Ο σύνδεσμος της πρόσκλησης ισχύει 7 μέρες. Δίνεις μόνο Ρόλους που δεν
        ξεπερνούν τα δικά σου Δικαιώματα· τον Ρόλο Ιδιοκτήτης τον δίνει μόνο ο
        Ιδιοκτήτης.
      </p>
      <p className="note">
        {role === "owner"
          ? "Όταν άλλος (π.χ. η Διαχείριση) προσκαλεί ή αλλάζει Ρόλους, παίρνεις Ειδοποίηση (Γεγονός 58 «Αλλαγή πρόσβασης ομάδας»)."
          : "Ο Ιδιοκτήτης παίρνει Ειδοποίηση για κάθε πρόσκληση ή αλλαγή Ρόλων που κάνεις (Γεγονός 58 «Αλλαγή πρόσβασης ομάδας»)."}
      </p>
    </section>
  );
}

export function InvitationList() {
  const invitations = teamInvitations();
  return (
    <section className="card n1-section">
      <h2 className="card-title">Προσκλήσεις σε εκκρεμότητα</h2>
      {invitations.length === 0 ? (
        <p className="muted">Καμία πρόσκληση σε εκκρεμότητα.</p>
      ) : (
        <ul className="list">
          {invitations.map((inv) => {
            const state = invitationState(inv);
            return (
              <li key={inv.id}>
                <div className="row">
                  <div>
                    <strong>{inv.name}</strong>{" "}
                    <span className="n1-email muted">{inv.email}</span>
                    <div className="muted">
                      {roleNames(inv.roleIds)} · από{" "}
                      {teamUserName(inv.invitedBy)} · στάλθηκε{" "}
                      {fmtDate(inv.sentAt)} ·{" "}
                      {state === "έληξε" ? "έληξε" : "λήγει"}{" "}
                      {fmtDate(inv.expiresAt)}
                    </div>
                  </div>
                  <Badge tone={state === "έληξε" ? "attention" : undefined}>
                    {state}
                  </Badge>
                </div>
                <div className="btn-row">
                  <button type="button" className="button">
                    Επαναποστολή
                  </button>
                  {state === "εκκρεμεί" && (
                    <button type="button" className="button" data-danger>
                      Ακύρωση
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="note">
        Επαναποστολή = νέος σύνδεσμος 7 ημερών, ο παλιός ακυρώνεται. Μια ληγμένη
        πρόσκληση μένει εδώ 30 μέρες.
      </p>
    </section>
  );
}
