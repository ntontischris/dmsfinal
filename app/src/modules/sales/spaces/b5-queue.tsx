"use client";

import { useState } from "react";

import { Entity, Person } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { transferClient } from "../actions-clients";
import { assignOpportunity, decideAccessRequest } from "../actions-queue";
import { NO_MANAGER_LABEL } from "../labels";
import type { AssignableUser } from "../types";
import { RowForm, useDoneNotes } from "./b5-forms";

import "./b5.css";

export interface B5QueueItem {
  id: string;
  href: string;
  title: string;
  clientName: string;
  source: string;
  received: string;
  isNewClient: boolean;
  isPossibleDuplicate: boolean;
}

// Η ουρά «Χωρίς υπεύθυνο» (prototype `screens/b5-queue.tsx`) με την πραγματική ανάθεση.
export function UnassignedQueue({
  items,
  assignable,
}: {
  items: readonly B5QueueItem[];
  assignable: readonly AssignableUser[];
}) {
  const notes = useDoneNotes();
  const pending = items.filter((item) => !notes.isDone(item.id));
  if (pending.length === 0)
    return (
      <>
        {notes.view}
        <section className="card notice" role="status">
          <h2>Η ουρά είναι άδεια</h2>
          <p className="muted">
            Όλες οι Ευκαιρίες από τη φόρμα έχουν Υπεύθυνο.
          </p>
        </section>
      </>
    );
  return (
    <>
      {notes.view}
      <ul className="list b5-list">
        {pending.map((item) => (
          <li key={item.id} className="card">
            <div className="card-title">
              <Entity
                name={item.title}
                href={item.href}
                sub={`${item.clientName} · έφτασε ${item.received}`}
              />
              <span className="btn-row">
                <Badge>Πηγή: {item.source}</Badge>
                {item.isNewClient && <Badge>Νέος Πελάτης</Badge>}
                {item.isPossibleDuplicate && (
                  <Badge tone="attention">Πιθανό διπλό</Badge>
                )}
              </span>
            </div>
            {assignable.length === 0 ? (
              <p className="muted">Δεν υπάρχει πωλητής να την αναλάβει.</p>
            ) : (
              <RowForm
                action={assignOpportunity}
                submitLabel="Ανάθεση"
                isPrimary
                className="toolbar"
                onDone={() =>
                  notes.add(
                    item.id,
                    `Έγινε: η «${item.title}» ανατέθηκε, ο νέος Υπεύθυνος ειδοποιείται, και έφυγε από την ουρά.`,
                  )
                }
              >
                <input type="hidden" name="opportunityId" value={item.id} />
                <select
                  className="select"
                  name="userId"
                  aria-label="Υπεύθυνος"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Διάλεξε Υπεύθυνο
                  </option>
                  {assignable.map((user) => (
                    <option key={user.userId} value={user.userId}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </RowForm>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

export interface B5RequestItem {
  id: string;
  clientId: string;
  requesterId: string;
  requester: string;
  client: string;
  currentOwner: string | null;
  topic: string;
  comment: string;
  date: string;
}

type Mode = "reject" | "transfer";

function RequestRow({
  item,
  canTransfer,
  onResolve,
}: {
  item: B5RequestItem;
  canTransfer: boolean;
  onResolve: (message: string) => void;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const owner = item.currentOwner ?? NO_MANAGER_LABEL;
  return (
    <li className="card">
      <div className="card-title">
        <Entity name={item.client} sub={`Αίτημα στις ${item.date}`} />
        <Badge>{item.date}</Badge>
      </div>
      <dl className="dl">
        <dt>Πωλητής</dt>
        <dd>
          <Person name={item.requester} />
        </dd>
        <dt>Σημερινός Υπεύθυνος</dt>
        <dd>
          {item.currentOwner ? (
            <Person name={item.currentOwner} />
          ) : (
            NO_MANAGER_LABEL
          )}
        </dd>
        <dt>Τι αφορά</dt>
        <dd>{item.topic}</dd>
        <dt>Σχόλιο</dt>
        <dd>{item.comment || "—"}</dd>
      </dl>
      <div className="btn-row">
        <RowForm
          action={decideAccessRequest}
          submitLabel="Έγκριση"
          isPrimary
          onDone={() =>
            onResolve(
              `Άνοιξε Ευκαιρία με Υπεύθυνο ${item.requester}· ο/η ${owner} ενημερώθηκε.`,
            )
          }
        >
          <input type="hidden" name="requestId" value={item.id} />
          <input type="hidden" name="decision" value="approve" />
        </RowForm>
        <button
          type="button"
          className="button"
          aria-expanded={mode === "reject"}
          onClick={() => setMode("reject")}
        >
          Απόρριψη
        </button>
        {canTransfer && (
          <button
            type="button"
            className="button"
            aria-expanded={mode === "transfer"}
            onClick={() => setMode("transfer")}
          >
            Μεταβίβαση Πελάτη
          </button>
        )}
      </div>
      {mode === "reject" && (
        <RowForm
          action={decideAccessRequest}
          submitLabel="Επιβεβαίωση απόρριψης"
          isDanger
          className="stack"
          onDone={() =>
            onResolve(
              `Απορρίφθηκε με σχόλιο· ο/η ${item.requester} ενημερώθηκε.`,
            )
          }
        >
          <input type="hidden" name="requestId" value={item.id} />
          <input type="hidden" name="decision" value="reject" />
          <textarea
            className="input"
            name="comment"
            rows={2}
            placeholder="Σχόλιο απόρριψης (υποχρεωτικό)"
            aria-label="Σχόλιο απόρριψης"
          />
        </RowForm>
      )}
      {mode === "transfer" && (
        <RowForm
          action={transferClient}
          submitLabel="Επιβεβαίωση μεταβίβασης"
          isDanger
          className="stack"
          onDone={() =>
            onResolve(
              `Ο Πελάτης «${item.client}» πέρασε στον/στην ${item.requester}. Οι ανοιχτές Ευκαιρίες του/της ${owner} ακολουθούν τον Πελάτη.`,
            )
          }
        >
          <input type="hidden" name="clientId" value={item.clientId} />
          <input type="hidden" name="userId" value={item.requesterId} />
          <input type="hidden" name="requestId" value={item.id} />
          <p className="note">
            Ολόκληρος ο Πελάτης περνά στον/στην {item.requester}. Οι ανοιχτές
            Ευκαιρίες του/της {owner} ακολουθούν τον Πελάτη.
          </p>
        </RowForm>
      )}
    </li>
  );
}

// Τα Αιτήματα πρόσβασης (prototype `screens/b5-access-requests.tsx`): Έγκριση, Απόρριψη με σχόλιο, Μεταβίβαση Πελάτη.
export function AccessRequests({
  items,
  canTransfer,
}: {
  items: readonly B5RequestItem[];
  canTransfer: boolean;
}) {
  const notes = useDoneNotes();
  const pending = items.filter((item) => !notes.isDone(item.id));
  return (
    <>
      {pending.length === 0 ? (
        <p className="muted">Δεν υπάρχουν εκκρεμή Αιτήματα πρόσβασης.</p>
      ) : (
        <ul className="list">
          {pending.map((item) => (
            <RequestRow
              key={item.id}
              item={item}
              canTransfer={canTransfer}
              onResolve={(message) => notes.add(item.id, message)}
            />
          ))}
        </ul>
      )}
      {notes.view}
    </>
  );
}
