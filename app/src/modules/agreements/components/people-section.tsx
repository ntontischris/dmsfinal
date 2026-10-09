"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { setRecipients } from "../actions-draft";
import { revokeLink, reissueLink } from "../actions-flow";
import { formatDate } from "../helpers";
import { LINK_STATUS_LABELS } from "../labels";
import type { AgreementDetail, LinkInfo, Recipient } from "../types";

import { ActionForm } from "./action-form";
import { NoticeScope, ScopedForm } from "./agreement-actions-parts";
import { MutedNote } from "./terms-section-parts";

const SIGNATORY_NOTE =
  "Υπογράφει μόνο ο/η Υπογράφων· οι άλλοι βλέπουν και ζητούν αλλαγές.";
const MAX_RECIPIENTS = 10;

interface DraftRow {
  key: number;
  name: string;
  email: string;
  isSignatory: boolean;
}

const toDrafts = (recipients: readonly Recipient[]): DraftRow[] =>
  recipients.map((r, key) => ({
    key,
    name: r.name,
    email: r.email,
    isSignatory: r.isSignatory,
  }));

const serialize = (rows: readonly DraftRow[]): string =>
  JSON.stringify(
    rows.map((row) => ({
      name: row.name,
      email: row.email,
      isSignatory: row.isSignatory,
    })),
  );

interface EditorRowProps {
  row: DraftRow;
  canRemove: boolean;
  onChange: (key: number, patch: Partial<DraftRow>) => void;
  onSignatory: (key: number) => void;
  onRemove: (key: number) => void;
}

function EditorRow({
  row,
  canRemove,
  onChange,
  onSignatory,
  onRemove,
}: EditorRowProps) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-sm border px-3 py-2">
      <div className="min-w-40 flex-1">
        <Input
          aria-label="Όνομα παραλήπτη"
          value={row.name}
          autoComplete="off"
          onChange={(event) => onChange(row.key, { name: event.target.value })}
        />
      </div>
      <div className="min-w-48 flex-1">
        <Input
          type="email"
          aria-label="Email παραλήπτη"
          value={row.email}
          autoComplete="off"
          onChange={(event) => onChange(row.key, { email: event.target.value })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="radio"
          name="signatory"
          checked={row.isSignatory}
          onChange={() => onSignatory(row.key)}
          className="accent-primary"
        />
        Υπογράφων
      </label>
      <Button
        variant="ghost"
        size="sm"
        disabled={!canRemove}
        onClick={() => onRemove(row.key)}
      >
        Αφαίρεση
      </Button>
    </li>
  );
}

function RecipientsEditor({ agreement }: { agreement: AgreementDetail }) {
  const [rows, setRows] = useState<DraftRow[]>(() =>
    toDrafts(agreement.recipients),
  );
  const [nextKey, setNextKey] = useState(agreement.recipients.length);
  const handleAdd = () => {
    setRows((current) => [
      ...current,
      { key: nextKey, name: "", email: "", isSignatory: false },
    ]);
    setNextKey((current) => current + 1);
  };
  const handleChange = (key: number, patch: Partial<DraftRow>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  const handleSignatory = (key: number) =>
    setRows((current) =>
      current.map((row) => ({ ...row, isSignatory: row.key === key })),
    );
  const handleRemove = (key: number) =>
    setRows((current) => current.filter((row) => row.key !== key));
  return (
    <ActionForm action={setRecipients} submitLabel="Αποθήκευση παραληπτών">
      <input type="hidden" name="agreementId" value={agreement.id} />
      <input type="hidden" name="recipients" value={serialize(rows)} />
      <ul className="m-0 grid list-none gap-2 p-0">
        {rows.map((row) => (
          <EditorRow
            key={row.key}
            row={row}
            canRemove={rows.length > 1}
            onChange={handleChange}
            onSignatory={handleSignatory}
            onRemove={handleRemove}
          />
        ))}
      </ul>
      <div>
        <Button
          size="sm"
          disabled={rows.length >= MAX_RECIPIENTS}
          onClick={handleAdd}
        >
          Προσθήκη παραλήπτη
        </Button>
      </div>
    </ActionForm>
  );
}

function LinkCell({ link }: { link: LinkInfo | null }) {
  if (link === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap items-center gap-1 max-sm:justify-end">
      <Badge tone={link.status === "active" ? "ok" : undefined}>
        {LINK_STATUS_LABELS[link.status]}
      </Badge>
      {link.isOpened && (
        <Badge>
          άνοιξε
          {link.firstOpenedAt && ` ${formatDate(link.firstOpenedAt)}`}
          {link.openCount > 1 && ` · ${link.openCount} φορές`}
        </Badge>
      )}
    </span>
  );
}

function LinkActions({ link }: { link: LinkInfo }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ScopedForm action={revokeLink} submitLabel="Ανάκληση" size="sm">
        <input type="hidden" name="linkId" value={link.id} />
      </ScopedForm>
      <ScopedForm action={reissueLink} submitLabel="Νέος σύνδεσμος" size="sm">
        <input type="hidden" name="linkId" value={link.id} />
      </ScopedForm>
    </div>
  );
}

function RecipientsTable({
  recipients,
  canManageLinks,
}: {
  recipients: readonly Recipient[];
  canManageLinks: boolean;
}) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Όνομα</Th>
          <Th>Email</Th>
          <Th>Υπογράφων</Th>
          <Th>Σύνδεσμος</Th>
        </tr>
      </thead>
      <tbody>
        {recipients.map((recipient) => (
          <Tr key={recipient.id}>
            <Td data-label="Όνομα">{recipient.name}</Td>
            <Td data-label="Email">
              <span className="break-all">{recipient.email}</span>
            </Td>
            <Td data-label="Υπογράφων">
              {recipient.isSignatory ? "ναι" : "—"}
            </Td>
            <Td data-label="Σύνδεσμος">
              <span className="grid gap-2 max-sm:justify-items-end">
                <LinkCell link={recipient.link} />
                {canManageLinks && recipient.link?.status === "active" && (
                  <LinkActions link={recipient.link} />
                )}
              </span>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

// Οι παραλήπτες της πρότασης και ο Υπογράφων. Στη Σύνταξη επεξεργάζονται· μετά την αποστολή φαίνεται ο Σύνδεσμος του καθενός
// (ενεργός, άνοιξε, ανακλήθηκε…) και όποιος διαχειρίζεται Συνδέσμους μπορεί να ανακαλέσει ή να εκδώσει νέο.
export function PeopleSection({ agreement }: { agreement: AgreementDetail }) {
  const { can } = agreement;
  return (
    <Panel label="Παραλήπτες">
      <NoticeScope>
        {can.edit ? (
          <RecipientsEditor agreement={agreement} />
        ) : (
          <RecipientsTable
            recipients={agreement.recipients}
            canManageLinks={can.manageLinks}
          />
        )}
        <MutedNote>{SIGNATORY_NOTE}</MutedNote>
      </NoticeScope>
    </Panel>
  );
}
