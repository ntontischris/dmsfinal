"use client";

import { useState } from "react";

import type { Recipient } from "@/data/agreements";
import type { LinkState } from "@/data/opportunities";
import { recipientOf, type Contact } from "@/screens/d2-model";
import { Confirmation, Field, type SectionProps } from "@/screens/d2-ui";
import { Badge, fmtDate } from "@/screens/shared";

interface PeopleProps extends SectionProps {
  contacts: readonly Contact[];
}

const LINK_TONE: Readonly<Record<LinkState, "strong" | "attention">> = {
  ενεργός: "strong",
  ακυρώθηκε: "attention",
  έληξε: "attention",
  ανακλήθηκε: "attention",
};

function LinkBadge({
  recipient,
  isUnsent,
}: {
  recipient: Recipient;
  isUnsent: boolean;
}) {
  if (isUnsent && recipient.link === "ενεργός")
    return <span className="muted">δεν στάλθηκε ακόμα</span>;
  return (
    <>
      <Badge tone={LINK_TONE[recipient.link]}>
        Σύνδεσμος: {recipient.link}
      </Badge>
      {isUnsent && <span className="muted"> νέος με την αποστολή</span>}
    </>
  );
}

function AddRecipient({ onAdd }: { onAdd: (contact: Contact) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const add = () => {
    if (!name.trim() || !email.includes("@")) return;
    onAdd({ name: name.trim(), email: email.trim() });
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
      <button type="button" className="button" onClick={add}>
        Προσθήκη παραλήπτη
      </button>
    </div>
  );
}

function SignatoryField({ draft, update, isEditing, contacts }: PeopleProps) {
  const signatory = draft.recipients.find((r) => r.isSignatory);
  const choose = (email: string) => {
    const contact = contacts.find((c) => c.email === email);
    if (!contact) return;
    update((d) => {
      const others = d.recipients.map((r) => ({
        ...r,
        isSignatory: r.email === email,
      }));
      const hasIt = others.some((r) => r.email === email);
      return {
        ...d,
        recipients: hasIt ? others : [recipientOf(contact, true), ...others],
      };
    });
  };
  return (
    <Field
      id="d2-signatory"
      label="Υπογράφων"
      isEditing={isEditing}
      value={signatory ? `${signatory.name} · ${signatory.email}` : "—"}
      input={
        <select
          id="d2-signatory"
          className="select"
          value={signatory?.email ?? ""}
          onChange={(e) => choose(e.target.value)}
        >
          {contacts.map((c) => (
            <option key={c.email} value={c.email}>
              {c.name} · {c.email}
            </option>
          ))}
        </select>
      }
    />
  );
}

export function PeopleSection(props: PeopleProps) {
  const { draft, update, isEditing, caps } = props;
  const [notice, setNotice] = useState<string | null>(null);
  const isUnsent =
    draft.path === "Σύνταξη" || draft.path === "Αναμένει Έγκριση";
  const canRevoke = caps.canCompose && draft.path === "Εστάλη";
  const revoke = (email: string, name: string) => {
    update((d) => ({
      ...d,
      recipients: d.recipients.map((r) =>
        r.email === email ? { ...r, link: "ανακλήθηκε" } : r,
      ),
    }));
    setNotice(
      `Ο Σύνδεσμος του/της ${name} ανακλήθηκε. Οι υπόλοιποι μένουν ενεργοί.`,
    );
  };
  const remove = (email: string) =>
    update((d) => ({
      ...d,
      recipients: d.recipients.filter((r) => r.email !== email),
    }));
  const add = (contact: Contact) =>
    update((d) => ({
      ...d,
      recipients: [...d.recipients, recipientOf(contact, false)],
    }));
  return (
    <section className="card">
      <h2>Υπογράφων και παραλήπτες</h2>
      <dl className="dl">
        <SignatoryField {...props} />
        {draft.state === "πρόταση" && (
          <Field
            id="d2-valid"
            label="Ισχύς πρότασης"
            isEditing={isEditing}
            value={draft.validUntil ? `έως ${fmtDate(draft.validUntil)}` : "—"}
            input={
              <input
                id="d2-valid"
                className="input"
                type="date"
                value={draft.validUntil ?? ""}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    validUntil: e.target.value || d.validUntil,
                  }))
                }
              />
            }
          />
        )}
      </dl>
      <ul className="list">
        {draft.recipients.map((recipient) => (
          <li key={recipient.email} className="row">
            <span>
              {recipient.name} <span className="muted">{recipient.email}</span>{" "}
              <Badge tone={recipient.isSignatory ? "strong" : undefined}>
                {recipient.isSignatory ? "Υπογράφων" : "Παραλήπτης"}
              </Badge>
            </span>
            <span className="btn-row">
              {recipient.opened && <span className="muted">άνοιξε</span>}
              <LinkBadge recipient={recipient} isUnsent={isUnsent} />
              {canRevoke && recipient.link === "ενεργός" && (
                <button
                  type="button"
                  className="button"
                  onClick={() => revoke(recipient.email, recipient.name)}
                >
                  Ανάκληση
                </button>
              )}
              {isEditing && !recipient.isSignatory && (
                <button
                  type="button"
                  className="button"
                  onClick={() => remove(recipient.email)}
                >
                  Αφαίρεση
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {isEditing && <AddRecipient onAdd={add} />}
      <Confirmation text={notice} />
      <p className="note">
        Υπογράφει μόνο ο Υπογράφων· οι άλλοι βλέπουν και ζητούν αλλαγές.
      </p>
    </section>
  );
}
