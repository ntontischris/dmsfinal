import { Field, Input, Select } from "@/components/ui/field";
import type { EquipmentCategory, EquipmentStatus } from "../types";
import { EQUIPMENT_STATUSES } from "../types";
import { STATUS_LABELS } from "../labels";

// Τα φίλτρα του F1. Η τιμή «όλα» σημαίνει χωρίς φίλτρο· στην Κατάσταση, χωρίς φίλτρο = χωρίς τα αποσυρμένα.
export interface ItemFilterValues {
  query: string;
  categoryId: string | "all";
  status: EquipmentStatus | "all";
}

interface ToolbarProps {
  value: ItemFilterValues;
  categories: readonly EquipmentCategory[];
  onChange: (value: ItemFilterValues) => void;
}

const ALL = "all";
const ALL_STATUSES_LABEL = "Σε χρήση (χωρίς αποσυρμένα)";

const isStatus = (value: string): value is EquipmentStatus =>
  EQUIPMENT_STATUSES.some((status) => status === value);

export function EquipmentToolbar({ value, categories, onChange }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1">
        <Field label="Αναζήτηση στον Εξοπλισμό">
          <Input
            type="search"
            value={value.query}
            placeholder="Όνομα ή κωδικός…"
            autoComplete="off"
            onChange={(event) => onChange({ ...value, query: event.target.value })}
          />
        </Field>
      </div>
      <Field label="Κατηγορία">
        <Select
          value={value.categoryId}
          onChange={(event) => onChange({ ...value, categoryId: event.target.value })}
        >
          <option value={ALL}>Όλες οι Κατηγορίες</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Κατάσταση">
        <Select
          value={value.status}
          onChange={(event) => {
            const next = event.target.value;
            onChange({
              ...value,
              status: isStatus(next) ? next : ALL,
            });
          }}
        >
          <option value={ALL}>{ALL_STATUSES_LABEL}</option>
          {EQUIPMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
