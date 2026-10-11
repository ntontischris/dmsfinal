import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { saveProductionEstimate } from "../actions";
import { decimalText } from "../helpers";
import type { CostDetail } from "../types";

import { ActionForm } from "./action-form";

interface EstimateFormProps {
  row: CostDetail;
}

// Μόνο για Εσωτερική Παραγωγή: η εκτίμηση γράφεται με το χέρι· των Συμφωνιών είναι στιγμιότυπο.
export function EstimateForm({ row }: EstimateFormProps) {
  const { estimate } = row;
  return (
    <Panel label="Εκτίμηση εσωτερικής δουλειάς">
      <ActionForm action={saveProductionEstimate} onlyWhenChanged submitLabel="Αποθήκευση εκτίμησης">
        <input type="hidden" name="productionId" value={row.productionId} />
        <Field label="Ώρες γυρίσματος (εκτίμηση)">
          <Input name="shootHours" inputMode="decimal" defaultValue={decimalText(estimate.shootHours)} />
        </Field>
        <Field label="Ώρες μοντάζ (εκτίμηση)">
          <Input name="editHours" inputMode="decimal" defaultValue={decimalText(estimate.editHours)} />
        </Field>
        <Field label="Άμεσο κόστος εκτίμησης (€)">
          <Input name="directCost" inputMode="decimal" defaultValue={decimalText(estimate.directCost)} />
        </Field>
      </ActionForm>
    </Panel>
  );
}
