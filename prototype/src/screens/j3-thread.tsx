"use client";

import { useState } from "react";

import { MESSAGE_RULES, type Message, type RequestKind } from "@/data/messages";

import { MessageBubble } from "./j-message";
import {
  J3Composer,
  type ComposerDraft,
  type ProductionOption,
} from "./j3-composer";
import { RequestBox, type ClosingLinkView } from "./j3-request-box";

import "./j3.css";

export interface ThreadItem {
  message: Message;
  isUnread: boolean;
  isOwn: boolean;
  canEdit: boolean;
  canDelete: boolean;
  link?: ClosingLinkView;
}

interface J3ThreadProps {
  initial: readonly ThreadItem[];
  productions: readonly ProductionOption[];
  nowIso: string;
  isReadOnly: boolean;
  bookingHref: string;
  changeHref: string;
}

const CLIENT_NAME = "Μαρία Παπαδάκη";

const toMessage = (
  draft: ComposerDraft,
  nowIso: string,
  serial: number,
): Message => ({
  id: `j3-new-${serial}`,
  clientId: "new",
  at: nowIso,
  author: { kind: "client", name: CLIENT_NAME },
  text: draft.text,
  productionId: draft.productionId,
  attachments: draft.attachments,
  request: draft.kind
    ? {
        kind: draft.kind as RequestKind,
        state: "ανοιχτό",
        assigneeId: null,
        declaredBy: "πελάτης",
        declaredAt: nowIso,
      }
    : undefined,
});

export function J3Thread({
  initial,
  productions,
  nowIso,
  isReadOnly,
  bookingHref,
  changeHref,
}: J3ThreadProps) {
  const [items, setItems] = useState<readonly ThreadItem[]>(initial);
  const [hasSentRequest, setHasSentRequest] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const patch = (id: string, change: (it: ThreadItem) => ThreadItem) =>
    setItems((current) =>
      current.map((it) => (it.message.id === id ? change(it) : it)),
    );

  const send = (draft: ComposerDraft) => {
    const message = toMessage(draft, nowIso, items.length);
    const item: ThreadItem = {
      message,
      isUnread: false,
      isOwn: true,
      canEdit: true,
      canDelete: !message.request,
    };
    setItems((current) => [...current, item]);
    setHasSentRequest(!!message.request);
  };

  const remove = (id: string) =>
    patch(id, (it) => ({
      ...it,
      message: { ...it.message, deletedAt: nowIso },
      canEdit: false,
      canDelete: false,
    }));

  const edit = (id: string, text: string) => {
    patch(id, (it) => ({
      ...it,
      message: { ...it.message, text, editedAt: nowIso },
    }));
    setEditingId(null);
  };

  return (
    <div className="j3-thread">
      {items.length === 0 && (
        <section className="card notice" data-kind="empty">
          <h2>Καμία συζήτηση ακόμα</h2>
          <p className="muted">Γράψε το πρώτο σου Μήνυμα στην ομάδα</p>
        </section>
      )}
      {items.map((it) => (
        <MessageBubble
          key={it.message.id}
          message={it.message}
          viewer="client"
          isUnread={it.isUnread}
          isOwn={it.isOwn}
          actions={
            it.isOwn && !it.message.deletedAt ? (
              <>
                {it.canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditingId(it.message.id)}
                  >
                    Διόρθωση
                  </button>
                )}
                {it.canDelete && (
                  <button type="button" onClick={() => remove(it.message.id)}>
                    Διαγραφή
                  </button>
                )}
                {it.message.request && (
                  <span className="muted">
                    Το Μήνυμα έγινε Αίτημα και δεν διαγράφεται.
                  </span>
                )}
              </>
            ) : undefined
          }
        >
          {editingId === it.message.id && (
            <EditBox
              initial={it.message.text}
              onSave={(text) => edit(it.message.id, text)}
              onCancel={() => setEditingId(null)}
            />
          )}
          {it.message.request && !it.message.deletedAt && (
            <RequestBox request={it.message.request} link={it.link} />
          )}
        </MessageBubble>
      ))}
      {hasSentRequest && (
        <p className="note" role="status">
          Το Αίτημα στάλθηκε. Θα δεις εδώ πότε ολοκληρωθεί ή αν απορριφθεί.
        </p>
      )}
      {isReadOnly ? (
        <p className="note">
          Έχεις μόνο «Βλέπει Συνομιλία»: διαβάζεις, αλλά δεν γράφεις ούτε
          δηλώνεις Αιτήματα. Ζήτα το Δικαίωμα από τον διαχειριστή του
          λογαριασμού σας.
        </p>
      ) : (
        <J3Composer
          productions={productions}
          onSend={send}
          bookingHref={bookingHref}
          changeHref={changeHref}
        />
      )}
      <p className="muted">
        Διορθώνεις ένα Μήνυμα για {MESSAGE_RULES.editMinutes} λεπτά.
      </p>
    </div>
  );
}

interface EditBoxProps {
  initial: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

function EditBox({ initial, onSave, onCancel }: EditBoxProps) {
  const [text, setText] = useState(initial);
  return (
    <div className="j3-field">
      <textarea
        className="input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Διόρθωση Μηνύματος"
      />
      <div className="btn-row">
        <button
          type="button"
          data-primary
          disabled={!text.trim()}
          onClick={() => onSave(text.trim())}
        >
          Αποθήκευση
        </button>
        <button type="button" onClick={onCancel}>
          Ακύρωση
        </button>
      </div>
    </div>
  );
}
