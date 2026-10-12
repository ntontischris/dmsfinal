import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { formatWhen, whatOf } from "../sends-helpers";
import {
  CHANNEL_LABELS,
  COLUMNS,
  RETRIED_NOTE,
  SOURCE_AUTOMATION,
  SOURCE_SYSTEM,
  STATE_LABELS,
  recipientsCount,
} from "../sends-labels";
import type { Send } from "../sends-schema";
import { RetryButton } from "./retry-button";

// Ο πίνακας του K3: Πότε, Τι, Πηγή, Κανάλι, Παραλήπτης, Κατάσταση, Λόγος, Προσπάθειες (και «Ξαναστείλε» στα Απέτυχαν).

const isAttention = (send: Send): boolean =>
  send.state === "failed" || send.state === "retrying";

function Recipient({ send }: { send: Send }) {
  if (send.recipientCount !== null)
    return <>{recipientsCount(send.recipientCount)}</>;
  return (
    <span className="grid">
      <span>{send.recipientName ?? send.recipientEmail ?? "—"}</span>
      {send.recipientEmail && send.recipientName && (
        <span className="text-xs text-muted-foreground">
          {send.recipientEmail}
        </span>
      )}
      {send.clientName && (
        <span className="text-xs text-muted-foreground">
          Πελάτης: {send.clientName}
        </span>
      )}
    </span>
  );
}

function Action({ send, canRetry }: { send: Send; canRetry: boolean }) {
  if (send.isRetried)
    return (
      <span className="text-sm text-muted-foreground">{RETRIED_NOTE}</span>
    );
  if (canRetry && send.retryRef)
    return <RetryButton outboxId={send.retryRef} />;
  return <>—</>;
}

function SendRow({
  send,
  hasActions,
  canRetry,
}: {
  send: Send;
  hasActions: boolean;
  canRetry: boolean;
}) {
  return (
    <Tr>
      <Td data-label={COLUMNS.when} className="whitespace-nowrap">
        <time dateTime={send.at}>{formatWhen(send.at)}</time>
      </Td>
      <Td data-label={COLUMNS.what}>{whatOf(send)}</Td>
      <Td data-label={COLUMNS.source}>
        {send.source === "automation" ? SOURCE_AUTOMATION : SOURCE_SYSTEM}
      </Td>
      <Td data-label={COLUMNS.channel}>{CHANNEL_LABELS[send.channel]}</Td>
      <Td data-label={COLUMNS.recipient}>
        <Recipient send={send} />
      </Td>
      <Td data-label={COLUMNS.state}>
        <Badge tone={isAttention(send) ? "attention" : undefined}>
          {STATE_LABELS[send.state]}
        </Badge>
      </Td>
      <Td data-label={COLUMNS.reason}>{send.reason ?? "—"}</Td>
      <Td data-label={COLUMNS.attempts} isNumeric>
        {send.attempts}
      </Td>
      {hasActions && (
        <Td data-label={COLUMNS.action}>
          <Action send={send} canRetry={canRetry} />
        </Td>
      )}
    </Tr>
  );
}

interface SendsTableProps {
  sends: readonly Send[];
  hasActions: boolean;
  canRetry: boolean;
}

export function SendsTable({ sends, hasActions, canRetry }: SendsTableProps) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>{COLUMNS.when}</Th>
          <Th>{COLUMNS.what}</Th>
          <Th>{COLUMNS.source}</Th>
          <Th>{COLUMNS.channel}</Th>
          <Th>{COLUMNS.recipient}</Th>
          <Th>{COLUMNS.state}</Th>
          <Th>{COLUMNS.reason}</Th>
          <Th isNumeric>{COLUMNS.attempts}</Th>
          {hasActions && <Th>{COLUMNS.action}</Th>}
        </tr>
      </thead>
      <tbody>
        {sends.map((send) => (
          <SendRow
            key={send.id}
            send={send}
            hasActions={hasActions}
            canRetry={canRetry}
          />
        ))}
      </tbody>
    </Table>
  );
}
