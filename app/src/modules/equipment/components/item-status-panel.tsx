import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { setItemStatus } from "../actions-items";
import { statusTone } from "../helpers";
import { REPAIR_NOTE_LABEL, RETIRE_NOTE_LABEL, STATUS_LABELS } from "../labels";
import type { EquipmentItemDetail, EquipmentStatus } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote, TextArea } from "./equipment-fields";

interface ItemStatusPanelProps {
  item: EquipmentItemDetail;
  canManage: boolean;
}

// Η Κατάσταση με τον λόγο της. Η επισκευή θέλει λόγο· η απόσυρση τον θέλει προαιρετικά.
export function ItemStatusPanel({ item, canManage }: ItemStatusPanelProps) {
  return (
    <Panel label="Κατάσταση">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(item.status)}>
            {STATUS_LABELS[item.status]}
          </Badge>
          {item.statusNote && (
            <span className="text-sm">Λόγος: {item.statusNote}</span>
          )}
        </div>
        {canManage ? (
          <StatusActions item={item} />
        ) : (
          <MutedNote>
            Μόνο ανάγνωση: την Κατάσταση την αλλάζει όποιος «Διαχειρίζεται
            απόθεμα».
          </MutedNote>
        )}
      </div>
    </Panel>
  );
}

function StatusActions({ item }: { item: EquipmentItemDetail }) {
  if (item.status === "available")
    return (
      <div className="grid gap-6">
        <StatusForm
          itemId={item.id}
          status="in_repair"
          submitLabel="Σε επισκευή"
        />
        <StatusForm
          itemId={item.id}
          status="retired"
          submitLabel="Απόσυρση"
          isDanger
        />
      </div>
    );
  if (item.status === "in_repair")
    return (
      <div className="grid gap-6">
        <StatusForm
          itemId={item.id}
          status="available"
          submitLabel="Διαθέσιμο ξανά"
        />
        <StatusForm
          itemId={item.id}
          status="retired"
          submitLabel="Απόσυρση"
          isDanger
        />
      </div>
    );
  return (
    <StatusForm
      itemId={item.id}
      status="available"
      submitLabel="Διαθέσιμο ξανά"
    />
  );
}

interface StatusFormProps {
  itemId: string;
  status: EquipmentStatus;
  submitLabel: string;
  isDanger?: boolean;
}

// Μία φόρμα ανά αλλαγή: ο λόγος ζητιέται μόνο όπου χρειάζεται (επισκευή υποχρεωτικός, απόσυρση προαιρετικός).
function StatusForm({
  itemId,
  status,
  submitLabel,
  isDanger = false,
}: StatusFormProps) {
  return (
    <ActionForm
      action={setItemStatus}
      submitLabel={submitLabel}
      pendingLabel="Αλλαγή…"
      variant={isDanger ? "danger" : "default"}
    >
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="status" value={status} />
      <NoteField status={status} />
    </ActionForm>
  );
}

function NoteField({ status }: { status: EquipmentStatus }) {
  if (status === "in_repair")
    return (
      <Field label={REPAIR_NOTE_LABEL}>
        <TextArea name="note" rows={2} required />
      </Field>
    );
  if (status === "retired")
    return (
      <Field label={RETIRE_NOTE_LABEL}>
        <Input name="note" />
      </Field>
    );
  return null;
}
