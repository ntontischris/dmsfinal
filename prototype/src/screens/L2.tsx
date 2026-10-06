import Link from "next/link";

import {
  ASSISTANT_LIMITS,
  CONVERSATIONS,
  MONTH_USAGE,
  type Conversation,
  type ConversationKind,
} from "@/data/knowledge";
import {
  conversationsOf,
  findConversation,
  knowledgeCapsOf,
} from "@/data/knowledge-access";
import { L2Detail } from "@/screens/l2-detail";
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

import "./l2.css";

const TABS: readonly { value: ConversationKind | undefined; label: string }[] =
  [
    { value: undefined, label: "Όλες" },
    { value: "δημόσια", label: "Δημόσιες" },
    { value: "πελάτη", label: "Πελατών" },
    { value: "ομάδας", label: "Ομάδας" },
  ];

const parseKind = (v: string | undefined): ConversationKind | undefined =>
  TABS.find((t) => t.value && t.value === v)?.value;

export function L2({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const header = (
    <StateSwitcher
      role={role}
      code="L2"
      state={state}
      keep={{ kind: query.kind, cv: query.cv }}
    />
  );
  if (!knowledgeCapsOf(role).canManage) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τις Συζητήσεις τις βλέπει όποιος διαχειρίζεται τη Γνώση.
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="τις Συζητήσεις του Βοηθού" />
      </>
    );
  }
  const detail =
    state === "empty" ? undefined : findConversation(query.cv ?? "");
  return (
    <>
      {header}
      <Usage />
      {detail ? (
        <L2Detail role={role} conversation={detail} kind={query.kind} />
      ) : (
        <List role={role} query={query} isEmpty={state === "empty"} />
      )}
    </>
  );
}

const pct = (part: number, whole: number): string =>
  `${Math.min(100, (part / whole) * 100)}%`;

function Usage() {
  const cap = ASSISTANT_LIMITS.monthlyCapUsd;
  const ceiling = (cap * ASSISTANT_LIMITS.publicSharePercent) / 100;
  return (
    <section className="card">
      <div className="card-title">
        <h2>Κατανάλωση {MONTH_USAGE.month}</h2>
      </div>
      <p>
        ${MONTH_USAGE.spentUsd} από ${cap} πλαφόν. Δημόσιο μέρος: $
        {MONTH_USAGE.publicUsd} (όριο ${ceiling}, δηλαδή{" "}
        {ASSISTANT_LIMITS.publicSharePercent}% του πλαφόν).
      </p>
      <div className="l2-bar" aria-hidden="true">
        <span style={{ width: pct(MONTH_USAGE.spentUsd, cap) }} />
        <span
          className="pub"
          style={{ width: pct(MONTH_USAGE.publicUsd, cap) }}
        />
        <i style={{ left: pct(ceiling, cap) }} />
      </div>
      <p className="note">
        Στο 80% και στο 100% ειδοποιούνται όσοι «Βλέπουν Υγεία συστήματος»
        (Γεγονός 57). Τα όρια αλλάζουν στις Ρυθμίσεις → Εταιρεία → Βοηθός· το
        πλαφόν μόνο ο Ιδιοκτήτης.
      </p>
    </section>
  );
}

interface ListProps extends ScreenProps {
  isEmpty: boolean;
}

function List({ role, query, isEmpty }: ListProps) {
  const kind = parseKind(query.kind);
  const rows = isEmpty ? [] : conversationsOf(kind);
  return (
    <>
      <nav className="tabs" aria-label="Είδος Συζήτησης">
        {TABS.map((t) => (
          <Link
            key={t.label}
            className="tab"
            aria-current={t.value === kind ? "page" : undefined}
            href={screenHref(role, "L2", { kind: t.value })}
          >
            {t.label} ({isEmpty ? 0 : countOf(t.value)})
          </Link>
        ))}
      </nav>
      {rows.length > 0 ? (
        <Rows role={role} rows={rows} kind={query.kind} />
      ) : (
        <StateNotice kind="empty" title="Καμία Συζήτηση ακόμα">
          Όταν κάποιος ρωτήσει τον Βοηθό, η Συζήτηση θα εμφανιστεί εδώ.
        </StateNotice>
      )}
    </>
  );
}

const countOf = (kind: ConversationKind | undefined): number =>
  CONVERSATIONS.filter((c) => !kind || c.kind === kind).length;

export const unansweredCount = (c: Conversation): number =>
  c.turns.filter((t) => t.sources.length === 0).length;

const fmtWhen = (iso: string): string =>
  `${fmtDate(iso.slice(0, 10))} ${iso.slice(11, 16)}`;

interface RowsProps {
  role: ScreenProps["role"];
  rows: readonly Conversation[];
  kind: string | undefined;
}

function Rows({ role, rows, kind }: RowsProps) {
  return (
    <div className="l2-wrap">
      <table className="rtable">
        <thead>
          <tr>
            <th>Ποιος</th>
            <th>Γλώσσα</th>
            <th>Τελευταίο μήνυμα</th>
            <th className="num">Ερωτήσεις</th>
            <th className="num">Αναπάντητες</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td className="l2-cell">
                <Link href={screenHref(role, "L2", { kind, cv: c.id })}>
                  {c.who}
                </Link>{" "}
                <Badge>{c.kind}</Badge>
                {c.hitLimit && <Badge tone="attention">έφτασε το όριο</Badge>}
                {c.page && <span className="l2-sub">Σελίδα: {c.page}</span>}
              </td>
              <td>{c.language}</td>
              <td>{fmtWhen(c.lastAt)}</td>
              <td className="num">{c.turns.length}</td>
              <td className="num">{unansweredCount(c)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
