import Link from "next/link";

import { can, getViewer } from "@/modules/access";
import { getHealth } from "@/modules/health";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import {
  CONVERSATIONS_PATH,
  listHref,
  pageCount,
  type DoneCode,
} from "../assistant-helpers";
import { DONE_TEXT, READ_ONLY_NOTE } from "../assistant-labels";
import { getConversations } from "../assistant-queries";
import type {
  ConversationAudience,
  ConversationList,
} from "../assistant-view-schema";
import { KBox } from "./k-box";
import { l2RowOf, l2Tabs, usageOf, type L2Usage } from "./l2-adapter";

import "../../finance/spaces/money-lines.css";
import "./k.css";
import "./l2.css";

export const L2_DENIED =
  "Τις Συζητήσεις τις βλέπει όποιος διαχειρίζεται τη Γνώση.";

// Η κατανάλωση του μήνα (prototype › Usage). Τη βλέπει όποιος «Βλέπει Υγεία συστήματος» (η ίδια ανάγνωση με τη P2)·
// η εφαρμογή δεν μετρά χωριστά το δημόσιο μέρος, άρα φαίνεται μόνο το όριό του.
function Usage({ usage, month }: { usage: L2Usage; month: string }) {
  return (
    <KBox
      title={`Κατανάλωση ${month}`}
      hint={`${Math.round(usage.spentPercent)}% του πλαφόν`}
    >
      <p>{usage.text}</p>
      <div className="l2-bar" aria-hidden="true">
        <span className="pub" style={{ width: `${usage.spentPercent}%` }} />
        <i style={{ left: `${usage.ceilingPercent}%` }} />
      </div>
      <p className="k-note">
        Στο όριο σταματά ο Βοηθός της Ιστοσελίδας, στο 100% και ο Βοηθός μέσα
        στο σύστημα· ειδοποιούνται όσοι «Βλέπουν Υγεία συστήματος» (Γεγονός 57).
        Τα όρια αλλάζουν στις Ρυθμίσεις → Εταιρεία → Βοηθός· το πλαφόν μόνο ο
        Ιδιοκτήτης.
      </p>
    </KBox>
  );
}

async function UsageSlot() {
  if (!can(await getViewer(), "health.view")) return null;
  const health = await getHealth();
  if (!health.ok) return <ErrorNotice what="η κατανάλωση του Βοηθού" />;
  const usage = usageOf(health.data.ai);
  return usage && <Usage usage={usage} month={health.data.ai.month} />;
}

function Pager({
  list,
  audience,
}: {
  list: ConversationList;
  audience: ConversationAudience | null;
}) {
  const pages = pageCount(list.total, list.pageSize);
  if (pages <= 1) return null;
  const hrefOf = (page: number) =>
    listHref(CONVERSATIONS_PATH, { tab: audience, page });
  return (
    <nav className="ml-quick k-pager" aria-label="Σελίδες">
      {list.page > 1 && <Link href={hrefOf(list.page - 1)}>← Νεότερες</Link>}
      <span className="k-note">
        Σελίδα {list.page} από {pages}
      </span>
      {list.page < pages && (
        <Link href={hrefOf(list.page + 1)}>Παλαιότερες →</Link>
      )}
    </nav>
  );
}

function Rows({
  list,
  audience,
}: {
  list: ConversationList;
  audience: ConversationAudience | null;
}) {
  return (
    <KBox title="Συζητήσεις" hint={`${list.total} Συζητήσεις`} isOpen>
      <ul className="ml-list">
        {list.items.map(l2RowOf).map((row) => (
          <li key={row.id} className="ml-line">
            <span className="ml-thumb" aria-hidden="true">
              {initialsOf(row.who)}
            </span>
            <div className="ml-main">
              <Link className="k-link" href={row.href}>
                <strong>{row.who}</strong>
              </Link>
              {row.firstQuestion && <small>«{row.firstQuestion}»</small>}
              <small>
                {row.when} · {row.counts}
              </small>
            </div>
            <span className="ml-quick">
              <Badge>{row.kind}</Badge>
            </span>
          </li>
        ))}
      </ul>
      <Pager list={list} audience={audience} />
    </KBox>
  );
}

interface SpacesConversationsProps {
  audience: ConversationAudience | null;
  page: number;
  done: DoneCode | null;
}

// L2 Συζητήσεις Βοηθού στη νέα εμφάνιση (prototype `screens/L2.tsx`). Χωρίς «Διαχειρίζεται Γνώση» η βάση δίνει null.
export async function SpacesConversations({
  audience,
  page,
  done,
}: SpacesConversationsProps) {
  const viewer = await getViewer();
  const result =
    viewer.status === "signed-in"
      ? await getConversations(audience, page)
      : null;
  if (result?.ok === false)
    return (
      <div data-spaces>
        <ErrorNotice what="οι Συζητήσεις του Βοηθού" />
      </div>
    );
  const list = result?.data;
  if (!list)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {L2_DENIED}
        </StateNotice>
      </div>
    );
  return (
    <div data-spaces className="k">
      <section>
        <header className="ml-hero">
          <span className="ml-hero-mono" aria-hidden="true">
            Σ
          </span>
          <div>
            <Badge>Μόνο ανάγνωση</Badge>
            <h1>Συζητήσεις Βοηθού</h1>
            <p>{list.total} Συζητήσεις συνολικά σε αυτό το είδος.</p>
          </div>
        </header>
      </section>
      {done && (
        <p className="k-note" role="status">
          {DONE_TEXT[done]}
        </p>
      )}
      <nav className="page-filters" aria-label="Είδος Συζήτησης">
        {l2Tabs(list, audience).map((tab) => (
          <Link
            key={tab.label}
            aria-current={tab.isCurrent ? "page" : undefined}
            href={tab.href}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="ml-stack">
        {list.items.length > 0 ? (
          <Rows list={list} audience={audience} />
        ) : (
          <p className="ml-empty" role="status">
            <strong>Καμία Συζήτηση ακόμα.</strong> Όταν κάποιος ρωτήσει τον
            Βοηθό, η Συζήτηση θα εμφανιστεί εδώ.
          </p>
        )}
        <UsageSlot />
      </div>
      <p className="k-note">{READ_ONLY_NOTE}</p>
    </div>
  );
}
