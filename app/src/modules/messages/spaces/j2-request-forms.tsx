"use client";

import { useState } from "react";

import {
  assignRequest,
  completeRequest,
  rejectRequest,
} from "../actions-requests";
import { withSignal } from "./guide-signal";
import { JForm } from "./j2-form";

// Ο οδηγός «Απαντώ σε Πελάτες» μαθαίνει τι έγινε μόλις αποθηκευτεί: μετά την ανανέωση το κλεισμένο Αίτημα δεν έχει
// πια κουμπιά και η φόρμα φεύγει από την οθόνη πριν προλάβει να το πει.
const completeAndTell = withSignal(completeRequest, "worked");
const rejectAndTell = withSignal(rejectRequest, "rejected");

interface CloseFormProps {
  messageId: string;
  submitLabel: string;
  onDone: () => void;
  onCancel?: () => void;
}

// «Ολοκλήρωση Αιτήματος» με σύνδεσμο ή σχόλιο.
export function CompleteForm({ messageId, submitLabel, onDone, onCancel }: CloseFormProps) {
  return (
    <JForm action={completeAndTell} submitLabel={submitLabel} onSuccess={onDone} onCancel={onCancel}>
      <input type="hidden" name="id" value={messageId} />
      <input
        className="input"
        name="link"
        type="url"
        placeholder="Σύνδεσμος (link)"
        aria-label="Σύνδεσμος (link)"
        maxLength={2000}
        autoComplete="off"
      />
      <textarea
        className="input"
        name="comment"
        placeholder="Σχόλιο"
        aria-label="Σχόλιο"
        maxLength={2000}
      />
      <p className="muted">Χρειάζεται τουλάχιστον ένα: σύνδεσμος ή σχόλιο.</p>
    </JForm>
  );
}

// «Απόρριψη» με υποχρεωτική απάντηση: το κουμπί μένει κλειστό μέχρι να γραφτεί κάτι. Η απάντηση πηγαίνει στον Πελάτη.
export function RejectForm({ messageId, submitLabel, onDone, onCancel }: CloseFormProps) {
  const [reply, setReply] = useState("");
  return (
    <JForm
      action={rejectAndTell}
      submitLabel={submitLabel}
      isDanger
      isDisabled={reply.trim() === ""}
      onSuccess={onDone}
      onCancel={onCancel}
    >
      <input type="hidden" name="id" value={messageId} />
      <textarea
        className="input"
        name="reply"
        placeholder="Απάντηση προς τον πελάτη (υποχρεωτική)"
        aria-label="Απάντηση προς τον πελάτη (υποχρεωτική)"
        maxLength={2000}
        required
        value={reply}
        onChange={(event) => setReply(event.target.value)}
      />
      <p className="muted">Η απάντηση πηγαίνει στον πελάτη και μετρά ως απάντηση.</p>
    </JForm>
  );
}

interface ReassignProps {
  messageId: string;
  assigneeId: string | null;
  assignable: readonly { id: string; name: string }[];
}

// «Αλλαγή υπευθύνου»: αποθηκεύεται μόλις αλλάξει η επιλογή.
export function Reassign({ messageId, assigneeId, assignable }: ReassignProps) {
  return (
    <JForm action={assignRequest} className="toolbar">
      <input type="hidden" name="id" value={messageId} />
      <label className="toolbar">
        <span>Αλλαγή υπευθύνου</span>
        <select
          className="input"
          name="userId"
          defaultValue={assigneeId ?? ""}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">Χωρίς υπεύθυνο</option>
          {assignable.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
    </JForm>
  );
}
