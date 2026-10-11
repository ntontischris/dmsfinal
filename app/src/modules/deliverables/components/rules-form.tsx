import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { saveDeliverableRules } from "../actions-rules";
import { formatReminderDays } from "../rules-schemas";
import type { DeliverableRules } from "../rules-types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";
import { RulesKindsTable } from "./rules-kinds-table";

// Ρυθμίσεις › Παραδοτέα: οι Κανόνες του Παραδοτέου. Αποθηκεύονται ως μία φόρμα, όπως οι Κανόνες γυρισμάτων.
export function DeliverableRulesForm({ rules }: { rules: DeliverableRules }) {
  return (
    <ActionForm action={saveDeliverableRules} onlyWhenChanged submitLabel="Αποθήκευση Κανόνων" variant="primary">
      <Panel label="Έλεγχος">
        <div className="grid gap-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="internalReview" defaultChecked={rules.internalReview} />
            Εσωτερικός έλεγχος
          </label>
          <MutedNote>
            Όταν είναι κλειστός, η Έκδοση μιας Παραγωγής πελάτη πάει κατευθείαν στον πελάτη. Η Εσωτερική Παραγωγή περνά πάντα από έλεγχο.
          </MutedNote>
        </div>
      </Panel>
      <Panel label="Χρόνοι">
        <div className="grid gap-4">
          <Field label="Νέα προθεσμία μετά από αλλαγές (εργάσιμες)">
            <Input name="changesDays" type="number" min={0} max={30} required defaultValue={rules.changesDays} />
          </Field>
          <Field label="Υπενθυμίσεις στον πελάτη (μέρες)" hint="Χωρισμένες με κόμμα, έως πέντε, π.χ. 3, 7.">
            <Input name="reminderDays" type="text" inputMode="numeric" defaultValue={formatReminderDays(rules.reminderDays)} />
          </Field>
        </div>
      </Panel>
      <Panel label="Ανά είδος Παροχής">
        <RulesKindsTable kinds={rules.kinds} />
      </Panel>
    </ActionForm>
  );
}
