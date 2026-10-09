import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { approveFilming, rejectFilming } from "../actions-transitions";
import { NO_CLIENT_LABEL } from "../labels";
import {
  balanceText,
  formatDateTime,
  formatHours,
  waitingText,
} from "../helpers";
import type { PendingEntry } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";

// E2: τα Γυρίσματα που περιμένουν έγκριση, το παλαιότερο πρώτο. Η ένδειξη «περιμένει» δείχνει πότε αξίζει προσοχή.
export function QueuePending({
  entries,
}: {
  entries: readonly PendingEntry[];
}) {
  return (
    <Panel label="Αναμένουν έγκριση">
      {entries.length === 0 ? (
        <Notice kind="empty" title="Καμία αίτηση σε αναμονή">
          <p className="m-0">Όλα τα κλεισίματα του Πελάτη έχουν απαντηθεί.</p>
        </Notice>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Πότε</Th>
              <Th>Πελάτης</Th>
              <Th>Παραγωγή</Th>
              <Th>Παροχή</Th>
              <Th>Απόφαση</Th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <PendingRow key={entry.id} entry={entry} />
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

function PendingRow({ entry }: { entry: PendingEntry }) {
  return (
    <Tr>
      <Td data-label="Πότε">
        <span className="grid gap-1">
          <span>
            {formatDateTime(entry.startsAt)} · {formatHours(entry.hours)} ώρ.
          </span>
          {entry.waitingLong && (
            <Badge tone="attention">{waitingText(entry.waitingHours)}</Badge>
          )}
        </span>
      </Td>
      <Td data-label="Πελάτης">{entry.client?.name ?? NO_CLIENT_LABEL}</Td>
      <Td data-label="Παραγωγή">{entry.production.title}</Td>
      <Td data-label="Παροχή">
        {entry.provision === null ? (
          <MutedNote>Χωρίς Παροχή</MutedNote>
        ) : (
          <span>
            {entry.provision.kind.label}: {balanceText(entry.provision.balance)}
          </span>
        )}
      </Td>
      <Td data-label="Απόφαση">
        <div className="grid gap-3">
          <ActionForm
            action={approveFilming}
            submitLabel="Έγκριση"
            variant="default"
            size="sm"
          >
            <input type="hidden" name="filmingId" value={entry.id} />
          </ActionForm>
          <ActionForm
            action={rejectFilming}
            submitLabel="Απόρριψη"
            variant="danger"
            size="sm"
          >
            <input type="hidden" name="filmingId" value={entry.id} />
            <Field label="Λόγος απόρριψης (υποχρεωτικός)">
              <Input name="reason" required maxLength={500} />
            </Field>
          </ActionForm>
        </div>
      </Td>
    </Tr>
  );
}
