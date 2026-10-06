import Link from "next/link";

import type { RoleId } from "@/data/roles";
import type { RoleDef } from "@/data/team";
import { activeOwners } from "@/data/team-access";
import {
  n4Href,
  pluralUsers,
  roleCandidates,
  roleHolders,
} from "@/screens/n4-shared";
import type { ScreenQuery } from "@/screens/shared";

// Ποιοι έχουν τον Ρόλο, «Δώσε τον Ρόλο σε…» και οι κανόνες διαγραφής.

interface RolePartProps {
  role: RoleId;
  query: ScreenQuery;
  def: RoleDef;
}

export function HoldersSection({ def }: { def: RoleDef }) {
  const holders = roleHolders(def);
  const candidates = roleCandidates(def);
  const isLastOwner = def.isOwner && activeOwners().length <= 1;
  return (
    <section className="card n4-section">
      <h2 className="card-title">
        Χρήστες με αυτόν τον Ρόλο ({holders.length})
      </h2>
      {holders.length === 0 ? (
        <p className="muted">Κανείς δεν έχει αυτόν τον Ρόλο ακόμα.</p>
      ) : (
        <ul className="list">
          {holders.map((holder) => (
            <li key={holder.key} className="row">
              <span>
                {holder.name} <span className="muted">· {holder.detail}</span>
              </span>
              {def.isOwner && (
                <button type="button" className="button" disabled={isLastOwner}>
                  Αφαίρεση Ρόλου
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {isLastOwner && (
        <p className="note">
          Ο τελευταίος ενεργός Ιδιοκτήτης δεν χάνει τον Ρόλο: πρώτα δώσε τον
          Ρόλο Ιδιοκτήτης σε άλλον.
        </p>
      )}
      <div className="stack n4-give">
        <label htmlFor="n4-give">Δώσε τον Ρόλο σε…</label>
        <select id="n4-give" className="select" defaultValue="">
          <option value="" disabled>
            Διάλεξε Χρήστη
          </option>
          {candidates.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name} · {c.detail}
            </option>
          ))}
        </select>
        <button type="button" className="button" data-primary="true">
          Δώσε τον Ρόλο
        </button>
      </div>
      {def.isOwner && (
        <p className="note">
          Τον Ρόλο Ιδιοκτήτης τον δίνει και τον αφαιρεί μόνο Ιδιοκτήτης.
        </p>
      )}
      {def.kind === "πελάτη" && (
        <p className="note">
          Ο Ρόλος πελάτη ισχύει ανά Πελάτη: ο ίδιος Χρήστης μπορεί να έχει άλλον
          Ρόλο σε άλλον Πελάτη.
        </p>
      )}
    </section>
  );
}

const deleteBlock = (def: RoleDef, holderCount: number): string | null => {
  if (def.isOwner) {
    return "Ο Ιδιοκτήτης δεν διαγράφεται: υπάρχει πάντα τουλάχιστον ένας.";
  }
  if (def.id === "client-full") {
    return "Ο «Πλήρης» δεν διαγράφεται: είναι ο Ρόλος με τον οποίο προσκαλείται αυτόματα ο Υπογράφων της πρώτης υπογεγραμμένης Συμφωνίας. Μπορείς να τον μετονομάσεις.";
  }
  if (holderCount > 0) {
    return `Τον έχουν ${pluralUsers(holderCount)}: μετακίνησε πρώτα τους ${pluralUsers(holderCount)} σε άλλον Ρόλο.`;
  }
  return null;
};

export function DeleteSection({ role, query, def }: RolePartProps) {
  const holderCount = roleHolders(def).length;
  const block = deleteBlock(def, holderCount);
  const isConfirming = query.confirm === "delete" && !block;
  return (
    <section className="card n4-section">
      <h2 className="card-title">Διαγραφή Ρόλου</h2>
      {block ? (
        <>
          <p className="muted">{block}</p>
          <button type="button" className="button" data-danger="true" disabled>
            Διαγραφή Ρόλου
          </button>
        </>
      ) : isConfirming ? (
        <div className="n4-confirm" role="alertdialog" aria-label="Επιβεβαίωση">
          <p>
            Να διαγραφεί ο Ρόλος «{def.name}»; Δεν τον έχει κανείς. Η διαγραφή
            γράφεται στο Ίχνος.
          </p>
          <div className="btn-row">
            <button type="button" className="button" data-danger="true">
              Ναι, διαγραφή
            </button>
            <Link
              className="button"
              href={n4Href(role, query, { roleDef: def.id })}
            >
              Άκυρο
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="muted">Δεν τον έχει κανείς, οπότε διαγράφεται.</p>
          <Link
            className="button"
            data-danger="true"
            href={n4Href(role, query, { roleDef: def.id, confirm: "delete" })}
          >
            Διαγραφή Ρόλου
          </Link>
        </>
      )}
    </section>
  );
}
