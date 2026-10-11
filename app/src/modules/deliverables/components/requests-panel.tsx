"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { decideRequest } from "../actions-requests";
import { formatDateTime } from "../helpers";
import type { DeliverableRequest, RequestDecision } from "../types";

import { ActionForm } from "./action-form";
import { TextArea, MutedNote } from "./form-fields";

const DECISION_LABELS: Readonly<Record<RequestDecision, string>> = {
  round: "Δεκτό ως γύρος",
  charged: "Χρεώνεται",
  new_deliverable: "Νέο Παραδοτέο",
};

interface RequestsPanelProps {
  requests: readonly DeliverableRequest[];
  canSeeAmounts: boolean;
}

// Αιτήματα μετά την έγκριση: ο πελάτης ζήτησε αλλαγή· η ομάδα αποφασίζει (η σημείωση είναι προαιρετική).
export function RequestsPanel({ requests, canSeeAmounts }: RequestsPanelProps) {
  if (requests.length === 0) return null;
  return (
    <Panel label="Αιτήματα μετά την έγκριση">
      <ul className="m-0 grid list-none gap-4 p-0 text-sm">
        {requests.map((request) => (
          <RequestItem key={request.id} request={request} canSeeAmounts={canSeeAmounts} />
        ))}
      </ul>
    </Panel>
  );
}

function RequestItem({ request, canSeeAmounts }: { request: DeliverableRequest; canSeeAmounts: boolean }) {
  return (
    <li className="grid gap-2 rounded-sm border p-3">
      <span className="text-muted-foreground">
        {request.createdByName ?? "Πελάτης"} · {formatDateTime(request.createdAt)}
      </span>
      <p className="m-0 whitespace-pre-wrap">{request.body}</p>
      {request.decision ? (
        <DecidedLine request={request} />
      ) : (
        <DecideRequestForm requestId={request.id} canSeeAmounts={canSeeAmounts} />
      )}
    </li>
  );
}

function DecidedLine({ request }: { request: DeliverableRequest }) {
  if (!request.decision) return null;
  return (
    <div className="grid gap-1">
      <span className="flex flex-wrap items-center gap-2">
        <Badge>{DECISION_LABELS[request.decision]}</Badge>
        {request.decidedByName && <span className="text-muted-foreground">{request.decidedByName}</span>}
      </span>
      {request.decisionNote && <MutedNote>{request.decisionNote}</MutedNote>}
    </div>
  );
}

// Το «Χρεώνεται» θέλει Δικαίωμα να βλέπεις ποσά· αλλιώς δεν εμφανίζεται (η βάση το ξαναελέγχει).
function DecideRequestForm({ requestId, canSeeAmounts }: { requestId: string; canSeeAmounts: boolean }) {
  const [decision, setDecision] = useState<RequestDecision>("round");
  return (
    <ActionForm action={decideRequest} submitLabel="Αποθήκευση απόφασης" pendingLabel="Αποθήκευση…" variant="default">
      <input type="hidden" name="requestId" value={requestId} />
      <Field label="Απόφαση">
        <Select name="decision" value={decision} onChange={(event) => setDecision(event.target.value as RequestDecision)}>
          <option value="round">Δεκτό ως γύρος</option>
          {canSeeAmounts && <option value="charged">Χρεώνεται</option>}
          <option value="new_deliverable">Νέο Παραδοτέο</option>
        </Select>
      </Field>
      <Field label="Σημείωση (προαιρετική)">
        <TextArea name="note" rows={2} />
      </Field>
    </ActionForm>
  );
}
