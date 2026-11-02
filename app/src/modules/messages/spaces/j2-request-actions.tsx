"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import type { DeliverableCandidates } from "@/modules/deliverables";

import {
  assignRequest,
  completeRequest,
  rejectRequest,
} from "../actions-requests";
import type { J2Request } from "./j2-adapter";
import { DeliverableFromRequest } from "./j2-deliverable-form";
import { JForm } from "./j2-form";

// Ό,τι χρειάζεται η φόρμα νέου Παραδοτέου (υποψήφια της Παραγωγής) ή ένα κείμενο γιατί δεν υπάρχει.
export type DeliverableSource =
  | { productionId: string; defaultTitle: string; candidates: DeliverableCandidates }
  | { note: string };

type Mode = null | "deliverable" | "done" | "reject";

interface RequestActionsProps {
  messageId: string;
  clientId: string;
  request: J2Request;
  assignable: readonly { id: string; name: string }[];
  deliverable: DeliverableSource;
}

// Οι ενέργειες ενός ανοιχτού Αιτήματος του prototype (`screens/j2-request.tsx`), δεμένες στα πραγματικά server actions.
export function RequestActions({
  messageId,
  clientId,
  request,
  assignable,
  deliverable,
}: RequestActionsProps) {
  const [mode, setMode] = useState<Mode>(null);
  const close = useCallback(() => setMode(null), []);
  const toggle = (next: Mode) => setMode(mode === next ? null : next);
  return (
    <>
      {request.canHandle && (
        <div className="btn-row">
          {request.kind === "deliverable" && (
            <button
              className="button"
              data-primary
              type="button"
              onClick={() => toggle("deliverable")}
            >
              Δημιουργία Παραδοτέου από το Αίτημα
            </button>
          )}
          {request.kind === "filming" && (
            <Link
              className="button"
              data-primary
              href={`/app/filming/new?fromRequest=${messageId}&client=${clientId}`}
            >
              Κλείσιμο Γυρίσματος από το Αίτημα
            </Link>
          )}
          <button
            className="button"
            type="button"
            onClick={() => toggle("done")}
          >
            Ολοκληρώθηκε
          </button>
          <button
            className="button"
            data-danger
            type="button"
            onClick={() => toggle("reject")}
          >
            Απόρριψη
          </button>
        </div>
      )}
      {mode === "deliverable" &&
        ("note" in deliverable ? (
          <p className="muted">{deliverable.note}</p>
        ) : (
          <DeliverableFromRequest
            messageId={messageId}
            productionId={deliverable.productionId}
            defaultTitle={deliverable.defaultTitle}
            candidates={deliverable.candidates}
            onDone={close}
          />
        ))}
      {mode === "done" && (
        <JForm
          action={completeRequest}
          submitLabel="Ολοκλήρωση Αιτήματος"
          onSuccess={close}
          onCancel={close}
        >
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
          <p className="muted">
            Χρειάζεται τουλάχιστον ένα: σύνδεσμος ή σχόλιο.
          </p>
        </JForm>
      )}
      {mode === "reject" && (
        <JForm
          action={rejectRequest}
          submitLabel="Απόρριψη Αιτήματος"
          isDanger
          onSuccess={close}
          onCancel={close}
        >
          <input type="hidden" name="id" value={messageId} />
          <textarea
            className="input"
            name="reply"
            placeholder="Απάντηση προς τον πελάτη (υποχρεωτική)"
            aria-label="Απάντηση προς τον πελάτη (υποχρεωτική)"
            maxLength={2000}
            required
          />
          <p className="muted">Η απάντηση πηγαίνει στον πελάτη.</p>
        </JForm>
      )}
      {request.canReassign && (
        <JForm action={assignRequest} className="toolbar">
          <input type="hidden" name="id" value={messageId} />
          <label className="toolbar">
            <span>Αλλαγή υπευθύνου</span>
            <select
              className="input"
              name="userId"
              defaultValue={request.assigneeId ?? ""}
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
      )}
    </>
  );
}
