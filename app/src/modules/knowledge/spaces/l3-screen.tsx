import Link from "next/link";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { FilterBar } from "@/spaces/kit/filter-bar";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import {
  conversationHref,
  IGNORE_REASON_LABEL,
  UNANSWERED_PATH,
  type DoneCode,
} from "../assistant-helpers";
import {
  DONE_TEXT,
  PERSONAL_DATA_NOTE,
  PUBLIC_NOTE,
  REASK_NOTE,
} from "../assistant-labels";
import {
  getCoverOptions,
  getUnanswered,
  type CoverOption,
} from "../assistant-queries";
import {
  IGNORE_REASONS,
  type UnansweredRow,
  type UnansweredStatus,
} from "../assistant-view-schema";
import { editHref } from "../helpers";
import { KBox } from "./k-box";
import { L3Action } from "./l3-action";
import {
  closedOf,
  closeHref,
  l3RowOf,
  l3Tabs,
  optionLabel,
  type L3Row,
  type L3Selection,
} from "./l3-adapter";

import "../../finance/spaces/money-lines.css";
import "./k.css";
import "./l3.css";

function Conversations({ row }: { row: L3Row }) {
  if (row.conversationIds.length === 0) return null;
  return (
    <small className="l3-meta">
      <span>Συζητήσεις:</span>
      {row.conversationIds.map((id) => (
        <Link key={id} href={conversationHref(id)}>
          Άνοιξε τη Συζήτηση
        </Link>
      ))}
    </small>
  );
}

function Status({ item, row }: { item: UnansweredRow; row: L3Row }) {
  if (row.isOpen)
    return <Link href={closeHref({ close: item.id })}>Κλείσε</Link>;
  const closed = closedOf(item);
  return (
    <>
      {closed.covered && (
        <span>
          Καλύφθηκε από{" "}
          <Link href={editHref(closed.covered.id)}>
            «{closed.covered.title}»
          </Link>
        </span>
      )}
      {closed.isCoveredGone && (
        <span className="k-note">
          Καλύφθηκε από στοιχείο που δεν υπάρχει πια
        </span>
      )}
      {closed.ignored && (
        <span className="k-note">Αγνοήθηκε: {closed.ignored}</span>
      )}
      {closed.when && <span className="k-note">{closed.when}</span>}
      <L3Action kind="reopen" fields={{ id: item.id }} label="Ξανάνοιξε" />
    </>
  );
}

interface ClosePanelProps {
  row: L3Row;
  options: readonly CoverOption[];
  selection: L3Selection;
}

function CoverChoice({ row, options, selection }: ClosePanelProps) {
  const picked = options.find((option) => option.id === selection.by);
  return (
    <div className="l3-choice">
      <h3>1. Καλύφθηκε από…</h3>
      <div className="l3-options">
        {options.length > 0 && (
          <FilterBar
            label="Καλύφθηκε από"
            filters={[
              {
                label: "Στοιχείο",
                isSearchable: true,
                options: options.map((option) => ({
                  label: optionLabel(option, row.isPublicQuestion),
                  href: closeHref({ close: row.id, by: option.id }),
                  isCurrent: option.id === selection.by,
                })),
              },
            ]}
          />
        )}
        <Link href={hrefOf("L1")}>Νέο Άρθρο</Link>
      </div>
      {options.length === 0 && (
        <p className="k-note">Δεν υπάρχει ακόμα δημοσιευμένο στοιχείο.</p>
      )}
      <p className="k-note">{REASK_NOTE}</p>
      {row.isPublicQuestion && <p className="k-note">{PUBLIC_NOTE}</p>}
      <div className="ml-actions">
        <L3Action
          kind="cover"
          fields={{ id: row.id, itemId: picked?.id ?? "" }}
          label={picked ? `Καλύφθηκε από «${picked.title}»` : "Διάλεξε πηγή"}
          tone="primary"
          isDisabled={!picked}
        />
      </div>
    </div>
  );
}

function IgnoreChoice({ row, selection }: Omit<ClosePanelProps, "options">) {
  const reason = selection.reason;
  return (
    <div className="l3-choice">
      <h3>2. Αγνόησε</h3>
      <div className="l3-options">
        {IGNORE_REASONS.map((value) => (
          <Link
            key={value}
            href={closeHref({ close: row.id, reason: value })}
            aria-current={value === reason}
          >
            {value === reason ? "(•)" : "( )"} {IGNORE_REASON_LABEL[value]}
          </Link>
        ))}
      </div>
      <p className="k-note">{PERSONAL_DATA_NOTE}</p>
      <div className="ml-actions">
        <L3Action
          kind="ignore"
          fields={{ id: row.id, reason: reason ?? "" }}
          label={
            reason ? `Αγνόησε (${IGNORE_REASON_LABEL[reason]})` : "Διάλεξε λόγο"
          }
          tone="danger"
          isDisabled={!reason}
        />
        <Link href={UNANSWERED_PATH}>Άκυρο</Link>
      </div>
    </div>
  );
}

