import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { decideRescheduleRequest } from "../actions-booking";
import type { RescheduleRequestEntry } from "../booking-types";
import { formatDateTime, formatHours } from "../helpers-time";
import { NO_CLIENT_LABEL } from "../labels";

import { ActionForm } from "./action-form";

// E2: αιτήματα μετάθεσης του Πελάτη (παλιά → νέα ώρα). Η πρόβλημα της νέας ώρας φαίνεται πριν την απόφαση.
export function QueueRescheduleRequests({
  requests,
}: {
  requests: readonly RescheduleRequestEntry[];
}) {
  return (
    <Panel label="Αιτήματα μετάθεσης">
      {requests.length === 0 ? (
        <Notice kind="empty" title="Κανένα αίτημα μετάθεσης">
          <p className="m-0">Οι μεταθέσεις του Πελάτη εμφανίζονται εδώ.</p>
        </Notice>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Από → Σε</Th>
              <Th>Πρόβλημα ώρας</Th>
              <Th>Απόφαση</Th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <RescheduleRow key={request.id} request={request} />
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

function RescheduleRow({ request }: { request: RescheduleRequestEntry }) {
  return (
    <Tr>
      <Td data-label="Από → Σε">
        <span className="grid gap-1">
          <span>
            {formatDateTime(request.startsAt)} → {formatDateTime(request.newStartsAt)} ·{" "}
            {formatHours(request.newHours)} ώρ.
          </span>
          <span className="text-muted-foreground">
            {request.client?.name ?? NO_CLIENT_LABEL} · {request.production.title}
          </span>
        </span>
      </Td>
      <Td data-label="Πρόβλημα ώρας">
        {request.slotProblem ? (
          <Badge tone="attention">{request.slotProblem}</Badge>
        ) : (
          <Badge tone="ok">ελεύθερη ώρα</Badge>
        )}
      </Td>
      <Td data-label="Απόφαση">
        <div className="grid gap-3">
          <ActionForm action={decideRescheduleRequest} submitLabel="Έγκριση" variant="default" size="sm">
            <input type="hidden" name="filmingId" value={request.id} />
            <input type="hidden" name="accept" value="accept" />
          </ActionForm>
          <ActionForm action={decideRescheduleRequest} submitLabel="Απόρριψη" variant="danger" size="sm">
            <input type="hidden" name="filmingId" value={request.id} />
            <input type="hidden" name="accept" value="refuse" />
            <Field label="Λόγος απόρριψης">
              <Input name="reason" maxLength={500} required />
            </Field>
          </ActionForm>
        </div>
      </Td>
    </Tr>
  );
}
