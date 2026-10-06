import Link from "next/link";

import type { Message } from "@/data/messages";
import type { ConversationRow } from "@/data/messages-access";
import type { RoleId } from "@/data/roles";
import { previewOf, whenOf } from "@/screens/j1-model";
import { Badge, screenHref } from "@/screens/shared";

import "./j1.css";

interface ConversationListProps {
  role: RoleId;
  rows: readonly ConversationRow[];
}

export function ConversationList({ role, rows }: ConversationListProps) {
  return (
    <ul className="list">
      {rows.map((row) => (
        <li key={row.client.id} className="j1-conv">
          <Link href={screenHref(role, "J2", { client: row.client.id })}>
            <span className="j1-conv-top">
              <strong>{row.client.name}</strong>
              <span className="j1-conv-meta">
                {row.last && <span className="muted">{whenOf(row.last)}</span>}
                {row.unread > 0 && (
                  <Badge tone="strong">{row.unread} αδιάβαστα</Badge>
                )}
              </span>
            </span>
            <span className="j1-preview">
              {row.last ? previewOf(row.last) : "Καμία ακόμα επικοινωνία"}
            </span>
            <span className="j1-conv-meta">
              {row.openRequests > 0 && (
                <Badge>{row.openRequests} ανοιχτά Αιτήματα</Badge>
              )}
              {row.isPartial && (
                <span className="badge muted">μόνο ό,τι σε αφορά</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

interface MentionListProps {
  role: RoleId;
  items: readonly Message[];
  clientName: (id: string) => string;
}

export function MentionList({ role, items, clientName }: MentionListProps) {
  return (
    <ul className="list">
      {items.map((m) => (
        <li key={m.id} className="j1-mention">
          <div className="row">
            <strong>{clientName(m.clientId)}</strong>
            <span className="muted">{whenOf(m)}</span>
          </div>
          <p>{m.text}</p>
          <Link
            className="button"
            href={screenHref(role, "J2", { client: m.clientId, message: m.id })}
          >
            Άνοιγμα
          </Link>
        </li>
      ))}
    </ul>
  );
}
