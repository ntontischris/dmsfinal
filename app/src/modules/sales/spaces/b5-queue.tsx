"use client";

import Link from "next/link";

import { initialsOf } from "@/spaces/shell/avatar";

import { assignOpportunity } from "../actions-queue";
import type { AssignableUser } from "../types";
import { RowForm, useDoneNotes } from "./b5-forms";
import { RequestRow, type B5RequestItem } from "./b5-request";

import "../../finance/spaces/money-lines.css";
import "./b5.css";

export type { B5RequestItem } from "./b5-request";

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

interface QueueLineProps {
  item: B5QueueItem;
  assignable: readonly AssignableUser[];
  onDone: () => void;
}

function AssignForm({ item, assignable, onDone }: QueueLineProps) {
  if (assignable.length === 0)
    return (
      <small className="muted">Δεν υπάρχει πωλητής να την αναλάβει.</small>
    );
  return (
    <RowForm
      action={assignOpportunity}
      submitLabel="Ανάθεση"
      isPrimary
      className="ml-quick b5-quick"
      onDone={onDone}
    >
      <input type="hidden" name="opportunityId" value={item.id} />
      <select className="select" name="userId" aria-label="Υπεύθυνος" defaultValue="">
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
  );
}

// Μία Ευκαιρία χωρίς Υπεύθυνο ως γραμμή: Πηγή στην ετικέτα, τίτλος, Πελάτης, και η Ανάθεση δεξιά.
function QueueLine(props: QueueLineProps) {
  const { item } = props;
  return (
    <li className="b5-item" data-urgent={item.isPossibleDuplicate ? "" : undefined}>
      <div className="ml-line">
        <span className="ml-thumb" aria-hidden="true">
          {initialsOf(item.clientName)}
        </span>
        <span className="ml-main">
          <span className="ml-tag">Πηγή: {item.source}</span>
          <strong>
            <Link href={item.href}>{item.title}</Link>
          </strong>
          <small>
            {item.clientName} · έφτασε {item.received}
            {item.isNewClient && " · Νέος Πελάτης"}
            {item.isPossibleDuplicate && " · Πιθανό διπλό"}
          </small>
        </span>
        <AssignForm {...props} />
      </div>
    </li>
  );
}

// Η ουρά «Χωρίς υπεύθυνο» (prototype `screens/b5-queue.tsx`) με την πραγματική ανάθεση, σε γραμμές.
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
          <p className="muted">Όλες οι Ευκαιρίες από τη φόρμα έχουν Υπεύθυνο.</p>
        </section>
      </>
    );
  return (
    <>
      {notes.view}
      <ul className="ml-list b5-list">
        {pending.map((item) => (
          <QueueLine
            key={item.id}
            item={item}
            assignable={assignable}
            onDone={() =>
              notes.add(
                item.id,
                `Έγινε: η «${item.title}» ανατέθηκε, ο νέος Υπεύθυνος ειδοποιείται, και έφυγε από την ουρά.`,
              )
            }
          />
        ))}
      </ul>
    </>
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
        <ul className="ml-list b5-list">
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
