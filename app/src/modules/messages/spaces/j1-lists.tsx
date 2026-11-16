import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { flowOf, oldestHref } from "@/spaces/flows/flows";

import { needKindLabel, waitLabel, type NeedRow } from "../needs-me";
import type { J1Conversation, J1Mention } from "./j1-adapter";

import "./j1.css";

// Οι λίστες των Εισερχομένων του prototype (`screens/j1-lists.tsx`) με πραγματικές γραμμές.
export function ConversationList({
  rows,
}: {
  rows: readonly J1Conversation[];
}) {
  return (
    <Panel label="Συνομιλίες" aside={rows.length} isFlush>
      <RowList>
        {rows.map((row) => (
          <ListRow
            key={row.id}
            lead={<Avatar name={row.name} size={40} />}
            href={row.href}
            title={row.name}
            isHighlighted={row.unread > 0}
            sub={
              <>
                <span className="part-sub j1-preview">{row.preview}</span>
                {((row.openRequests ?? 0) > 0 ||
                  row.isPartial ||
                  row.isWaiting) && (
                  <span className="j1-conv-meta">
                    {row.isWaiting && (
                      <Badge tone="strong">Περιμένει απάντηση</Badge>
                    )}
                    {(row.openRequests ?? 0) > 0 && (
                      <Badge>{row.openRequests} ανοιχτά Αιτήματα</Badge>
                    )}
                    {row.isPartial && (
                      <span className="badge muted">μόνο ό,τι σε αφορά</span>
                    )}
                  </span>
                )}
              </>
            }
            aside={
              <>
                <span className="part-sub">{row.when}</span>
                {row.unread > 0 && (
                  <Badge tone="strong">{row.unread} αδιάβαστα</Badge>
                )}
              </>
            }
          />
        ))}
      </RowList>
    </Panel>
  );
}

export function MentionList({ items }: { items: readonly J1Mention[] }) {
  return (
    <Panel label="Με ανέφεραν" aside={items.length} isFlush>
      <RowList>
        {items.map((m) => (
          <ListRow
            key={m.id}
            lead={<Avatar name={m.clientName} size={40} />}
            title={m.clientName}
            sub={m.text}
            aside={
              <>
                <span className="part-sub">{m.when}</span>
                <Link className="button" href={m.href}>
                  Άνοιγμα
                </Link>
              </>
            }
          />
        ))}
      </RowList>
    </Panel>
  );
}

// Η γραμμή ανοίγει μέσα στον οδηγό «Απαντώ σε Πελάτες», στο βήμα που θέλει το είδος της (Αίτημα → τι κάνουμε, αλλιώς απάντηση).
const needHrefOf = (row: NeedRow): string => {
  const flow = flowOf("apanto-se-pelates");
  return (flow && oldestHref(flow, 1, row.href, row.kind)) ?? row.href;
};

// «Χρειάζονται εμένα»: ποιοι περιμένουν απάντηση ή κάτι από μένα, ο πιο παλιός πρώτα.
export function NeedsMeList({ rows }: { rows: readonly NeedRow[] }) {
  if (rows.length === 0)
    return (
      <Panel label="Χρειάζονται εμένα" aside={0}>
        <p className="part-sub">Κανείς δεν σε περιμένει.</p>
      </Panel>
    );
  return (
    <Panel label="Χρειάζονται εμένα" aside={rows.length} isFlush>
      <RowList>
        {rows.map((row) => (
          <ListRow
            key={row.key}
            lead={<Avatar name={row.who} size={40} />}
            href={needHrefOf(row)}
            title={row.who}
            isHighlighted
            sub={<Badge>{needKindLabel(row.kind)}</Badge>}
            aside={<span className="part-sub">{waitLabel(row.since)}</span>}
          />
        ))}
      </RowList>
    </Panel>
  );
}
