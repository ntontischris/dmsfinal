import Link from "next/link";

import { KB_ITEMS, type Unanswered } from "@/data/knowledge";
import {
  findKbItem,
  knowledgeCapsOf,
  unansweredIn,
} from "@/data/knowledge-access";
import type { RoleId } from "@/data/roles";
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

import "./l3.css";

type Tab = "open" | "covered" | "ignored";

const TAB_STATE = {
  open: "ανοιχτή",
  covered: "καλύφθηκε",
  ignored: "αγνοήθηκε",
} as const;

const REASONS = ["εκτός θέματος", "προσωπικά δεδομένα", "κατάχρηση"] as const;

const parseTab = (v: string | undefined): Tab =>
  v === "covered" || v === "ignored" ? v : "open";

export function L3({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const keep = { tab: query.tab, close: query.close };
  const header = (
    <StateSwitcher role={role} code="L3" state={state} keep={keep} />
  );
  if (!knowledgeCapsOf(role).canManage) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τις Αναπάντητες ερωτήσεις τις βλέπει όποιος διαχειρίζεται τη Γνώση.
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="τις Αναπάντητες ερωτήσεις" />
      </>
    );
  }
  return (
    <>
      {header}
      <Board role={role} query={query} isEmpty={state === "empty"} />
    </>
  );
}

interface BoardProps extends ScreenProps {
  isEmpty: boolean;
}

function Board({ role, query, isEmpty }: BoardProps) {
  const tab = parseTab(query.tab);
  const listFor = (t: Tab): readonly Unanswered[] =>
    isEmpty ? [] : unansweredIn(TAB_STATE[t]);
  const labels: Readonly<Record<Tab, string>> = {
    open: `Ανοιχτές (${listFor("open").length})`,
    covered: "Καλύφθηκαν",
    ignored: "Αγνοήθηκαν",
  };
  return (
    <>
      <p className="note">
        Ίδιες ερωτήσεις μαζεύονται σε μία γραμμή. Η λίστα δεν αδειάζει μόνη της:
        κάθε ερώτηση κλείνει με «Καλύφθηκε» ή «Αγνόησε».
      </p>
      <nav className="tabs" aria-label="Αναπάντητες ερωτήσεις">
        {(Object.keys(labels) as Tab[]).map((t) => (
          <Link
            key={t}
            className="tab"
            aria-current={t === tab ? "page" : undefined}
            href={screenHref(role, "L3", {
              state: query.state,
              tab: t === "open" ? undefined : t,
            })}
          >
            {labels[t]}
          </Link>
        ))}
      </nav>
      <Rows role={role} query={query} rows={listFor(tab)} tab={tab} />
      <p className="note">
        Κρατιούνται όσο η Συζήτησή τους: σβήνουν 12 μήνες μετά το τελευταίο
        μήνυμα. Καμία Ειδοποίηση· ο αριθμός των ανοιχτών φαίνεται στη Διαχείριση
        Γνώσης.
      </p>
    </>
  );
}

interface RowsProps extends ScreenProps {
  rows: readonly Unanswered[];
  tab: Tab;
}

