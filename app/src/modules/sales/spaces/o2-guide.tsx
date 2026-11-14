import { SaveRow, SettingsCard, SettingsForm } from "@/modules/settings";

import { saveGuideSection } from "../actions-guide";
import type { GuideSection } from "../types";

// Κάρτα «Οδηγός πωλήσεων» (b15): ποια Ενότητα της Γνώσης ανοίγει από τους Πελάτες και το Pipeline.
export function O2Guide({
  current,
  sections,
}: {
  current: string | null;
  sections: readonly GuideSection[];
}) {
  return (
    <SettingsForm action={saveGuideSection}>
      <SettingsCard title="Οδηγός πωλήσεων">
        <span className="stack o-field">
          <label htmlFor="o2-guide">Ενότητα της Γνώσης</label>
          <select
            id="o2-guide"
            name="value"
            className="select"
            defaultValue={current ?? "none"}
          >
            <option value="none">Χωρίς Οδηγό</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
          <span className="muted o-hint">
            Ανοίγει από τους Πελάτες και το Pipeline. Τα στοιχεία της τα γράφεις
            στη Διαχείριση Γνώσης, με Κοινό «Πωλήσεις».
          </span>
        </span>
        <SaveRow card="guide" />
      </SettingsCard>
    </SettingsForm>
  );
}
