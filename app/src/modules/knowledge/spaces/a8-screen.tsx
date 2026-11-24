import Link from "next/link";

import { can, getViewer, isClientViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { KNOWLEDGE_PATH } from "../helpers";
import { CLIENT_HELP_NOTE, PRICES_NOTE } from "../labels";
import { getLibrary } from "../queries";
import { searchKnowledge } from "../search";
import {
  libraryGroups,
  onlySection,
  searchGroups,
  type A8Group,
  type A8Row,
} from "./a8-adapter";

import "../../finance/spaces/money-lines.css";
import "./a8.css";
import "./k.css";

// Ο Βοηθός της εφαρμογής είναι το πλωτό κουμπί (δεν έχει σελίδα A9): η σημείωση δεν έχει σύνδεσμο.
function Empty({ q }: { q: string }) {
  return (
    <p className="ml-empty">
      {q ? `Τίποτα για «${q}».` : "Δεν υπάρχει ακόμα Γνώση για σένα."} Δοκίμασε
      να ρωτήσεις τον Βοηθό.
    </p>
  );
}

function SearchForm({ q }: { q: string }) {
  return (
    <form className="k-search ml-actions" method="get" role="search">
      <input
        className="input"
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Αναζήτηση στη Γνώση"
        aria-label="Αναζήτηση"
        maxLength={200}
      />
      <button type="submit" data-primary>
        Αναζήτηση
      </button>
    </form>
  );
}

function ItemLine({ row }: { row: A8Row }) {
  return (
    <li className="ml-line">
      <span className="ml-thumb" aria-hidden="true">
        {row.letter}
      </span>
      <div className="ml-main">
        <Link className="k-link" href={row.href}>
          <strong>{row.title}</strong>
        </Link>
        <small>Περίληψη: {row.summary}</small>
        <small>{row.extra}</small>
      </div>
      <span className="ml-tag">{row.kindLabel}</span>
    </li>
  );
}

function Groups({ groups, q }: { groups: readonly A8Group[]; q: string }) {
  if (groups.length === 0) return <Empty q={q} />;
  return groups.map((group) => (
    <section key={group.id}>
      <header className="k-group">
        <h2>
          {group.title} · {group.rows.length}
        </h2>
        {group.blurb && <p>{group.blurb}</p>}
      </header>
      <ul className="ml-list">
        {group.rows.map((row) => (
          <ItemLine key={row.id} row={row} />
        ))}
      </ul>
    </section>
  ));
}

interface KnowledgeView {
  q: string;
  section: string | null;
}

// Βιβλιοθήκη ή αποτελέσματα αναζήτησης (?q=): ψάχνει η βάση (ελληνικό full-text), μόνο στο Κοινό του Χρήστη.
// Με ?section= η βιβλιοθήκη δείχνει μόνο εκείνη την Ενότητα.
async function groupsOf(
  { q, section }: KnowledgeView,
  isClient: boolean,
): Promise<A8Group[] | null> {
  if (q) {
    const found = await searchKnowledge(q, isClient ? "client" : "team");
    return found.ok ? searchGroups(q, found.data) : null;
  }
  const library = await getLibrary();
  return library.ok ? onlySection(libraryGroups(library.data), section) : null;
}

// A8 Γνώση στη νέα εμφάνιση (prototype `screens/A8.tsx`): οι Ενότητες με τα δημοσιευμένα στοιχεία του Κοινού μου.
export async function SpacesKnowledge({ q, section }: KnowledgeView) {
  const viewer = await getViewer();
  if (viewer.status !== "signed-in")
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Η Γνώση είναι για όσους έχουν λογαριασμό.
        </StateNotice>
      </div>
    );
  const isClient = isClientViewer(viewer);
  const isOneSection = section !== null && !q;
  const groups = await groupsOf({ q, section }, isClient);
  // Ο πελάτης δεν έχει Κατάλογο· η σημείωση τον στέλνει στη Συνομιλία με την ομάδα.
  return (
    <div data-spaces className="k">
      <div className="ml-head">
        <p>{isClient ? CLIENT_HELP_NOTE : PRICES_NOTE}</p>
        <div className="ml-quick">
          {isOneSection && <Link href={KNOWLEDGE_PATH}>← Όλη η Γνώση</Link>}
          {can(viewer, "knowledge.manage") && (
            <Link href={hrefOf("L1")}>Διαχείριση Γνώσης →</Link>
          )}
        </div>
      </div>
      <SearchForm q={q} />
      {groups === null ? (
        <ErrorNotice what="η Γνώση" />
      ) : (
        <Groups groups={groups} q={q} />
      )}
    </div>
  );
}
