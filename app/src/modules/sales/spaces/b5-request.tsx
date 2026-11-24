"use client";

import { useState } from "react";

import { initialsOf } from "@/spaces/shell/avatar";

import { transferClient } from "../actions-clients";
import { decideAccessRequest } from "../actions-queue";
import { NO_MANAGER_LABEL } from "../labels";
import { RowForm } from "./b5-forms";

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

interface RequestProps {
  item: B5RequestItem;
  owner: string;
  onResolve: (message: string) => void;
}

// Έγκριση με ένα πάτημα· Απόρριψη και Μεταβίβαση ανοίγουν τη φόρμα τους κάτω από τη γραμμή.
function RequestButtons({
  item,
  owner,
  onResolve,
  mode,
  onMode,
  canTransfer,
}: RequestProps & {
  mode: Mode | null;
  onMode: (mode: Mode) => void;
  canTransfer: boolean;
}) {
  return (
    <div className="ml-quick b5-quick">
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
        aria-expanded={mode === "reject"}
        onClick={() => onMode("reject")}
      >
        Απόρριψη
      </button>
      {canTransfer && (
        <button
          type="button"
          aria-expanded={mode === "transfer"}
          onClick={() => onMode("transfer")}
        >
          Μεταβίβαση Πελάτη
        </button>
      )}
    </div>
  );
}

function RejectForm({ item, onResolve }: RequestProps) {
  return (
    <RowForm
      action={decideAccessRequest}
      submitLabel="Επιβεβαίωση απόρριψης"
      isDanger
      className="stack b5-more"
      onDone={() =>
        onResolve(`Απορρίφθηκε με σχόλιο· ο/η ${item.requester} ενημερώθηκε.`)
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
  );
}

function TransferForm({ item, owner, onResolve }: RequestProps) {
  return (
    <RowForm
      action={transferClient}
      submitLabel="Επιβεβαίωση μεταβίβασης"
      isDanger
      className="stack b5-more"
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
  );
}

// Ένα Αίτημα πρόσβασης ως γραμμή: ο Πελάτης, τι αφορά, ποιος ζητά και ποιος τον έχει, και οι τρεις αποφάσεις.
export function RequestRow({
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
  const props = { item, owner, onResolve };
  return (
    <li className="b5-item">
      <div className="ml-line">
        <span className="ml-thumb" aria-hidden="true">
          {initialsOf(item.client)}
        </span>
        <span className="ml-main">
          <span className="ml-tag">Αίτημα στις {item.date}</span>
          <strong>{item.client}</strong>
          <small>
            Πωλητής: {item.requester} · Σημερινός Υπεύθυνος: {owner}
          </small>
          <small>
            Τι αφορά: {item.topic} · Σχόλιο: {item.comment || "—"}
          </small>
        </span>
        <RequestButtons
          {...props}
          mode={mode}
          onMode={setMode}
          canTransfer={canTransfer}
        />
      </div>
      {mode === "reject" && <RejectForm {...props} />}
      {mode === "transfer" && <TransferForm {...props} />}
    </li>
  );
}
