import Link from "next/link";

import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { saveDeliverableRules } from "../actions-rules";
import type { DeliverableRules } from "../rules-types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";
import { RulesKindsTable } from "./rules-kinds-table";

// Ρυθμίσεις › Παραδοτέα: οι Κανόνες του Παραδοτέου. Αποθηκεύονται ως μία φόρμα, όπως οι Κανόνες γυρισμάτων.
// Το link στους Αυτοματισμούς φαίνεται μόνο σε όποιον «Διαχειρίζεται Αυτοματισμούς» (#173).
export function DeliverableRulesForm({
  rules,
  canManageAutomations,
}: {
  rules: DeliverableRules;
  canManageAutomations: boolean;
}) {
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
          <MutedNote>
            Οι υπενθυμίσεις στον πελάτη για Έκδοση που περιμένει αλλάζουν στους{" "}
            {canManageAutomations ? (
              <Link href="/app/settings/automations/deliverable.client_waiting">Αυτοματισμούς</Link>
            ) : (
              "Αυτοματισμούς"
            )}
            .
          </MutedNote>
        </div>
      </Panel>
      <Panel label="Ανά είδος Παροχής">
        <RulesKindsTable kinds={rules.kinds} />
      </Panel>
    </ActionForm>
  );
}
