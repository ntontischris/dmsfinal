import { Field, Input, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { saveFilmingSettings } from "../actions-settings";
import {
  CONFLICT_LABELS,
  DONE_LABELS,
  NO_ANSWER_LABELS,
  SHEET_LABELS,
} from "../labels";
import type { FilmingSettings } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";

// Οι τέσσερις Κανόνες που αποθηκεύονται αλλά δεν εκτελούνται ακόμα (χωρίς scheduler και χωρίς Ημερολόγιο).
const INACTIVE_NOTE = "Ισχύει όταν έρθει το Ημερολόγιο· μέχρι τότε αποθηκεύεται μόνο (χωρίς scheduler).";

// Ρυθμίσεις › Γυρίσματα: οι έντεκα Κανόνες του Γ7.
export function FilmingRulesForm({ settings }: { settings: FilmingSettings }) {
  return (
    <ActionForm action={saveFilmingSettings} onlyWhenChanged submitLabel="Αποθήκευση Κανόνων" variant="primary">
      <Panel label="Κρατήσεις">
        <div className="grid gap-4">
          <Checkbox name="bookingNeedsApproval" label="Η κράτηση του Πελάτη θέλει έγκριση" checked={settings.bookingNeedsApproval} />
          <Field label="Ορίζοντας κρατήσεων (μέρες)">
            <Input name="horizonDays" type="number" min={1} max={365} required defaultValue={settings.horizonDays} />
          </Field>
          <Checkbox name="allowOutsidePeriod" label="Επιτρέπεται κράτηση εκτός Περιόδου" checked={settings.allowOutsidePeriod} />
          <Checkbox name="rescheduleNeedsApproval" label="Η μετάθεση από τον Πελάτη θέλει επανέγκριση" checked={settings.rescheduleNeedsApproval} inactive />
        </div>
      </Panel>
      <Panel label="Χωρίς απάντηση">
        <div className="grid gap-4">
          <Field label="Αν ο Πελάτης δεν απαντήσει">
            <Select name="noAnswerAction" defaultValue={settings.noAnswerAction}>
              {Object.entries(NO_ANSWER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <MutedNote>{INACTIVE_NOTE}</MutedNote>
          </Field>
          <Field label="Μετά από (ώρες)" hint="Ορίζει πότε το Γύρισμα παίρνει το σήμα «περιμένει» στην ουρά έγκρισης.">
            <Input name="noAnswerHours" type="number" min={1} max={720} required defaultValue={settings.noAnswerHours} />
          </Field>
        </div>
      </Panel>
      <Panel label="Εξοπλισμός και Συνεργείο">
        <div className="grid gap-4">
          <Field label="Σύγκρουση εξοπλισμού">
            <Select name="equipmentConflict" defaultValue={settings.equipmentConflict}>
              {Object.entries(CONFLICT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <Checkbox name="clientSeesEquipment" label="Ο Πελάτης βλέπει τον Εξοπλισμό" checked={settings.clientSeesEquipment} />
          <Checkbox name="changeResetsConfirmations" label="Αλλαγή Συνεργείου ή ώρας μετά την αποστολή μηδενίζει τις απαντήσεις" checked={settings.changeResetsConfirmations} />
        </div>
      </Panel>
      <Panel label="Δελτίο και «έγινε»">
        <div className="grid gap-4">
          <Field label="Αποστολή δελτίου">
            <Select name="sheetSending" defaultValue={settings.sheetSending}>
              {Object.entries(SHEET_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <MutedNote>{INACTIVE_NOTE}</MutedNote>
          </Field>
          <Field label="Σήμανση «έγινε»">
            <Select name="doneMarking" defaultValue={settings.doneMarking}>
              {Object.entries(DONE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <MutedNote>{INACTIVE_NOTE}</MutedNote>
          </Field>
        </div>
      </Panel>
    </ActionForm>
  );
}

function Checkbox({ name, label, checked, inactive = false }: { name: string; label: string; checked: boolean; inactive?: boolean }) {
  return (
    <div className="grid gap-1">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name={name} defaultChecked={checked} />
        {label}
      </label>
      {inactive && <MutedNote>{INACTIVE_NOTE}</MutedNote>}
    </div>
  );
}
