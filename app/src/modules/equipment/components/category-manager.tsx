import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import {
  createCategory,
  deleteCategory,
  renameCategory,
  restoreCategory,
  retireCategory,
} from "../actions-categories";
import type { EquipmentCategory } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./equipment-fields";

interface CategoryManagerProps {
  categories: readonly EquipmentCategory[];
}

const RETIRED_HINT =
  "Αποσυρμένη Κατηγορία δεν προσφέρεται σε νέο αντικείμενο· όσα την έχουν, την κρατούν.";

// Οι Κατηγορίες του μητρώου. Όποιος Διαχειρίζεται απόθεμα τις προσθέτει, μετονομάζει, αποσύρει, επαναφέρει ή διαγράφει.
export function CategoryManager({ categories }: CategoryManagerProps) {
  return (
    <Panel label="Κατηγορίες">
      <div className="grid gap-4">
        <MutedNote>{RETIRED_HINT}</MutedNote>
        <ul className="m-0 grid list-none gap-3 p-0">
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
        <ActionForm
          action={createCategory}
          submitLabel="Προσθήκη"
          pendingLabel="Προσθήκη…"
          resetOnSuccess
        >
          <Field label="Νέα Κατηγορία">
            <Input name="name" required placeholder="Νέα Κατηγορία…" />
          </Field>
        </ActionForm>
      </div>
    </Panel>
  );
}

function CategoryRow({ category }: { category: EquipmentCategory }) {
  return (
    <li className="grid gap-2 border-b pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{category.name}</span>
        <span className="text-sm text-muted-foreground">
          · {category.itemCount} αντικείμενα
        </span>
        {category.isRetired && <Badge>αποσυρμένη</Badge>}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <RenameForm category={category} />
        <RetireOrRestoreForm category={category} />
        {category.itemCount === 0 && (
          <ActionForm
            action={deleteCategory}
            submitLabel="Διαγραφή"
            size="sm"
            variant="danger"
          >
            <input type="hidden" name="categoryId" value={category.id} />
          </ActionForm>
        )}
      </div>
    </li>
  );
}

function RenameForm({ category }: { category: EquipmentCategory }) {
  return (
    <ActionForm
      action={renameCategory}
      onlyWhenChanged submitLabel="Μετονομασία"
      size="sm"
      variant="default"
    >
      <input type="hidden" name="categoryId" value={category.id} />
      <Input
        name="name"
        required
        defaultValue={category.name}
        aria-label={`Νέο όνομα για ${category.name}`}
      />
    </ActionForm>
  );
}

function RetireOrRestoreForm({ category }: { category: EquipmentCategory }) {
  const isRetired = category.isRetired;
  return (
    <ActionForm
      action={isRetired ? restoreCategory : retireCategory}
      submitLabel={isRetired ? "Επαναφορά" : "Απόσυρση"}
      size="sm"
      variant="default"
    >
      <input type="hidden" name="categoryId" value={category.id} />
    </ActionForm>
  );
}
