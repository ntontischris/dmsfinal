"use client";

import { useState } from "react";

import type {
  DeliverableCandidates,
  KindCandidate,
} from "@/modules/deliverables";

import { createDeliverableFromRequest } from "../actions-requests";
import { CREATE_DELIVERABLE_SUBMIT } from "../request-labels";
import { JForm } from "./j2-form";

interface DeliverableFromRequestProps {
  messageId: string;
  productionId: string;
  defaultTitle: string;
  candidates: DeliverableCandidates;
  onDone: () => void;
}

const DATE_TIME = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const kindLabel = (kind: KindCandidate): string =>
  kind.balance === null
    ? kind.label
    : `${kind.label} · υπόλοιπο ${kind.balance}`;

// Νέο Παραδοτέο από το Αίτημα στο ύφος του prototype (`.j2-form`, `.toolbar`): ίδια πεδία με τη φόρμα των Παραδοτέων,
// ίδιο server action· χωρίς υπόλοιπο ζητά χρέωση ή «χωρίς χρέωση» με λόγο.
export function DeliverableFromRequest({
  messageId,
  productionId,
  defaultTitle,
  candidates,
  onDone,
}: DeliverableFromRequestProps) {
  const [kindId, setKindId] = useState(candidates.kinds[0]?.id ?? "");
  const kind = candidates.kinds.find((item) => item.id === kindId);
  const needsCharge = (kind?.balance ?? 0) <= 0;
  return (
    <JForm
      action={createDeliverableFromRequest}
      submitLabel={CREATE_DELIVERABLE_SUBMIT}
      pendingLabel="Δημιουργία…"
      onSuccess={onDone}
      onCancel={onDone}
    >
      <input type="hidden" name="id" value={messageId} />
      <input type="hidden" name="productionId" value={productionId} />
      <label className="toolbar">
        <span>Είδος</span>
        <select
          className="input"
          name="kindId"
          value={kindId}
          onChange={(event) => setKindId(event.target.value)}
        >
          {candidates.kinds.map((item) => (
            <option key={item.id} value={item.id}>
              {kindLabel(item)}
            </option>
          ))}
        </select>
      </label>
      <input
        className="input"
        name="title"
        aria-label="Τίτλος"
        placeholder="Τίτλος"
        defaultValue={defaultTitle}
        required
        maxLength={200}
        autoComplete="off"
      />
      <label className="toolbar">
        <span>Υπεύθυνος</span>
        <select className="input" name="assigneeId" defaultValue="">
          <option value="">Χωρίς υπεύθυνο</option>
          {candidates.assignees.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
      <label className="toolbar">
        <span>Γύρισμα</span>
        <select className="input" name="filmingId" defaultValue="">
          <option value="">Χωρίς Γύρισμα</option>
          {candidates.filmings.map((filming) => (
            <option key={filming.id} value={filming.id}>
              {DATE_TIME.format(new Date(filming.startsAt))}
            </option>
          ))}
        </select>
      </label>
      {needsCharge && (
        <>
          <label className="toolbar">
            <span>Χρέωση (το είδος δεν έχει υπόλοιπο)</span>
            <select className="input" name="charge" defaultValue="pending">
              <option value="pending">Να αποφασιστεί χρέωση</option>
              <option value="free">Χωρίς χρέωση</option>
            </select>
          </label>
          <textarea
            className="input"
            name="chargeReason"
            aria-label="Λόγος, αν είναι χωρίς χρέωση"
            placeholder="Λόγος, αν είναι χωρίς χρέωση"
          />
        </>
      )}
    </JForm>
  );
}
