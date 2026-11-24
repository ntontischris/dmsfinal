import Link from "next/link";

import { initialsOf } from "@/spaces/shell/avatar";

import type { J1Conversation, J1Mention } from "./j1-adapter";

import "../../finance/spaces/money-lines.css";
import "./j1.css";

// Οι λίστες των Εισερχομένων ως γραμμές `.ml-line`: πλακίδιο με αρχικά, όνομα Πελάτη, τελευταίο Μήνυμα, αδιάβαστα.
function ConversationLine({ row }: { row: J1Conversation }) {
  const openRequests = row.openRequests ?? 0;
  const hasUnread = row.unread > 0;
  return (
    <li className="ml-line j1-line" data-unread={hasUnread}>
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(row.name)}
      </span>
      <span className="ml-main">
        {(openRequests > 0 || row.isPartial) && (
          <span className="j1-tags">
            {openRequests > 0 && (
              <span className="ml-tag">{openRequests} ανοιχτά Αιτήματα</span>
            )}
            {row.isPartial && (
              <span className="ml-tag" data-muted>
                μόνο ό,τι σε αφορά
              </span>
            )}
          </span>
        )}
        <strong>
          <Link href={row.href}>{row.name}</Link>
        </strong>
        <small className="j1-preview">{row.preview}</small>
      </span>
      <span className="ml-amount">
        {hasUnread && row.unread}
        <small>{hasUnread ? `αδιάβαστα · ${row.when}` : row.when}</small>
      </span>
      <span className="ml-quick">
        <Link
          href={row.href}
          data-primary={hasUnread || undefined}
          aria-label={`Άνοιγμα Συνομιλίας: ${row.name}`}
        >
          Άνοιγμα
        </Link>
      </span>
    </li>
  );
}

export function ConversationList({
  rows,
}: {
  rows: readonly J1Conversation[];
}) {
  return (
    <ul className="ml-list" aria-label="Συνομιλίες">
      {rows.map((row) => (
        <ConversationLine key={row.id} row={row} />
      ))}
    </ul>
  );
}

export function MentionList({ items }: { items: readonly J1Mention[] }) {
  return (
    <ul className="ml-list" aria-label="Με ανέφεραν">
      {items.map((m) => (
        <li key={m.id} className="ml-line">
          <span className="ml-thumb" aria-hidden="true">
            {initialsOf(m.clientName)}
          </span>
          <span className="ml-main">
            <span className="ml-tag">{m.when}</span>
            <strong>{m.clientName}</strong>
            <small className="j1-preview">{m.text}</small>
          </span>
          <span aria-hidden="true" />
          <span className="ml-quick">
            <Link data-primary href={m.href}>
              Άνοιγμα
            </Link>
          </span>
        </li>
      ))}
    </ul>
  );
}
