"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Rows, type RowItem } from "@/components/ui/rows";

import { transferClient } from "../actions-clients";
import { decideAccessRequest } from "../actions-queue";
import { formatDate } from "../helpers";
import { NO_MANAGER_LABEL } from "../labels";
import type { AccessRequestRow, AssignableUser } from "../types";

import { ActionForm } from "./action-form";

interface AccessRequestsProps {
  requests: readonly AccessRequestRow[];
  assignable: readonly AssignableUser[];
}

type Mode = "reject" | "transfer" | null;

function RejectForm({ request }: { request: AccessRequestRow }) {
  return (
    <ActionForm
      action={decideAccessRequest}
      submitLabel="Επιβεβαίωση απόρριψης"
      pendingLabel="Απόρριψη…"
      variant="danger"
      size="sm"
    >
      <input type="hidden" name="requestId" value={request.id} />
      <input type="hidden" name="decision" value="reject" />
      <Field label="Σχόλιο απόρριψης (υποχρεωτικό)">
        <Input name="comment" required autoComplete="off" />
      </Field>
    </ActionForm>
  );
}

function TransferForm({ request }: { request: AccessRequestRow }) {
  const manager = request.clientManagerName ?? NO_MANAGER_LABEL;
  return (
    <ActionForm
      action={transferClient}
      submitLabel="Επιβεβαίωση μεταβίβασης"
      pendingLabel="Μεταβίβαση…"
      variant="danger"
      size="sm"
    >
      <input type="hidden" name="clientId" value={request.clientId} />
      <input type="hidden" name="userId" value={request.requesterId} />
      <input type="hidden" name="requestId" value={request.id} />
      <p className="m-0 text-sm text-muted-foreground">
        Ολόκληρος ο Πελάτης περνά στον/στην {request.requesterName}. Οι ανοιχτές
        Ευκαιρίες του/της {manager} ακολουθούν τον Πελάτη.
      </p>
    </ActionForm>
  );
}

// Έγκριση με ένα κλικ· απόρριψη και μεταβίβαση ζητούν δεύτερο βήμα, γιατί δεν αναιρούνται.
function Decision({
  request,
  canTransfer,
}: {
  request: AccessRequestRow;
  canTransfer: boolean;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const toggle = (next: Exclude<Mode, null>) =>
    setMode((current) => (current === next ? null : next));
  return (
    <div className="mt-2 grid gap-3">
      <div className="flex flex-wrap items-start gap-2">
        <ActionForm
          action={decideAccessRequest}
          submitLabel="Έγκριση"
          pendingLabel="Έγκριση…"
          size="sm"
        >
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="decision" value="approve" />
        </ActionForm>
        <Button
          size="sm"
          aria-expanded={mode === "reject"}
          onClick={() => toggle("reject")}
        >
          Απόρριψη
        </Button>
        {canTransfer && (
          <Button
            size="sm"
            aria-expanded={mode === "transfer"}
            onClick={() => toggle("transfer")}
          >
            Μεταβίβαση Πελάτη
          </Button>
        )}
      </div>
      {mode === "reject" && <RejectForm request={request} />}
      {mode === "transfer" && <TransferForm request={request} />}
    </div>
  );
}

const toRow = (request: AccessRequestRow, canTransfer: boolean): RowItem => ({
  id: request.id,
  title: request.clientName,
  href: `/app/clients/${request.clientId}`,
  meta: (
    <>
      <p className="m-0">
        {request.requesterName} ζητά πρόσβαση · Υπεύθυνος:{" "}
        {request.clientManagerName ?? NO_MANAGER_LABEL}
      </p>
      <p className="m-0 text-foreground">{request.topic}</p>
      {request.comment && <p className="m-0">{request.comment}</p>}
      <p className="m-0 text-xs">{formatDate(request.createdAt)}</p>
      <Decision request={request} canTransfer={canTransfer} />
    </>
  ),
});

// Αιτήματα πρόσβασης (B5): ένας Πελάτης έχει έναν πωλητή· εδώ αποφασίζεται αν άλλος ανοίγει Ευκαιρία σε αυτόν ή αν περνά ολόκληρος σε εκείνον.
export function AccessRequests({ requests, assignable }: AccessRequestsProps) {
  if (requests.length === 0)
    return (
      <Notice kind="empty" title="Δεν υπάρχουν εκκρεμή Αιτήματα πρόσβασης." />
    );
  // Στη μεταβίβαση ο αιτών γίνεται Υπεύθυνος, άρα πρέπει να είναι από όσους μπορούν να κρατούν Πελάτες.
  const holders = new Set(assignable.map((user) => user.userId));
  return (
    <Rows
      items={requests.map((request) =>
        toRow(request, holders.has(request.requesterId)),
      )}
    />
  );
}
