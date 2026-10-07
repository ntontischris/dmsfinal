import Link from "next/link";

import { CLIENT_COUNTERS } from "@/data/profile";
import type { RoleId } from "@/data/roles";
import { findClient } from "@/data/sales";
import type { ClientMembership } from "@/data/team";
import { roleNames } from "@/data/team-access";
import { Badge, screenHref } from "@/screens/shared";

interface CardsProps {
  role: RoleId;
  memberships: readonly ClientMembership[];
  currentId: string;
  as: string;
}

export function ClientCards({ role, memberships, currentId, as }: CardsProps) {
  return (
    <div className="grid2">
      {memberships.map((m) => {
        const counters = CLIENT_COUNTERS[m.clientId];
        const isCurrent = m.clientId === currentId;
        const name = findClient(m.clientId)?.name ?? m.clientId;
        return (
          <section key={m.clientId} className="card o-card">
            <div className="card-title">
              <h2>{name}</h2>
              {isCurrent && <Badge tone="strong">Δουλεύεις τώρα με</Badge>}
            </div>
            <p className="muted">Ρόλος σου: {roleNames([m.roleId])}</p>
            <ul className="list">
              <li>Αδιάβαστα: {counters?.unread ?? 0}</li>
              <li>Εκδόσεις για έγκριση: {counters?.versionsToApprove ?? 0}</li>
              <li>Τιμολόγια ανοιχτά: {counters?.openInvoices ?? 0}</li>
            </ul>
            {!isCurrent && (
              <Link
                className="button"
                href={screenHref(role, "A4", { as, to: m.clientId })}
              >
                Αλλαγή
              </Link>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function SwitchRules() {
  return (
    <section className="card o-card">
      <h2>Πώς δουλεύει η εναλλαγή</h2>
      <ul className="list">
        <li>Στην είσοδο ανοίγει ο Πελάτης που χρησιμοποίησες τελευταίο.</li>
        <li>Την πρώτη φορά εμφανίζεται επιλογή.</li>
        <li>
          Σύνδεσμος από email για άλλον Πελάτη κάνει μόνος του την εναλλαγή.
        </li>
        <li>
          Αν δεν ανήκεις πια σε εκείνον τον Πελάτη, βλέπεις «Χωρίς δικαίωμα».
        </li>
        <li>
          Το καμπανάκι δείχνει όλους τους Πελάτες σου, με το όνομα του Πελάτη σε
          κάθε Ειδοποίηση.
        </li>
        <li>
          Μετά την εναλλαγή βλέπεις μόνο τα δεδομένα του επιλεγμένου Πελάτη.
        </li>
      </ul>
    </section>
  );
}
