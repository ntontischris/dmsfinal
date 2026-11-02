import Link from "next/link";

import { can, getViewer } from "@/modules/access";
import { getHealth } from "@/modules/health";
import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

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
import { l2RowOf, l2Tabs, usageOf, type L2Usage } from "./l2-adapter";

import "./l1.css";
import "./l2.css";

export const L2_DENIED =
  "Τις Συζητήσεις τις βλέπει όποιος διαχειρίζεται τη Γνώση.";

// Η κατανάλωση του μήνα (prototype › Usage). Τη βλέπει όποιος «Βλέπει Υγεία συστήματος» (η ίδια ανάγνωση με τη P2)·
// η εφαρμογή δεν μετρά χωριστά το δημόσιο μέρος, άρα φαίνεται μόνο το όριό του.
function Usage({ usage, month }: { usage: L2Usage; month: string }) {
  return (
    <Panel label={`Κατανάλωση ${month}`}>
      <p>{usage.text}</p>
      <div className="l2-bar" aria-hidden="true">
        <span className="pub" style={{ width: `${usage.spentPercent}%` }} />
        <i style={{ left: `${usage.ceilingPercent}%` }} />
      </div>
      <p className="note">
        Στο όριο σταματά ο Βοηθός της Ιστοσελίδας, στο 100% και ο Βοηθός μέσα
        στο σύστημα· ειδοποιούνται όσοι «Βλέπουν Υγεία συστήματος» (Γεγονός 57).
        Τα όρια αλλάζουν στις Ρυθμίσεις → Εταιρεία → Βοηθός· το πλαφόν μόνο ο
        Ιδιοκτήτης.
      </p>
    </Panel>
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
    <nav className="toolbar l1-pad" aria-label="Σελίδες">
      {list.page > 1 && (
        <Link className="button" href={hrefOf(list.page - 1)}>
          ← Νεότερες
        </Link>
      )}
      <span className="muted">
        Σελίδα {list.page} από {pages}
      </span>
      {list.page < pages && (
        <Link className="button" href={hrefOf(list.page + 1)}>
          Παλαιότερες →
        </Link>
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
    <Panel label="Συζητήσεις" aside={list.total} isFlush>
      <RowList>
        {list.items.map(l2RowOf).map((row) => (
          <ListRow
            key={row.id}
            lead={<Avatar name={row.who} size={40} />}
            href={row.href}
            title={row.who}
            sub={
              <>
                {row.firstQuestion && (
                  <span className="part-sub">«{row.firstQuestion}»</span>
                )}
                <span className="part-sub">{row.when}</span>
                <span className="part-sub">{row.counts}</span>
              </>
            }
            aside={<Badge>{row.kind}</Badge>}
          />
        ))}
      </RowList>
      <Pager list={list} audience={audience} />
    </Panel>
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
    <div data-spaces>
      {done && (
        <p className="note" role="status">
          {DONE_TEXT[done]}
        </p>
      )}
      <UsageSlot />
      <nav className="tabs" aria-label="Είδος Συζήτησης">
        {l2Tabs(list, audience).map((tab) => (
          <Link
            key={tab.label}
            className="tab"
            aria-current={tab.isCurrent ? "page" : undefined}
            href={tab.href}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {list.items.length > 0 ? (
        <Rows list={list} audience={audience} />
      ) : (
        <StateNotice kind="empty" title="Καμία Συζήτηση ακόμα">
          Όταν κάποιος ρωτήσει τον Βοηθό, η Συζήτηση θα εμφανιστεί εδώ.
        </StateNotice>
      )}
      <p className="note">{READ_ONLY_NOTE}</p>
    </div>
  );
}