function Item({
  item,
  options,
  selection,
}: {
  item: UnansweredRow;
  options: readonly CoverOption[];
  selection: L3Selection;
}) {
  const row = l3RowOf(item);
  return (
    <li className="ml-line l3-item" data-faded={!row.isOpen || undefined}>
      <span className="ml-thumb" aria-hidden="true">
        ?
      </span>
      <div className="ml-main">
        <strong className="l3-q">«{row.question}»</strong>
        <small className="l3-meta">
          <Badge>{row.kind}</Badge>
          <span>{row.asked}</span>
          <span>{row.span}</span>
        </small>
        <Conversations row={row} />
      </div>
      <span className="ml-quick">
        <Status item={item} row={row} />
      </span>
      {row.isOpen && selection.close === item.id && (
        <div className="l3-close">
          <div className="l3-panel">
            <CoverChoice row={row} options={options} selection={selection} />
            <IgnoreChoice row={row} selection={selection} />
          </div>
        </div>
      )}
    </li>
  );
}

interface SpacesUnansweredProps {
  tab: UnansweredStatus;
  selection: L3Selection;
  done: DoneCode | null;
}

// L3 Αναπάντητες ερωτήσεις στη νέα εμφάνιση (prototype `screens/L3.tsx`). Χωρίς «Διαχειρίζεται Γνώση» η βάση δίνει null.
export async function SpacesUnanswered({
  tab,
  selection,
  done,
}: SpacesUnansweredProps) {
  const viewer = await getViewer();
  const result =
    viewer.status === "signed-in" ? await getUnanswered(tab) : null;
  // Οι επιλογές του «Καλύφθηκε από…» μόνο στις ανοιχτές και μόνο όταν η λίστα φόρτωσε.
  const options =
    result?.ok && result.data && tab === "open"
      ? await getCoverOptions()
      : null;
  if (result?.ok === false || options?.ok === false)
    return (
      <div data-spaces>
        <ErrorNotice what="οι Αναπάντητες ερωτήσεις" />
      </div>
    );
  const list = result?.data;
  if (!list)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τις Αναπάντητες ερωτήσεις τις βλέπει όποιος διαχειρίζεται τη Γνώση.
        </StateNotice>
      </div>
    );
  const isOpen = tab === "open";
  return (
    <div data-spaces className="k">
      <section>
        <header className="ml-hero">
          <span className="ml-hero-mono" aria-hidden="true">
            ?
          </span>
          <div>
            <Badge tone={list.counts.open > 0 ? "attention" : undefined}>
              {list.counts.open} ανοιχτές
            </Badge>
            <h1>Αναπάντητες ερωτήσεις</h1>
            <p>
              Ίδιες ερωτήσεις μαζεύονται σε μία γραμμή. Η λίστα δεν αδειάζει
              μόνη της: κάθε ερώτηση κλείνει με «Καλύφθηκε» ή «Αγνόησε».
            </p>
          </div>
        </header>
      </section>
      {done && (
        <p className="k-note" role="status">
          {DONE_TEXT[done]}
        </p>
      )}
      <nav className="page-filters" aria-label="Αναπάντητες ερωτήσεις">
        {l3Tabs(list, tab).map((option) => (
          <Link
            key={option.label}
            aria-current={option.isCurrent ? "page" : undefined}
            href={option.href}
          >
            {option.label}
          </Link>
        ))}
      </nav>
      {list.items.length === 0 ? (
        <p className="ml-empty" role="status">
          {isOpen
            ? "Καμία ανοιχτή ερώτηση. Ο Βοηθός βρήκε πηγή για όλα."
            : "Δεν υπάρχει τίποτα σε αυτή την καρτέλα."}
        </p>
      ) : (
        <KBox title="Ερωτήσεις" hint={`${list.counts[tab]} ερωτήσεις`} isOpen>
          <ul className="ml-list">
            {list.items.map((item) => (
              <Item
                key={item.id}
                item={item}
                options={options?.ok ? options.data : []}
                selection={selection}
              />
            ))}
          </ul>
          {list.items.length < list.counts[tab] && (
            <p className="k-note">
              {`Δείχνονται ${list.items.length} από ${list.counts[tab]}, ${isOpen ? "οι πιο συχνές" : "οι πιο πρόσφατες"} πρώτες.`}
            </p>
          )}
        </KBox>
      )}
      <p className="k-note">
        Κρατιούνται όσο η Συζήτησή τους: σβήνουν 12 μήνες μετά το τελευταίο
        μήνυμα. Καμία Ειδοποίηση· ο αριθμός των ανοιχτών φαίνεται στη Διαχείριση
        Γνώσης.
      </p>
    </div>
  );
}
