import Link from "next/link";

import {
  KB_ITEMS,
  KB_SECTIONS,
  type KbItem,
  type KbItemState,
} from "@/data/knowledge";
import {
  audienceText,
  findKbItem,
  knowledgeCapsOf,
  openUnansweredCount,
} from "@/data/knowledge-access";
import type { RoleId } from "@/data/roles";
import { ItemEditor } from "@/screens/l1-editor";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  fmtDate,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./l1.css";

const parseStateFilter = (v: string | undefined): KbItemState | undefined =>
  v === "πρόχειρο" || v === "δημοσιευμένο" ? v : undefined;

export function L1({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const keep = { tab: query.tab, edit: query.edit, state_f: query.state_f };
  const header = (
    <StateSwitcher role={role} code="L1" state={state} keep={keep} />
  );
  if (!knowledgeCapsOf(role).canManage) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τη Γνώση τη διαχειρίζεται όποιος έχει «Διαχειρίζεται Γνώση» (στους
          έτοιμους Ρόλους: Ιδιοκτήτης και Διαχείριση).
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="τη Διαχείριση Γνώσης" />
      </>
    );
  }
  return (
    <>
      {header}
      <Manage role={role} query={query} isEmpty={state === "empty"} />
    </>
  );
}

interface ManageProps extends ScreenProps {
  isEmpty: boolean;
}

function Manage({ role, query, isEmpty }: ManageProps) {
  const editing = query.edit ? findKbItem(query.edit) : undefined;
  if (editing && !isEmpty) return <ItemEditor role={role} item={editing} />;
  const tab = query.tab === "sections" ? "sections" : "items";
  return (
    <>
      <h1>Διαχείριση Γνώσης</h1>
      <Shortcuts role={role} />
      <Tabs role={role} tab={tab} />
      {isEmpty ? (
        <EmptyKnowledge />
      ) : tab === "items" ? (
        <ItemsTab role={role} filter={parseStateFilter(query.state_f)} />
      ) : (
        <SectionsTab />
      )}
    </>
  );
}

function Tabs({ role, tab }: { role: RoleId; tab: string }) {
  return (
    <nav className="tabs" aria-label="Ενότητες οθόνης">
      <Link
        className="tab"
        href={screenHref(role, "L1", {})}
        aria-current={tab === "items" ? "page" : undefined}
      >
        Στοιχεία
      </Link>
      <Link
        className="tab"
        href={screenHref(role, "L1", { tab: "sections" })}
        aria-current={tab === "sections" ? "page" : undefined}
      >
        Ενότητες
      </Link>
    </nav>
  );
}

function EmptyKnowledge() {
  return (
    <StateNotice
      kind="empty"
      title="Η Γνώση είναι άδεια. Ξεκίνα με μια Ενότητα και ένα Άρθρο."
    >
      <div className="btn-row">
        <button className="button" type="button">
          Νέα Ενότητα
        </button>
        <button className="button" type="button">
          Νέο Άρθρο
        </button>
      </div>
    </StateNotice>
  );
}

function Shortcuts({ role }: { role: RoleId }) {
  return (
    <div className="l1-links">
      <Link href={screenHref(role, "L3", {})}>
        Αναπάντητες ερωτήσεις ({openUnansweredCount()} ανοιχτές)
      </Link>
      <Link href={screenHref(role, "L2", {})}>Συζητήσεις Βοηθού</Link>
      <span className="muted">
        Όρια του Βοηθού: στις Ρυθμίσεις → Εταιρεία → Βοηθός
      </span>
    </div>
  );
}

const sectionTitle = (id: string): string =>
  KB_SECTIONS.find((s) => s.id === id)?.title ?? "—";

interface FilterLinksProps {
  role: RoleId;
  filter?: KbItemState;
}

function FilterLinks({ role, filter }: FilterLinksProps) {
  const options: readonly { value?: KbItemState; label: string }[] = [
    { label: "όλα" },
    { value: "πρόχειρο", label: "πρόχειρα" },
    { value: "δημοσιευμένο", label: "δημοσιευμένα" },
  ];
  return (
    <div className="l1-filters">
      {options.map((o) => (
        <Link
          key={o.label}
          href={screenHref(role, "L1", { state_f: o.value })}
          aria-current={o.value === filter}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

function ItemCard({ role, item }: { role: RoleId; item: KbItem }) {
  return (
    <li className="l1-cell">
      <div className="row">
        <Link href={screenHref(role, "L1", { edit: item.id })}>
          {item.title}
        </Link>
        <Badge tone={item.state === "πρόχειρο" ? "attention" : undefined}>
          {item.state}
        </Badge>
      </div>
      <span className="l1-sub">
        {item.kind} · {sectionTitle(item.sectionId)} · Κοινό:{" "}
        {audienceText(item)}
      </span>
      <span className="l1-sub">
        πηγή {item.citedLast30} φορές / 30 μέρες · ενημερώθηκε{" "}
        {fmtDate(item.updated.when)}
      </span>
    </li>
  );
}

function ItemsTab({ role, filter }: FilterLinksProps) {
  const items = KB_ITEMS.filter((i) => !filter || i.state === filter);
  return (
    <section className="card">
      <div className="btn-row">
        <button className="button" type="button" data-primary="true">
          Νέο Άρθρο
        </button>
        <button className="button" type="button">
          Ανέβασμα Αρχείου
        </button>
      </div>
      <FilterLinks role={role} filter={filter} />
      {items.length === 0 ? (
        <p className="muted">Κανένα στοιχείο σε αυτό το φίλτρο.</p>
      ) : (
        <ul className="list">
          {items.map((item) => (
            <ItemCard key={item.id} role={role} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SectionsTab() {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Ενότητες</h2>
        <button className="button" type="button" data-primary="true">
          Νέα Ενότητα
        </button>
      </div>
      <ul className="list">
        {KB_SECTIONS.map((s) => (
          <li className="l1-cell" key={s.id}>
            <div className="row">
              <strong>{s.title}</strong>
              <span className="btn-row">
                <button className="button" type="button" aria-label="Πάνω">
                  ↑
                </button>
                <button className="button" type="button" aria-label="Κάτω">
                  ↓
                </button>
              </span>
            </div>
            <span className="l1-sub">{s.blurb}</span>
            <span className="l1-sub">
              {KB_ITEMS.filter((i) => i.sectionId === s.id).length} στοιχεία
            </span>
          </li>
        ))}
      </ul>
      <p className="note">
        Ένα επίπεδο, χωρίς υποενότητες. Ενότητα με στοιχεία δεν διαγράφεται·
        πρώτα μετακινούνται τα στοιχεία.
      </p>
    </section>
  );
}
