import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { saveProductionHours } from "../actions";
import { decimalText } from "../helpers";
import type { CostDetail } from "../types";

import { ActionForm } from "./action-form";
import { ShootHoursField } from "./shoot-hours-field";

interface HoursFormProps {
  row: CostDetail;
}

// Η φόρμα των ωρών: γύρισμα (με πρόταση), μοντάζ, άμεσο κόστος και δύο επιβεβαιώσεις. Αποθηκεύεται μόνο όταν αλλάξει κάτι.
export function HoursForm({ row }: HoursFormProps) {
  const { actual } = row;
  return (
    <Panel label="Ώρες και άμεσο κόστος">
      <ActionForm action={saveProductionHours} onlyWhenChanged submitLabel="Αποθήκευση">
        <input type="hidden" name="productionId" value={row.productionId} />
        <ShootHoursField defaultValue={actual.shootHours} suggested={actual.suggestedShootHours} />
        <Field label="Ώρες μοντάζ">
          <Input name="editHours" inputMode="decimal" defaultValue={decimalText(actual.editHours)} />
        </Field>
        <Field label="Άμεσο κόστος (€)" hint="Αν μείνει κενό, μπαίνει η εκτίμηση.">
          <Input name="directCost" inputMode="decimal" defaultValue={decimalText(actual.directCost)} />
        </Field>
        <ConfirmBox name="confirmShoot" label="Επιβεβαίωση γυρίσματος" defaultChecked={actual.shootConfirmed} />
        <ConfirmBox name="confirmEdit" label="Επιβεβαίωση μοντάζ" defaultChecked={actual.editConfirmed} />
      </ActionForm>
    </Panel>
  );
}

interface ConfirmBoxProps {
  name: string;
  label: string;
  defaultChecked: boolean;
}

// Η επιβεβαίωση μετράει στο πραγματικό· χωρίς τικ οι ώρες μένουν πρόχειρες.
function ConfirmBox({ name, label, defaultChecked }: ConfirmBoxProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-primary" />
      <span>{label}</span>
    </label>
  );
}
