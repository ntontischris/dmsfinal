import { SaveRow, SettingsCard, SettingsForm } from "@/modules/settings";
import { ListRow, RowList } from "@/spaces/kit/parts";

import { saveFilmingSettings } from "../actions-settings";
import {
  CONFLICT_LABELS,
  DONE_LABELS,
  NO_ANSWER_LABELS,
  SHEET_LABELS,
} from "../labels";
import type { FilmingSettings } from "../types";
import { YES_NO, o4RulesOf, type O4Rule } from "./o4-model";

// Ο Κανόνας: λίστα επιλογών, ναι/όχι (στέλνει «on»/κενό όπως το κουτάκι της παλιάς φόρμας) ή αριθμός.
function RuleControl({ rule }: { rule: O4Rule }) {
  const id = `o4-${rule.name}`;
  if (rule.kind === "number")
    return (
      <input
        id={id}
        name={rule.name}
        className="input"
        type="number"
        min={rule.min}
        max={rule.max}
        required
        defaultValue={rule.value}
      />
    );
  const options = rule.kind === "yesno" ? YES_NO : rule.options;
  return (
    <select
      id={id}
      name={rule.name}
      className="select"
      defaultValue={rule.value}
    >
      {Object.entries(options).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

// Κανόνες γυρισμάτων (prototype `screens/o4-rules.tsx` O4Rules): οι έντεκα Κανόνες, μία αποθήκευση με το πραγματικό action.
export function O4Rules({ settings }: { settings: FilmingSettings }) {
  const rules = o4RulesOf(settings, {
    noAnswer: NO_ANSWER_LABELS,
    conflict: CONFLICT_LABELS,
    sheet: SHEET_LABELS,
    done: DONE_LABELS,
  });
  return (
    <SettingsCard title="Κανόνες γυρισμάτων">
      <p className="muted o-hint">
        Διαλέγεις ανάμεσα σε λίγες σταθερές επιλογές. Οι αρχικές τιμές είναι
        έτοιμες και απλώς ελέγχονται.
      </p>
      <SettingsForm action={saveFilmingSettings}>
        <RowList>
          {rules.map((rule) => (
            <ListRow
              key={rule.name}
              title={<label htmlFor={`o4-${rule.name}`}>{rule.label}</label>}
              sub={rule.hint}
              aside={<RuleControl rule={rule} />}
            />
          ))}
        </RowList>
        <SaveRow card="rules" />
      </SettingsForm>
      <p className="muted o-hint">
        Ισχύει από την επόμενη κράτηση· τα κλεισμένα Γυρίσματα δεν αλλάζουν.
      </p>
    </SettingsCard>
  );
}
