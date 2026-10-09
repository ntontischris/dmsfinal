import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { respondToCrew } from "../actions-crew";
import { NO_CLIENT_LABEL, RESPONSE_LABELS, STATE_LABELS } from "../labels";
import { formatDateTime, formatHours, stateTone } from "../helpers";
import type { MineEntry } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";

// E6: τα ανοιχτά Γυρίσματα όπου είσαι στο Συνεργείο. Επιβεβαιώνεις ή δηλώνεις «δεν μπορώ» με λόγο.
export function MineList({ entries }: { entries: readonly MineEntry[] }) {
  if (entries.length === 0) {
    return (
      <Notice kind="empty" title="Κανένα Γύρισμα για σένα">
        <p className="m-0">Όταν σε βάλουν στο Συνεργείο, θα το δεις εδώ.</p>
      </Notice>
    );
  }
  return (
    <Table>
      <thead>
        <tr>
          <Th>Πότε</Th>
          <Th>Πελάτης και Παραγωγή</Th>
          <Th>Πού</Th>
          <Th>Η απάντησή σου</Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <MineRow key={entry.id} entry={entry} />
        ))}
      </tbody>
    </Table>
  );
}

function MineRow({ entry }: { entry: MineEntry }) {
  return (
    <Tr>
      <Td data-label="Πότε">
        <span className="grid gap-1">
          <span>
            {formatDateTime(entry.startsAt)} · {formatHours(entry.hours)} ώρ.
          </span>
          <Badge tone={stateTone(entry.state)}>
            {STATE_LABELS[entry.state]}
          </Badge>
        </span>
      </Td>
      <Td data-label="Πελάτης και Παραγωγή">
        <span className="grid gap-0.5">
          <span>{entry.client?.name ?? NO_CLIENT_LABEL}</span>
          <span className="text-muted-foreground">
            {entry.production.title}
          </span>
          {entry.note && (
            <span className="text-muted-foreground">{entry.note}</span>
          )}
        </span>
      </Td>
      <Td data-label="Πού">{entry.location ?? "—"}</Td>
      <Td data-label="Η απάντησή σου">
        <div className="grid gap-3">
          <Badge>{RESPONSE_LABELS[entry.myResponse]}</Badge>
          {entry.myResponse !== "confirmed" && (
            <ActionForm
              action={respondToCrew}
              submitLabel="Επιβεβαιώνω"
              variant="default"
              size="sm"
            >
              <input type="hidden" name="filmingId" value={entry.id} />
              <input type="hidden" name="response" value="confirmed" />
            </ActionForm>
          )}
          {entry.myResponse !== "declined" && (
            <ActionForm
              action={respondToCrew}
              submitLabel="Δεν μπορώ"
              variant="danger"
              size="sm"
            >
              <input type="hidden" name="filmingId" value={entry.id} />
              <input type="hidden" name="response" value="declined" />
              <Field label="Λόγος (υποχρεωτικός)">
                <Input name="reason" required maxLength={500} />
              </Field>
            </ActionForm>
          )}
          {entry.myReason && <MutedNote>Λόγος: {entry.myReason}</MutedNote>}
        </div>
      </Td>
    </Tr>
  );
}
