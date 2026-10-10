"use client";

import { Field, Input } from "@/components/ui/field";

import { createTemplate, updateTemplate } from "../actions-templates";
import { comparePickerItems } from "../helpers";
import { STATUS_LABELS } from "../labels";
import type { EquipmentItemRow, EquipmentTemplate } from "../types";

import { ActionForm } from "./action-form";
import { TextArea } from "./equipment-fields";

interface TemplateFormProps {
  items: readonly EquipmentItemRow[];
  template?: EquipmentTemplate; // απουσία = νέο Πρότυπο
}

// Τα αποσυρμένα αντικείμενα δεν προσφέρονται σε νέο Πρότυπο· ένα που ήδη είναι μέσα μένει, με τη δική του κατάσταση.
const isPickable = (
  item: EquipmentItemRow,
  selected: ReadonlySet<string>,
): boolean => item.status !== "retired" || selected.has(item.id);

const itemLabel = (item: EquipmentItemRow): string => {
  const code = item.code ? ` (${item.code})` : "";
  const status =
    item.status === "available" ? "" : ` · ${STATUS_LABELS[item.status]}`;
  return `${item.name}${code}${status}`;
};

// Φόρμα Προτύπου: όνομα, σημείωση και τα αντικείμενα με τσεκαρισμένα checkbox (τουλάχιστον ένα).
export function TemplateForm({ items, template }: TemplateFormProps) {
  const selected = new Set(template?.items.map((item) => item.id) ?? []);
  const options = items
    .filter((item) => isPickable(item, selected))
    .sort(comparePickerItems);
  return (
    <ActionForm
      action={template ? updateTemplate : createTemplate}
      onlyWhenChanged={Boolean(template)} submitLabel={template ? "Αποθήκευση" : "Δημιουργία"}
      pendingLabel="Αποθήκευση…"
      resetOnSuccess={!template}
    >
      {template && (
        <input type="hidden" name="templateId" value={template.id} />
      )}
      <Field label="Όνομα">
        <Input name="name" required defaultValue={template?.name ?? ""} />
      </Field>
      <Field label="Σημείωση">
        <TextArea name="note" rows={2} defaultValue={template?.note ?? ""} />
      </Field>
      <fieldset className="grid gap-2">
        <legend className="kit-label mb-2">
          Αντικείμενα (τουλάχιστον ένα)
        </legend>
        {options.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="itemIds"
              value={item.id}
              defaultChecked={selected.has(item.id)}
            />
            <span>{itemLabel(item)}</span>
          </label>
        ))}
      </fieldset>
    </ActionForm>
  );
}
