"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { Avatar } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { setRecipients } from "../actions-draft";
import { reissueLink, revokeLink } from "../actions-flow";
import { formatDate } from "../helpers";
import { LINK_STATUS_LABELS } from "../labels";
import type { AgreementDetail, LinkInfo, Recipient } from "../types";
import { D2Form, D2Scope, Field, IdField } from "./d2-ui";
import { ItemRows } from "./lane-rows";

// «Υπογράφων και παραλήπτες» (prototype `screens/d2-people.tsx`). Στη Σύνταξη η λίστα αλλάζει και αποθηκεύεται όλη μαζί
// (`setRecipients`, ίδιο JSON με τη σημερινή σελίδα)· μετά την αποστολή φαίνεται ο Σύνδεσμος του καθενός.

const MAX_RECIPIENTS = 10;
const NOTE = "Υπογράφει μόνο ο Υπογράφων· οι άλλοι βλέπουν και ζητούν αλλαγές.";

interface Row {
  key: number;
  name: string;
  email: string;
  isSignatory: boolean;
}

const serialize = (rows: readonly Row[]): string =>
  JSON.stringify(
    rows.map(({ name, email, isSignatory }) => ({ name, email, isSignatory })),
  );

function AddRecipient({
  onAdd,
  isFull,
}: {
  onAdd: (name: string, email: string) => void;
  isFull: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const add = () => {
    if (!name.trim() || !email.includes("@")) return;
    onAdd(name.trim(), email.trim());
    setName("");
    setEmail("");
  };
  return (
    <div className="toolbar">
      <input
        className="input grow"
        aria-label="Όνομα παραλήπτη"
        placeholder="Όνομα"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="input grow"
        type="email"
        aria-label="Email παραλήπτη"
        placeholder="email@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="button" className="button" disabled={isFull} onClick={add}>
        Προσθήκη παραλήπτη
      </button>
    </div>
  );
}

function RecipientsEditor({ agreement }: { agreement: AgreementDetail }) {
  const [rows, setRows] = useState<Row[]>(() =>
    agreement.recipients.map((r, key) => ({
      key,
      name: r.name,
      email: r.email,
      isSignatory: r.isSignatory,
    })),
  );
  const [nextKey, setNextKey] = useState(agreement.recipients.length);
  const signatory = rows.find((row) => row.isSignatory);
  const choose = (key: number) =>
    setRows((current) =>
      current.map((row) => ({ ...row, isSignatory: row.key === key })),
    );
  // Επεξεργασία στη θέση της, όπως στη σημερινή σελίδα (όχι αφαίρεση και ξανά προσθήκη).
  const change = (key: number, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  const add = (name: string, email: string) => {
    setRows((current) => [
      ...current,
      { key: nextKey, name, email, isSignatory: current.length === 0 },
    ]);
    setNextKey((current) => current + 1);
  };
  return (
    <D2Form action={setRecipients} submitLabel="Αποθήκευση παραληπτών">
      <IdField id={agreement.id} />
      <input type="hidden" name="recipients" value={serialize(rows)} />
      <dl className="dl">
        <Field
          id="d2-signatory"
          label="Υπογράφων"
          isEditing
          value={null}
          input={
            <select
              id="d2-signatory"
              className="select"
              value={signatory?.key ?? ""}
              onChange={(e) => choose(Number(e.target.value))}
            >
              {!signatory && <option value="">—</option>}
              {rows.map((row) => (
                <option key={row.key} value={row.key}>
                  {row.name} · {row.email}
                </option>
              ))}
            </select>
          }
        />
      </dl>
      <ItemRows
        items={rows.map((row) => ({
          id: String(row.key),
          lead: <Avatar name={row.name || "—"} size={34} />,
          title: (
            <input
              className="input"
              aria-label="Όνομα παραλήπτη"
              autoComplete="off"
              value={row.name}
              onChange={(e) => change(row.key, { name: e.target.value })}
            />
          ),
          sub: (
            <input
              className="input"
              type="email"
              aria-label="Email παραλήπτη"
              autoComplete="off"
              value={row.email}
              onChange={(e) => change(row.key, { email: e.target.value })}
            />
          ),
          aside: (
            <>
              <Badge tone={row.isSignatory ? "strong" : undefined}>
                {row.isSignatory ? "Υπογράφων" : "Παραλήπτης"}
              </Badge>
              <span className="muted">δεν στάλθηκε ακόμα</span>
              {!row.isSignatory && (
                <button
                  type="button"
                  className="button"
                  onClick={() =>
                    setRows((current) =>
                      current.filter((r) => r.key !== row.key),
                    )
                  }
                >
                  Αφαίρεση
                </button>
              )}
            </>
          ),
        }))}
      />
      <AddRecipient onAdd={add} isFull={rows.length >= MAX_RECIPIENTS} />
    </D2Form>
  );
}

function LinkBadge({ link }: { link: LinkInfo | null }) {
  if (link === null) return <span className="muted">δεν στάλθηκε ακόμα</span>;
  return (
    <>
      <Badge tone={link.status === "active" ? "strong" : "attention"}>
        Σύνδεσμος: {LINK_STATUS_LABELS[link.status]}
      </Badge>
      {link.isOpened && (
        <span className="part-sub">
          άνοιξε{link.firstOpenedAt && ` ${formatDate(link.firstOpenedAt)}`}
          {link.openCount > 1 && ` · ${link.openCount} φορές`}
        </span>
      )}
    </>
  );
}

function LinkActions({ link }: { link: LinkInfo }) {
  const field = <input type="hidden" name="linkId" value={link.id} />;
  return (
    <>
      <D2Form action={revokeLink} submitLabel="Ανάκληση" className="btn-row">
        {field}
      </D2Form>
      <D2Form
        action={reissueLink}
        submitLabel="Νέος σύνδεσμος"
        className="btn-row"
      >
        {field}
      </D2Form>
    </>
  );
}

function RecipientsList({
  recipients,
  canManageLinks,
}: {
  recipients: readonly Recipient[];
  canManageLinks: boolean;
}) {
  const signatory = recipients.find((r) => r.isSignatory);
  return (
    <>
      <dl className="dl">
        <dt>Υπογράφων</dt>
        <dd>{signatory ? `${signatory.name} · ${signatory.email}` : "—"}</dd>
      </dl>
      <ItemRows
        items={recipients.map((recipient) => ({
          id: recipient.id,
          lead: <Avatar name={recipient.name} size={34} />,
          title: recipient.name,
          sub: recipient.email,
          aside: (
            <>
              <Badge tone={recipient.isSignatory ? "strong" : undefined}>
                {recipient.isSignatory ? "Υπογράφων" : "Παραλήπτης"}
              </Badge>
              <LinkBadge link={recipient.link} />
              {canManageLinks && recipient.link?.status === "active" && (
                <LinkActions link={recipient.link} />
              )}
            </>
          ),
        }))}
      />
    </>
  );
}

export function PeopleSection({ agreement }: { agreement: AgreementDetail }) {
  const { can } = agreement;
  return (
    <Panel label="Υπογράφων και παραλήπτες">
      <D2Scope>
        {can.edit ? (
          <RecipientsEditor agreement={agreement} />
        ) : (
          <RecipientsList
            recipients={agreement.recipients}
            canManageLinks={can.manageLinks}
          />
        )}
      </D2Scope>
      <p className="note">{NOTE}</p>
    </Panel>
  );
}
