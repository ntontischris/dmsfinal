"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { markOutbox } from "../actions-flow";
import { formatDateTime, proposalUrl } from "../helpers";
import { MANUAL_DELIVERY_NOTE, OUTBOX_KIND_LABELS } from "../labels";
import type { OutboxItem, OutboxStatus } from "../types";

import { NoticeScope, ScopedForm } from "./agreement-actions-parts";
import { MutedNote } from "./terms-section-parts";

// Το «εξερχόμενο» της Συμφωνίας: μέχρι να συνδεθεί πάροχος email, τα μηνύματα (Σύνδεσμοι, κωδικοί υπογραφής, αντίγραφο,
// πρόσκληση) τα παραδίδει η ομάδα από εδώ. ΜΟΝΟ εδώ φαίνονται Σύνδεσμοι και κωδικοί· πουθενά αλλού στην εφαρμογή.

const STATUS_TEXT: Readonly<Record<OutboxStatus, string>> = {
  pending: "περιμένει",
  sent: "στάλθηκε",
  manual: "παραδόθηκε χειροκίνητα",
  cancelled: "ακυρώθηκε",
  failed: "απέτυχε",
};

interface OutboxSectionProps {
  items: readonly OutboxItem[];
  origin: string;
  emailSenderConnected: boolean;
}

interface MarkFormProps {
  item: OutboxItem;
  label: string;
  status?: "manual" | "cancelled";
}

function MarkForm({ item, label, status = "manual" }: MarkFormProps) {
  return (
    <ScopedForm action={markOutbox} submitLabel={label} size="sm">
      <input type="hidden" name="outboxId" value={item.id} />
      <input type="hidden" name="status" value={status} />
    </ScopedForm>
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
    <Button size="sm" onClick={handleCopy}>
      {isCopied ? "Αντιγράφηκε" : "Αντιγραφή"}
    </Button>
  );
}

// Η βάση δίνει Σύνδεσμο και κωδικό μόνο σε όποιον «Βλέπει ποσά»· στους άλλους φτάνουν null.
const AMOUNTS_ONLY_NOTE = "Ο Σύνδεσμος φαίνεται μόνο σε όποιον «Βλέπει ποσά».";

function LinkItem({ item, origin }: { item: OutboxItem; origin: string }) {
  if (item.linkPath === null) return <MutedNote>{AMOUNTS_ONLY_NOTE}</MutedNote>;
  const url = proposalUrl(origin, item.linkPath);
  return (
    <div className="grid gap-2">
      <Field label={`Σύνδεσμος για ${item.toName}`}>
        <Input
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
        />
      </Field>
      <div className="flex flex-wrap items-start gap-2">
        <CopyButton value={url} />
        <MarkForm item={item} label="Το έστειλα" />
      </div>
    </div>
  );
}

// Ο κωδικός γράφεται σε δύο τριάδες («481 920») για να τον υπαγορεύει κανείς εύκολα.
const groupedCode = (code: string): string =>
  code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;

const timeOf = (iso: string): string =>
  formatDateTime(iso).split(", ")[1] ?? formatDateTime(iso);

const isExpired = (item: OutboxItem): boolean =>
  item.codeExpiresAt !== null && Date.parse(item.codeExpiresAt) <= Date.now();

function CodeItem({ item }: { item: OutboxItem }) {
  if (item.code === null && !isExpired(item))
    return <MutedNote>Ο κωδικός φαίνεται μόνο σε όποιον «Βλέπει ποσά».</MutedNote>;
  if (item.code === null)
    return (
      <div className="grid gap-2">
        <MutedNote>
          Ο κωδικός έληξε· ο πελάτης ζητά νέο από τη σελίδα του.
        </MutedNote>
        <MarkForm item={item} label="Ακύρωση" status="cancelled" />
      </div>
    );
  return (
    <div className="grid gap-2">
      <p className="m-0 text-sm">
        Κωδικός υπογραφής για {item.toName}:{" "}
        <strong className="font-mono text-base tracking-wider">
          {groupedCode(item.code)}
        </strong>
        {item.codeExpiresAt && ` · ισχύει ως ${timeOf(item.codeExpiresAt)}`}
      </p>
      <MarkForm item={item} label="Τον είπα στον πελάτη" />
    </div>
  );
}

function TaskItem({ item }: { item: OutboxItem }) {
  const text =
    item.kind === "signed_copy"
      ? `Στείλε το αντίγραφο στο ${item.toEmail}`
      : "Κάλεσε τον Υπογράφοντα ως Χρήστη πελάτη";
  return (
    <div className="grid gap-2">
      <p className="m-0 text-sm">{text}</p>
      <MarkForm item={item} label="Έγινε" />
    </div>
  );
}

function PendingItem({ item, origin }: { item: OutboxItem; origin: string }) {
  const body =
    item.kind === "proposal_link" ? (
      <LinkItem item={item} origin={origin} />
    ) : item.kind === "signing_code" ? (
      <CodeItem item={item} />
    ) : (
      <TaskItem item={item} />
    );
  return <li className="rounded-sm border p-3">{body}</li>;
}

function HandledItem({ item }: { item: OutboxItem }) {
  return (
    <li className="text-sm text-muted-foreground">
      {OUTBOX_KIND_LABELS[item.kind]} · {item.toName} ·{" "}
      {STATUS_TEXT[item.status]}
      {item.handledAt && ` · ${formatDateTime(item.handledAt)}`}
    </li>
  );
}

// Με συνδεδεμένο πάροχο το πάνελ δείχνει μόνο καταστάσεις (ο Σύνδεσμος και ο κωδικός δεν εμφανίζονται ποτέ).
const isActionable = (item: OutboxItem, isConnected: boolean): boolean =>
  !isConnected && item.status === "pending";

export function OutboxSection({
  items,
  origin,
  emailSenderConnected,
}: OutboxSectionProps) {
  if (items.length === 0) return null;
  const pending = items.filter((i) => isActionable(i, emailSenderConnected));
  const rest = items.filter((i) => !isActionable(i, emailSenderConnected));
  return (
    <div id="outbox">
      <Panel label="Εξερχόμενα">
        <NoticeScope>
          {!emailSenderConnected && (
            <MutedNote>{MANUAL_DELIVERY_NOTE}</MutedNote>
          )}
          {pending.length > 0 && (
            <ul className="m-0 grid list-none gap-3 p-0">
              {pending.map((item) => (
                <PendingItem key={item.id} item={item} origin={origin} />
              ))}
            </ul>
          )}
          {rest.length > 0 && (
            <ul className="m-0 grid list-none gap-1 p-0">
              {rest.map((item) => (
                <HandledItem key={item.id} item={item} />
              ))}
            </ul>
          )}
        </NoticeScope>
      </Panel>
    </div>
  );
}
