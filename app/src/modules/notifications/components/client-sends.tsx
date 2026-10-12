import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { getClientSends } from "../queries-sends";
import { formatWhen, sendsHref, whatOf } from "../sends-helpers";
import {
  CLIENT_SENDS_EMPTY,
  CLIENT_SENDS_NOTE,
  CLIENT_SENDS_TITLE,
  COLUMNS,
  SENDS_LOAD_ERROR_TEXT,
  SENDS_LOAD_ERROR_TITLE,
  SENDS_TITLE,
  STATE_LABELS,
} from "../sends-labels";
import type { ClientSend } from "../sends-schema";

// Καρτέλα «Αποστολές» της σελίδας Πελάτη (B2, #174): οι τελευταίες αποστολές προς τους Χρήστες του Πελάτη, χωρίς περιεχόμενο.
// Η σελίδα τη δείχνει μόνο σε όσους επιτρέπεται· η βάση το ξανακρίνει (42501 → τίποτα).

function SendsList({ sends }: { sends: readonly ClientSend[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>{COLUMNS.when}</Th>
          <Th>{COLUMNS.what}</Th>
          <Th>{COLUMNS.recipient}</Th>
          <Th>{COLUMNS.state}</Th>
        </tr>
      </thead>
      <tbody>
        {sends.map((send) => (
          <Tr key={send.id}>
            <Td data-label={COLUMNS.when} className="whitespace-nowrap">
              <time dateTime={send.at}>{formatWhen(send.at)}</time>
            </Td>
            <Td data-label={COLUMNS.what}>{whatOf(send)}</Td>
            <Td data-label={COLUMNS.recipient}>{send.recipientName ?? "—"}</Td>
            <Td data-label={COLUMNS.state}>
              <Badge tone={send.state === "failed" ? "attention" : undefined}>
                {STATE_LABELS[send.state]}
              </Badge>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

export async function ClientSends({
  clientId,
  hasHistoryLink,
}: {
  clientId: string;
  hasHistoryLink: boolean;
}) {
  const result = await getClientSends(clientId, null);
  if (!result.ok)
    return (
      <Notice kind="error" title={SENDS_LOAD_ERROR_TITLE}>
        <p className="m-0">{SENDS_LOAD_ERROR_TEXT}</p>
      </Notice>
    );
  if (!result.data) return null;
  return (
    <Panel label={CLIENT_SENDS_TITLE}>
      <div className="grid gap-3">
        {result.data.items.length > 0 ? (
          <SendsList sends={result.data.items} />
        ) : (
          <p className="m-0 text-sm text-muted-foreground">
            {CLIENT_SENDS_EMPTY}
          </p>
        )}
        <p className="m-0 text-sm text-muted-foreground">
          {CLIENT_SENDS_NOTE}
          {hasHistoryLink && (
            <>
              {" "}
              <Link
                href={sendsHref({
                  tab: "sent",
                  channel: null,
                  client: clientId,
                  cursor: null,
                })}
              >
                {SENDS_TITLE}
              </Link>
            </>
          )}
        </p>
      </div>
    </Panel>
  );
}
