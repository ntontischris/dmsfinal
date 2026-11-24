import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";

import { eventHref } from "../automation-helpers";
import { whatOf } from "../sends-helpers";
import {
  CHANNEL_LABELS,
  KIND_LABELS,
  RETRIED_NOTE,
  STATE_LABELS,
  recipientsCount,
} from "../sends-labels";
import type { Send } from "../sends-schema";
import { isAttention, timeParts, whatNextOf } from "./k3-model";
import { RetryButton } from "./k3-retry";

import "../../finance/spaces/money-lines.css";
import "./k3.css";

// Η πηγή της αποστολής: το Γεγονός του Αυτοματισμού (ανοίγει την K1) ή το Μήνυμα συστήματος (ανοίγει την K2).
function Source({ send }: { send: Send }) {
  if (send.source === "system")
    return (
      <Link href={hrefOf("K2")}>
        Μήνυμα συστήματος:{" "}
        {send.kind ? (KIND_LABELS[send.kind] ?? send.kind) : "—"}
      </Link>
    );
  if (!send.eventType) return <span>Αυτοματισμός</span>;
  return (
    <Link href={eventHref(send.eventType)}>
      Γεγονός: {send.eventLabel ?? send.eventType}
    </Link>
  );
}

const recipientOf = (send: Send): string =>
  send.recipientCount !== null
    ? recipientsCount(send.recipientCount)
    : (send.recipientName ?? send.recipientEmail ?? "—");

function Action({ send, canRetry }: { send: Send; canRetry: boolean }) {
  if (send.isRetried) return <small>{RETRIED_NOTE}</small>;
  if (canRetry && send.retryRef)
    return <RetryButton outboxId={send.retryRef} />;
  return null;
}

interface SendRowProps {
  send: Send;
  hasRetry: boolean;
  canRetry: boolean;
}

function SendRow({ send: s, hasRetry, canRetry }: SendRowProps) {
  const { time, date } = timeParts(s.at);
  const next = whatNextOf(s);
  return (
    <li className="ml-line">
      <span className="ml-thumb k3-time">{time}</span>
      <span className="ml-main">
        <strong>{whatOf(s)}</strong>
        <span className="k3-sub">
          <span>
            {date} · <Source send={s} />
          </span>
          <span>
            {CHANNEL_LABELS[s.channel]} · {recipientOf(s)}
            {s.recipientEmail && s.recipientName && ` (${s.recipientEmail})`}
            {s.clientName && ` · Πελάτης: ${s.clientName}`}
          </span>
          <span>
            Λόγος: {s.reason ?? "—"}
            {next && ` · ${next}`}
            {` · Προσπάθειες: ${s.attempts}`}
          </span>
        </span>
      </span>
      <span className="ml-tag" data-attention={isAttention(s) || undefined}>
        {STATE_LABELS[s.state]}
      </span>
      <span className="ml-quick">
        {hasRetry && <Action send={s} canRetry={canRetry} />}
      </span>
    </li>
  );
}

interface SendTableProps {
  sends: readonly Send[];
  hasRetry: boolean;
  canRetry: boolean;
}

export function SendTable({ sends, hasRetry, canRetry }: SendTableProps) {
  return (
    <details className="ml-box" open>
      <summary>
        <h2 className="ml-box-title">Αποστολές</h2>
        <small>{`${sends.length} σε αυτή τη σελίδα`}</small>
      </summary>
      <ul className="ml-list">
        {sends.map((s) => (
          <SendRow
            key={s.id}
            send={s}
            hasRetry={hasRetry}
            canRetry={canRetry}
          />
        ))}
      </ul>
    </details>
  );
}
