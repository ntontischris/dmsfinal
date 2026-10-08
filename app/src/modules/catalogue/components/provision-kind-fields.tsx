import { Field, Input, Select } from "@/components/ui/field";

import { MEASURE_LABELS } from "../labels";
import type { ProvisionKind } from "../types";

// Τα πεδία ενός είδους Παροχής: ίδια στη φόρμα «Προσθήκη» και στην «Επεξεργασία» μιας γραμμής.
// Το κόμμα είναι ο δεκαδικός του ελληνικού πληκτρολογίου, γι' αυτό η διάρκεια είναι πεδίο κειμένου.
// Τα αγγλικά δεν έχουν «required» του browser: το μήνυμα «Γράψε και τα αγγλικά» το δίνει ο server, με την αιτιολογία.

const hoursText = (kind?: ProvisionKind): string =>
  kind?.defaultHours == null ? "" : String(kind.defaultHours).replace(".", ",");

export function ProvisionKindFields({ kind }: { kind?: ProvisionKind }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Ετικέτα">
        <Input name="label" required defaultValue={kind?.label} />
      </Field>
      <Field label="Ετικέτα (EN)">
        <Input name="labelEn" defaultValue={kind?.labelEn} />
      </Field>
      <Field label="Μονάδα">
        <Input name="unit" required defaultValue={kind?.unit} />
      </Field>
      <Field label="Μονάδα (EN)">
        <Input name="unitEn" defaultValue={kind?.unitEn} />
      </Field>
      <Field label="Τρόπος μέτρησης">
        <Select name="measure" defaultValue={kind?.measure ?? ""}>
          <option value="">Σε πλήθος</option>
          <option value="per_filming">{MEASURE_LABELS.per_filming}</option>
          <option value="per_hour">{MEASURE_LABELS.per_hour}</option>
          <option value="per_day">{MEASURE_LABELS.per_day}</option>
        </Select>
      </Field>
      <Field
        label="Προεπιλεγμένη διάρκεια (ώρες)"
        hint="Μόνο με Τρόπο μέτρησης."
      >
        <Input
          name="defaultHours"
          inputMode="decimal"
          defaultValue={hoursText(kind)}
        />
      </Field>
    </div>
  );
}
