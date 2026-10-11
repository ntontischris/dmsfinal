import { Field, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { saveGoogleRules } from "../actions";
import { DELETE_HOURS_LABELS, NEW_EVENT_LABELS } from "../labels";
import type { GoogleRules } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";

// Ρυθμίσεις › Γυρίσματα: οι τρεις Κανόνες του Google (ADR 0015). Αλλαγές ισχύουν από εκεί και πέρα.
export function GoogleRulesForm({ rules }: { rules: GoogleRules }) {
  return (
    <ActionForm action={saveGoogleRules} onlyWhenChanged submitLabel="Αποθήκευση Κανόνων Google" variant="primary">
      <Panel label="Google Calendar">
        <div className="grid gap-4">
          <Field label="Νέο γεγονός στο Google">
            <Select name="newEvent" defaultValue={rules.newEvent}>
              {Object.entries(NEW_EVENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <MutedNote>Ισχύει για γεγονότα που δημιουργούνται στο Google και δεν είναι δικά μας.</MutedNote>
          </Field>
          <Field label="Προθεσμία για διαγραφή από το Google">
            <Select name="deleteHours" defaultValue={String(rules.deleteHours)}>
              {Object.entries(DELETE_HOURS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <MutedNote>Μετά την προθεσμία το Γύρισμα ξαναγράφεται, εκτός αν ακυρωθεί. Το πολύ ως την έναρξη.</MutedNote>
          </Field>
          <label className="grid gap-1">
            <span className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="writePending" defaultChecked={rules.writePending} />
              Τα αναμένοντα Γυρίσματα πάνε στο Google με «(αναμένει)»
            </span>
          </label>
        </div>
      </Panel>
    </ActionForm>
  );
}