function Rows({ role, query, rows, tab }: RowsProps) {
  if (rows.length === 0) {
    const isOpen = tab === "open";
    return (
      <StateNotice
        kind="empty"
        title={isOpen ? "Καμία ανοιχτή ερώτηση" : "Καμία ερώτηση εδώ"}
      >
        {isOpen
          ? "Καμία ανοιχτή ερώτηση. Ο Βοηθός βρήκε πηγή για όλα."
          : "Δεν υπάρχει τίποτα σε αυτή την καρτέλα."}
      </StateNotice>
    );
  }
  return (
    <section className="card">
      <ul className="list">
        {rows.map((u) => (
          <li key={u.id}>
            <Item role={role} query={query} item={u} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ItemProps extends ScreenProps {
  item: Unanswered;
}

function Item({ role, query, item }: ItemProps) {
  const isClosing = item.state === "ανοιχτή" && query.close === item.id;
  return (
    <div className="l3-item">
      <span className="l3-q">«{item.question}»</span>
      <div className="l3-meta">
        <Badge>{item.kind}</Badge>
        <span className="muted">ρωτήθηκε {item.timesAsked} φορές</span>
        <span className="muted">
          {fmtDate(item.firstAt)} έως {fmtDate(item.lastAt)}
        </span>
      </div>
      <Conversations role={role} item={item} />
      <Status role={role} query={query} item={item} />
      {isClosing && <ClosePanel role={role} query={query} item={item} />}
    </div>
  );
}

function Conversations({ role, item }: { role: RoleId; item: Unanswered }) {
  if (item.conversationIds.length === 0) return null;
  return (
    <div className="l3-meta">
      <span className="muted">Συζητήσεις:</span>
      {item.conversationIds.map((cv) => (
        <Link key={cv} href={screenHref(role, "L2", { cv })}>
          Άνοιξε τη Συζήτηση
        </Link>
      ))}
    </div>
  );
}

function Status({ role, query, item }: ItemProps) {
  if (item.state === "ανοιχτή") {
    return (
      <div className="btn-row">
        <Link
          className="button"
          data-primary="true"
          href={screenHref(role, "L3", { ...query, close: item.id })}
        >
          Κλείσε
        </Link>
      </div>
    );
  }
  const covered = item.coveredBy ? findKbItem(item.coveredBy) : undefined;
  return (
    <div className="l3-meta">
      {item.state === "καλύφθηκε" && covered && (
        <span>
          Καλύφθηκε από{" "}
          <Link href={screenHref(role, "A8", { item: covered.id })}>
            «{covered.title}»
          </Link>
        </span>
      )}
      {item.state === "αγνοήθηκε" && (
        <span className="muted">Αγνοήθηκε: {item.ignoredReason}</span>
      )}
      <Link
        className="button"
        href={screenHref(role, "L3", { state: query.state })}
      >
        Ξανάνοιξε
      </Link>
    </div>
  );
}

function ClosePanel({ role, query, item }: ItemProps) {
  const published = KB_ITEMS.filter((k) => k.state === "δημοσιευμένο");
  const hrefWith = (extra: Record<string, string | undefined>) =>
    screenHref(role, "L3", { ...query, ...extra });
  const picked = published.find((k) => k.id === query.by);
  const reason = REASONS.find((r) => r === query.reason);
  return (
    <div className="l3-panel">
      <div className="l3-choice">
        <h3>1. Καλύφθηκε από…</h3>
        <div className="l3-options">
          {published.map((k) => (
            <Link
              key={k.id}
              href={hrefWith({ by: k.id, reason: undefined })}
              aria-current={k.id === query.by}
            >
              {k.title}
            </Link>
          ))}
          <Link href={screenHref(role, "L1", {})}>Νέο Άρθρο</Link>
        </div>
        <p className="note">
          Αν ξαναρωτηθεί και ο Βοηθός πάλι δεν βρει πηγή, ξανανοίγει ως νέα
          ανοιχτή.
        </p>
        {item.kind === "δημόσια" && (
          <p className="note">
            Για να το βρει ο Επισκέπτης, το στοιχείο πρέπει να έχει Κοινό
            «δημόσιο».
          </p>
        )}
        <div className="btn-row">
          <button
            type="button"
            className="button"
            data-primary="true"
            disabled={!picked}
          >
            {picked ? `Καλύφθηκε από «${picked.title}»` : "Διάλεξε πηγή"}
          </button>
        </div>
      </div>
      <div className="l3-choice">
        <h3>2. Αγνόησε</h3>
        <div className="l3-options">
          {REASONS.map((r) => (
            <Link
              key={r}
              href={hrefWith({ reason: r, by: undefined })}
              aria-current={r === query.reason}
            >
              {r === query.reason ? "(•)" : "( )"} {r}
            </Link>
          ))}
        </div>
        <p className="note">
          Προσωπικά δεδομένα: π.χ. «πόσο χρωστάω;»: ο Βοηθός δεν βλέπει δεδομένα
          χρήστη στο v1· ίσως αξίζει Άρθρο που δείχνει πού το βλέπει ο ίδιος.
        </p>
        <div className="btn-row">
          <button
            type="button"
            className="button"
            data-danger="true"
            disabled={!reason}
          >
            {reason ? `Αγνόησε (${reason})` : "Διάλεξε λόγο"}
          </button>
          <Link
            className="button"
            href={hrefWith({
              close: undefined,
              by: undefined,
              reason: undefined,
            })}
          >
            Άκυρο
          </Link>
        </div>
      </div>
    </div>
  );
}
