"use client";

import { Field, Input, Select } from "@/components/ui/field";

import { createItem, updateItem } from "../actions-items";
import { selectableCategories } from "../helpers";
import type { EquipmentCategory, EquipmentItemRow } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote, TextArea } from "./equipment-fields";

interface ItemFormProps {
  categories: readonly EquipmentCategory[];
  item?: EquipmentItemRow; // απουσία = νέο αντικείμενο
}

const CODE_HINT = "Προαιρετικός. Δεν είναι μοναδικός.";
const NOTE_HINT = "Τι περιέχει, πού φυλάγεται.";
const CATEGORY_HINT = "Αποσυρμένη Κατηγορία δεν προσφέρεται σε νέο αντικείμενο.";

// Νέο αντικείμενο ή αλλαγή στοιχείων. Η Κατάσταση δεν αλλάζει εδώ: έχει τη δική της φόρμα.
export function ItemForm({ categories, item }: ItemFormProps) {
  const options = selectableCategories(categories, item?.categoryId);
  return (
    <ActionForm
      action={item ? updateItem : createItem}
      submitLabel={item ? "Αποθήκευση" : "Δημιουργία"}
      pendingLabel={item ? "Αποθήκευση…" : "Δημιουργία…"}
      resetOnSuccess={!item}
    >
      {item && <input type="hidden" name="itemId" value={item.id} />}
      <Field label="Όνομα">
        <Input name="name" required defaultValue={item?.name ?? ""} />
      </Field>
      <Field label="Κατηγορία" hint={CATEGORY_HINT}>
        <Select
          name="categoryId"
          required
          defaultValue={item?.categoryId ?? ""}
        >
          {!item && <option value="">Διάλεξε Κατηγορία…</option>}
          {options.map((category) => (
            <option key={category.id} value={category.id}>
              {category.isRetired ? `${category.name} (αποσυρμένη)` : category.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Κωδικός ή σειριακός" hint={CODE_HINT}>
        <Input name="code" defaultValue={item?.code ?? ""} autoComplete="off" />
      </Field>
      <Field label="Σημείωση" hint={NOTE_HINT}>
        <TextArea name="note" rows={3} defaultValue={item?.note ?? ""} />
      </Field>
      {!item && (
        <MutedNote>Μετά τη δημιουργία, η Κατάσταση αλλάζει από τη σελίδα του αντικειμένου.</MutedNote>
      )}
    </ActionForm>
  );
}
