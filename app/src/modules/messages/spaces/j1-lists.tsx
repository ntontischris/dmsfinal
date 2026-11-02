import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

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
                {((row.openRequests ?? 0) > 0 || row.isPartial) && (
                  <span className="j1-conv-meta">
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
