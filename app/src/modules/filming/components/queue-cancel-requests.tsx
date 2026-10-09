import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { decideCancelRequest } from "../actions-transitions";
import { NO_CLIENT_LABEL } from "../labels";
import { formatDateTime, formatHours } from "../helpers";
import type { CancelRequestEntry } from "../types";

import { ActionForm } from "./action-form";

// E2: αιτήματα ακύρωσης μετά το Όριο. Δίπλα σε κάθε αίτημα φαίνεται τι θα συμβεί αν δεχτείς.
export function QueueCancelRequests({
  requests,
}: {
  requests: readonly CancelRequestEntry[];
}) {
  return (
    <Panel label="Αιτήματα ακύρωσης">
      {requests.length === 0 ? (
        <Notice kind="empty" title="Κανένα αίτημα ακύρωσης">
          <p className="m-0">
            Τα αιτήματα μετά το Όριο ακύρωσης εμφανίζονται εδώ.
          </p>
        </Notice>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Γύρισμα</Th>
              <Th>Λόγος</Th>
              <Th>Αν δεχτείς</Th>
              <Th>Απόφαση</Th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <CancelRequestRow key={request.id} request={request} />
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

function CancelRequestRow({ request }: { request: CancelRequestEntry }) {
  return (
    <Tr>
      <Td data-label="Γύρισμα">
        <span className="grid gap-1">
          <span>
            {formatDateTime(request.startsAt)} · {formatHours(request.hours)}{" "}
            ώρ.
          </span>
          <span className="text-muted-foreground">
            {request.client?.name ?? NO_CLIENT_LABEL} ·{" "}
            {request.production.title}
          </span>
        </span>
      </Td>
      <Td data-label="Λόγος">{request.reason}</Td>
      <Td data-label="Αν δεχτείς">
        <Badge tone={request.willBurn ? "attention" : undefined}>
          {request.willBurn ? "καίγεται η Παροχή" : "επιστρέφει η Παροχή"}
        </Badge>
      </Td>
      <Td data-label="Απόφαση">
        <div className="grid gap-3">
          <ActionForm
            action={decideCancelRequest}
            submitLabel="Δέχομαι την ακύρωση"
            variant="default"
            size="sm"
          >
            <input type="hidden" name="filmingId" value={request.id} />
            <input type="hidden" name="accept" value="accept" />
          </ActionForm>
          <ActionForm
            action={decideCancelRequest}
            submitLabel="Αρνούμαι"
            variant="danger"
            size="sm"
          >
            <input type="hidden" name="filmingId" value={request.id} />
            <input type="hidden" name="accept" value="refuse" />
            <Field label="Λόγος άρνησης (προαιρετικός)">
              <Input name="reason" maxLength={500} />
            </Field>
          </ActionForm>
        </div>
      </Td>
    </Tr>
  );
}
