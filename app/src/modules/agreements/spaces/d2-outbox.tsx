"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

import { markOutbox } from "../actions-flow";
import { formatDateTime, proposalUrl } from "../helpers";
import { MANUAL_DELIVERY_NOTE, OUTBOX_KIND_LABELS } from "../labels";
import type { OutboxItem, OutboxStatus } from "../types";
import { D2Form, D2Scope } from "./d2-ui";
import { ItemRows } from "./lane-rows";

// «Εξερχόμενα»: δεν υπάρχει στο prototype (εκεί τα email φεύγουν μόνα τους). Μέχρι να συνδεθεί πάροχος email, Σύνδεσμοι,
// κωδικοί υπογραφής, αντίγραφο και πρόσκληση τα παραδίδει η ομάδα από εδώ· στη μορφή γραμμών του screens2.

const STATUS_TEXT: Readonly<Record<OutboxStatus, string>> = {
  pending: "περιμένει",
  sent: "στάλθηκε",
  manual: "παραδόθηκε χειροκίνητα",
  cancelled: "ακυρώθηκε",
  failed: "απέτυχε",
};

const AMOUNTS_ONLY = "φαίνεται μόνο σε όποιον «Βλέπει ποσά»";

function MarkForm({
  item,
  label,
  status = "manual",
}: {
  item: OutboxItem;
  label: string;
  status?: "manual" | "cancelled";
}) {
  return (
    <D2Form action={markOutbox} submitLabel={label} className="btn-row">
      <input type="hidden" name="outboxId" value={item.id} />
      <input type="hidden" name="status" value={status} />
    </D2Form>
  );
}

function CopyButton({ value }: { value: string }) {
  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
    } catch {
      setIsCopied(false); // ο browser δεν επιτρέπει αντιγραφή: το πεδίο μένει επιλέξιμο με το χέρι
    }
  };
  return (
    <button type="button" className="button" onClick={handleCopy}>
      {isCopied ? "Αντιγράφηκε" : "Αντιγραφή"}
    </button>
  );
}

const groupedCode = (code: string): string =>
  code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;

const timeOf = (iso: string): string =>
  formatDateTime(iso).split(", ")[1] ?? formatDateTime(iso);

const isExpired = (item: OutboxItem): boolean =>
  item.codeExpiresAt !== null && Date.parse(item.codeExpiresAt) <= Date.now();

function LinkBody({ item, origin }: { item: OutboxItem; origin: string }) {
  if (item.linkPath === null)
    return <span className="muted">Ο Σύνδεσμος {AMOUNTS_ONLY}.</span>;
  const url = proposalUrl(origin, item.linkPath);
  return (
    <span className="stack">
      <label className="stack">
        <span className="muted">Σύνδεσμος για {item.toName}</span>
        <input
          className="input d2-wide"
          readOnly
          value={url}
          aria-label={`Σύνδεσμος για ${item.toName}`}
          onFocus={(e) => e.currentTarget.select()}
        />
      </label>
      <span className="btn-row">
        <CopyButton value={url} />
        <MarkForm item={item} label="Το έστειλα" />
      </span>
    </span>
  );
}

function CodeBody({ item }: { item: OutboxItem }) {
  if (item.code === null && !isExpired(item))
    return <span className="muted">Ο κωδικός {AMOUNTS_ONLY}.</span>;
  if (item.code === null)
    return (
      <span className="stack">
        <span className="muted">
          Ο κωδικός έληξε· ο πελάτης ζητά νέο από τη σελίδα του.
        </span>
        <MarkForm item={item} label="Ακύρωση" status="cancelled" />
      </span>
    );
  return (
    <span className="stack">
      <span>
        Κωδικός υπογραφής για {item.toName}:{" "}
        <strong className="num">{groupedCode(item.code)}</strong>
        {item.codeExpiresAt && ` · ισχύει ως ${timeOf(item.codeExpiresAt)}`}
      </span>
      <MarkForm item={item} label="Τον είπα στον πελάτη" />
    </span>
  );
}

function TaskBody({ item }: { item: OutboxItem }) {
  return (
    <span className="stack">
      <span>
        {item.kind === "signed_copy"
          ? `Στείλε το αντίγραφο στο ${item.toEmail}`
          : "Κάλεσε τον Υπογράφοντα ως Χρήστη πελάτη"}
      </span>
      <MarkForm item={item} label="Έγινε" />
    </span>
  );
}

const isActionable = (item: OutboxItem, isConnected: boolean): boolean =>
  !isConnected && item.status === "pending";

interface OutboxProps {
  items: readonly OutboxItem[];
  origin: string;
  emailSenderConnected: boolean;
}

export function OutboxSection({
  items,
  origin,
  emailSenderConnected,
}: OutboxProps) {
  if (items.length === 0) return null;
  const pending = items.filter((i) => isActionable(i, emailSenderConnected));
  const rest = items.filter((i) => !isActionable(i, emailSenderConnected));
  const body = (item: OutboxItem) =>
    item.kind === "proposal_link" ? (
      <LinkBody item={item} origin={origin} />
    ) : item.kind === "signing_code" ? (
      <CodeBody item={item} />
    ) : (
      <TaskBody item={item} />
    );
  return (
    <div id="outbox">
      <Panel label="Εξερχόμενα">
        {!emailSenderConnected && (
          <p className="muted">{MANUAL_DELIVERY_NOTE}</p>
        )}
        <D2Scope messageAt="top">
          {pending.length > 0 && (
            <ItemRows
              items={pending.map((item) => ({
                id: item.id,
                title: OUTBOX_KIND_LABELS[item.kind],
                sub: body(item),
                aside: <Badge tone="strong">{STATUS_TEXT[item.status]}</Badge>,
              }))}
            />
          )}
        </D2Scope>
        {rest.length > 0 && (
          <ItemRows
            items={rest.map((item) => ({
              id: item.id,
              isFaded: true,
              title: `${OUTBOX_KIND_LABELS[item.kind]} · ${item.toName}`,
              sub: item.handledAt ? formatDateTime(item.handledAt) : undefined,
              aside: (
                <Badge tone={item.status === "failed" ? "attention" : "faded"}>
                  {STATUS_TEXT[item.status]}
                </Badge>
              ),
            }))}
          />
        )}
      </Panel>
    </div>
  );
}
