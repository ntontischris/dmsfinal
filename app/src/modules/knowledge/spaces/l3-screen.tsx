import Link from "next/link";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { FilterBar } from "@/spaces/kit/filter-bar";
import { Panel } from "@/spaces/kit/panel";
import { RowList } from "@/spaces/kit/parts";
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

import "./l3.css";

function Conversations({ row }: { row: L3Row }) {
  if (row.conversationIds.length === 0) return null;
  return (
    <span className="part-sub l3-meta">
      <span>Συζητήσεις:</span>
      {row.conversationIds.map((id) => (
        <Link key={id} href={conversationHref(id)}>
          Άνοιξε τη Συζήτηση
        </Link>
      ))}
    </span>
  );
}

function Status({ item, row }: { item: UnansweredRow; row: L3Row }) {
  if (row.isOpen)
    return (
      <Link
        className="button"
        data-primary="true"
        href={closeHref({ close: item.id })}
      >
        Κλείσε
      </Link>
    );
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
        <span className="muted">
          Καλύφθηκε από στοιχείο που δεν υπάρχει πια
        </span>
      )}
      {closed.ignored && (
        <span className="muted">Αγνοήθηκε: {closed.ignored}</span>
      )}
      {closed.when && <span className="part-sub">{closed.when}</span>}
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
        <p className="muted">Δεν υπάρχει ακόμα δημοσιευμένο στοιχείο.</p>
      )}
      <p className="note">{REASK_NOTE}</p>
      {row.isPublicQuestion && <p className="note">{PUBLIC_NOTE}</p>}
      <L3Action
        kind="cover"
        fields={{ id: row.id, itemId: picked?.id ?? "" }}
        label={picked ? `Καλύφθηκε από «${picked.title}»` : "Διάλεξε πηγή"}
        tone="primary"
        isDisabled={!picked}
      />
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
      <p className="note">{PERSONAL_DATA_NOTE}</p>
      <div className="btn-row">
        <L3Action
          kind="ignore"
          fields={{ id: row.id, reason: reason ?? "" }}
          label={
            reason ? `Αγνόησε (${IGNORE_REASON_LABEL[reason]})` : "Διάλεξε λόγο"
          }
          tone="danger"
          isDisabled={!reason}
        />
        <Link className="button" href={UNANSWERED_PATH}>
          Άκυρο
        </Link>
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
    <li className="part-row l3-item" data-faded={!row.isOpen}>
      <span className="part-row-main">
        <span className="part-title l3-q">«{row.question}»</span>
        <span className="part-sub l3-meta">
          <Badge>{row.kind}</Badge>
          <span>{row.asked}</span>
          <span>{row.span}</span>
        </span>
        <Conversations row={row} />
      </span>
      <span className="part-row-aside">
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
    <div data-spaces>
      {done && (
        <p className="note" role="status">
          {DONE_TEXT[done]}
        </p>
      )}
      <p className="note">
        Ίδιες ερωτήσεις μαζεύονται σε μία γραμμή. Η λίστα δεν αδειάζει μόνη της:
        κάθε ερώτηση κλείνει με «Καλύφθηκε» ή «Αγνόησε».
      </p>
      <nav className="tabs" aria-label="Αναπάντητες ερωτήσεις">
        {l3Tabs(list, tab).map((option) => (
          <Link
            key={option.label}
            className="tab"
            aria-current={option.isCurrent ? "page" : undefined}
            href={option.href}
          >
            {option.label}
          </Link>
        ))}
      </nav>
      {list.items.length === 0 ? (
        <StateNotice
          kind="empty"
          title={isOpen ? "Καμία ανοιχτή ερώτηση" : "Καμία ερώτηση εδώ"}
        >
          {isOpen
            ? "Καμία ανοιχτή ερώτηση. Ο Βοηθός βρήκε πηγή για όλα."
            : "Δεν υπάρχει τίποτα σε αυτή την καρτέλα."}
        </StateNotice>
      ) : (
        <Panel label="Ερωτήσεις" aside={list.counts[tab]} isFlush>
          <RowList>
            {list.items.map((item) => (
              <Item
                key={item.id}
                item={item}
                options={options?.ok ? options.data : []}
                selection={selection}
              />
            ))}
          </RowList>
          {list.items.length < list.counts[tab] && (
            <p className="muted">
              {`Δείχνονται ${list.items.length} από ${list.counts[tab]}, ${isOpen ? "οι πιο συχνές" : "οι πιο πρόσφατες"} πρώτες.`}
            </p>
          )}
        </Panel>
      )}
      <p className="note">
        Κρατιούνται όσο η Συζήτησή τους: σβήνουν 12 μήνες μετά το τελευταίο
        μήνυμα. Καμία Ειδοποίηση· ο αριθμός των ανοιχτών φαίνεται στη Διαχείριση
        Γνώσης.
      </p>
    </div>
  );
}
