"use client";

import Link from "next/link";
import { useState } from "react";

import type { CreatedLink, Message, MessageRequest } from "@/data/messages";
import {
  MENTIONABLE,
  canHandleRequest,
  canOpenScreen,
  daysOpen,
  isStale,
  messageCapsOf,
  meOf,
  teamName,
} from "@/data/messages-access";
import type { RoleId } from "@/data/roles";
import { closeWith, withRequest } from "@/screens/j2-model";
import { Badge, screenHref } from "@/screens/shared";

interface BoxProps {
  role: RoleId;
  message: Message;
  onChange: (next: Message) => void;
}

function LinkView({ role, link }: { role: RoleId; link: CreatedLink }) {
  if (link.params.url) return <a href={link.params.url}>{link.label}</a>;
  if (!canOpenScreen(role, link.code)) return <>{link.label}</>;
  return (
    <Link href={screenHref(role, link.code, link.params)}>{link.label}</Link>
  );
}

function ClosingInfo({
  role,
  request,
}: {
  role: RoleId;
  request: MessageRequest;
}) {
  const c = request.closing;
  if (!c) return null;
  return (
    <>
      {c.link && (
        <p>
          Σύνδεσμος: <LinkView role={role} link={c.link} />
        </p>
      )}
      {c.comment && <p>Σχόλιο: {c.comment}</p>}
      {c.reply && <p>Απάντηση προς τον πελάτη: {c.reply}</p>}
      {c.isAutomatic && <p className="muted">έκλεισε μόνο του</p>}
    </>
  );
}

export function RequestBox({ role, message, onChange }: BoxProps) {
  const request = message.request;
  if (!request) return null;
  return (
    <div className="j2-req">
      <div className="j2-req-head">
        <strong>Αίτημα: {request.kind}</strong>
        <Badge tone={request.state === "ανοιχτό" ? "strong" : undefined}>
          {request.state}
        </Badge>
        {isStale(request) && <Badge tone="attention">χρειάζεται προσοχή</Badge>}
      </div>
      <p>Ανατέθηκε: {teamName(request.assigneeId)}</p>
      {request.state === "ανοιχτό" && (
        <p className="muted">ανοιχτό {daysOpen(request)} μέρες</p>
      )}
      {request.declaredBy === "ομάδα" && (
        <p className="muted">σημειώθηκε ως Αίτημα από την ομάδα</p>
      )}
      <ClosingInfo role={role} request={request} />
      {canHandleRequest(role, request) && (
        <RequestActions role={role} message={message} onChange={onChange} />
      )}
    </div>
  );
}

type Mode = null | "done" | "reject";

function RequestActions({ role, message, onChange }: BoxProps) {
  const [mode, setMode] = useState<Mode>(null);
  const request = message.request as MessageRequest;
  const by = meOf(role);
  const autoClose = (link: CreatedLink) =>
    onChange(
      closeWith(message, "ολοκληρώθηκε", { by, link, isAutomatic: true }),
    );
  if (request.kind === "αλλαγή μετά την έγκριση")
    return (
      <>
        <p className="note">
          Η απόφαση (δεκτό ως γύρος, χρεώνεται ή νέο Παραδοτέο) παίρνεται στη
          σελίδα του Παραδοτέου και κλείνει το Αίτημα.
        </p>
        {request.deliverableId && canOpenScreen(role, "H2") && (
          <Link
            className="button"
            href={screenHref(role, "H2", {
              id: request.deliverableId,
            })}
          >
            Άνοιγμα Παραδοτέου
          </Link>
        )}
        <Reassign role={role} message={message} onChange={onChange} />
      </>
    );
  return (
    <>
      <div className="btn-row">
        {request.kind === "νέο Παραδοτέο" && (
          <button
            data-primary
            type="button"
            onClick={() =>
              autoClose({
                label: "Νέο Παραδοτέο από το Αίτημα",
                code: "H1",
                params: {},
              })
            }
          >
            Δημιουργία Παραδοτέου από το Αίτημα
          </button>
        )}
        {request.kind === "Γύρισμα" && (
          <button
            data-primary
            type="button"
            onClick={() =>
              autoClose({
                label: "Γύρισμα από το Αίτημα",
                code: "E3",
                params: {},
              })
            }
          >
            Κλείσιμο Γυρίσματος από το Αίτημα
          </button>
        )}
        <button
          className="button"
          type="button"
          onClick={() => setMode("done")}
        >
          Ολοκληρώθηκε
        </button>
        <button
          className="button"
          data-danger
          type="button"
          onClick={() => setMode("reject")}
        >
          Απόρριψη
        </button>
      </div>
      {mode === "done" && (
        <DoneForm
          onCancel={() => setMode(null)}
          onSave={(link, comment) =>
            onChange(
              closeWith(message, "ολοκληρώθηκε", {
                by,
                comment: comment || undefined,
                link: link
                  ? { label: link, code: "ext", params: { url: link } }
                  : undefined,
              }),
            )
          }
        />
      )}
      {mode === "reject" && (
        <RejectForm
          onCancel={() => setMode(null)}
          onSave={(reply) =>
            onChange(closeWith(message, "απορρίφθηκε", { by, reply }))
          }
        />
      )}
      <Reassign role={role} message={message} onChange={onChange} />
    </>
  );
}

interface FormProps<T> {
  onSave: T;
  onCancel: () => void;
}

function DoneForm({
  onSave,
  onCancel,
}: FormProps<(link: string, comment: string) => void>) {
  const [link, setLink] = useState("");
  const [comment, setComment] = useState("");
  const isValid = link.trim() !== "" || comment.trim() !== "";
  return (
    <div className="j2-form">
      <input
        className="input"
        placeholder="Σύνδεσμος (link)"
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />
      <textarea
        className="input"
        placeholder="Σχόλιο"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <p className="muted">Χρειάζεται τουλάχιστον ένα: σύνδεσμος ή σχόλιο.</p>
      <div className="btn-row">
        <button
          data-primary
          type="button"
          disabled={!isValid}
          onClick={() => onSave(link.trim(), comment.trim())}
        >
          Ολοκλήρωση Αιτήματος
        </button>
        <button className="button" type="button" onClick={onCancel}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}

function RejectForm({ onSave, onCancel }: FormProps<(reply: string) => void>) {
  const [reply, setReply] = useState("");
  return (
    <div className="j2-form">
      <textarea
        className="input"
        placeholder="Απάντηση προς τον πελάτη (υποχρεωτική)"
        value={reply}
        onChange={(e) => setReply(e.target.value)}
      />
      <p className="muted">Η απάντηση πηγαίνει στον πελάτη.</p>
      <div className="btn-row">
        <button
          data-danger
          type="button"
          disabled={reply.trim() === ""}
          onClick={() => onSave(reply.trim())}
        >
          Απόρριψη Αιτήματος
        </button>
        <button className="button" type="button" onClick={onCancel}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}

function Reassign({ role, message, onChange }: BoxProps) {
  if (!messageCapsOf(role).canReassign || !message.request) return null;
  return (
    <label className="toolbar">
      <span>Αλλαγή υπευθύνου</span>
      <select
        className="input"
        value={message.request.assigneeId ?? ""}
        onChange={(e) =>
          onChange(withRequest(message, { assigneeId: e.target.value || null }))
        }
      >
        <option value="">Χωρίς υπεύθυνο</option>
        {MENTIONABLE.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
