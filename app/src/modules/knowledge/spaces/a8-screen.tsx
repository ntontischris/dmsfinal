import Link from "next/link";

import { can, getViewer, isClientViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { getLibrary } from "../queries";
import { searchKnowledge } from "../search";
import {
  libraryGroups,
  searchGroups,
  type A8Group,
  type A8Row,
} from "./a8-adapter";

import "./a8.css";

// Ο Βοηθός της εφαρμογής είναι το πλωτό κουμπί (δεν έχει σελίδα A9): η σημείωση δεν έχει σύνδεσμο.
function AskAssistant() {
  return <p className="note">Δοκίμασε να ρωτήσεις τον Βοηθό.</p>;
}

function SearchForm({ q }: { q: string }) {
  return (
    <form className="a8-search" method="get" role="search">
      <input
        className="input"
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Αναζήτηση στη Γνώση"
        aria-label="Αναζήτηση"
        maxLength={200}
      />
      <button className="button" type="submit">
        Αναζήτηση
      </button>
    </form>
  );
}

function ItemRow({ row }: { row: A8Row }) {
  return (
    <ListRow
      lead={
        <span className="a8-kind" aria-hidden="true">
          {row.letter}
        </span>
      }
      href={row.href}
      title={row.title}
      sub={
        <>
          <span className="part-sub">Περίληψη: {row.summary}</span>
          <span className="part-sub">{row.extra}</span>
        </>
      }
      aside={<Badge>{row.kindLabel}</Badge>}
    />
  );
}

function Groups({ groups, q }: { groups: readonly A8Group[]; q: string }) {
  if (groups.length === 0)
    return (
      <StateNotice
        kind="empty"
        title={q ? `Τίποτα για «${q}»` : "Δεν υπάρχει ακόμα Γνώση για σένα"}
      >
        <AskAssistant />
      </StateNotice>
    );
  return groups.map((group) => (
    <Panel key={group.id} label={group.title} aside={group.rows.length} isFlush>
      {group.blurb && <p className="muted a8-blurb">{group.blurb}</p>}
      <RowList>
        {group.rows.map((row) => (
          <ItemRow key={row.id} row={row} />
        ))}
      </RowList>
    </Panel>
  ));
}

// Βιβλιοθήκη ή αποτελέσματα αναζήτησης (?q=): ψάχνει η βάση (ελληνικό full-text), μόνο στο Κοινό του Χρήστη.
async function groupsOf(
  q: string,
  isClient: boolean,
): Promise<A8Group[] | null> {
  if (q) {
    const found = await searchKnowledge(q, isClient ? "client" : "team");
    return found.ok ? searchGroups(q, found.data) : null;
  }
  const library = await getLibrary();
  return library.ok ? libraryGroups(library.data) : null;
}

// A8 Γνώση στη νέα εμφάνιση (prototype `screens/A8.tsx`): οι Ενότητες με τα δημοσιευμένα στοιχεία του Κοινού μου.
export async function SpacesKnowledge({ q }: { q: string }) {
  const viewer = await getViewer();
  if (viewer.status !== "signed-in")
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Η Γνώση είναι για όσους έχουν λογαριασμό.
        </StateNotice>
      </div>
    );
  const groups = await groupsOf(q, isClientViewer(viewer));
  return (
    <div data-spaces>
      <div className="toolbar">
        <span className="grow" />
        {can(viewer, "knowledge.manage") && (
          <Link className="button" href={hrefOf("L1")}>
            Διαχείριση Γνώσης →
          </Link>
        )}
      </div>
      <SearchForm q={q} />
      <p className="note">Για τιμές, δες τον Κατάλογο.</p>
      {groups === null ? (
        <ErrorNotice what="η Γνώση" />
      ) : (
        <Groups groups={groups} q={q} />
      )}
    </div>
  );
}
