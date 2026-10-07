import Link from "next/link";

import {
  FILMING_RULES,
  GOOGLE_RULES,
  RULES_AFFECTED,
} from "@/data/settings-filming";
import { SaveRow, SettingsCard } from "@/screens/o-shared";
import { screenHref, type ScreenProps } from "@/screens/shared";

// Κανόνες γυρισμάτων: 9 σταθερές επιλογές, χωρίς λογική.
export function O4Rules({ role, query }: ScreenProps) {
  return (
    <SettingsCard title="Κανόνες γυρισμάτων">
      <p className="muted o-hint">
        Διαλέγεις ανάμεσα σε λίγες σταθερές επιλογές. Οι αρχικές τιμές είναι
        έτοιμες και απλώς ελέγχονται.
      </p>
      {FILMING_RULES.map((rule) => (
        <div key={rule.id} className="o4-rule">
          <label htmlFor={`o4-${rule.id}`}>{rule.label}</label>
          <select
            id={`o4-${rule.id}`}
            className="select"
            defaultValue={rule.value}
          >
            {rule.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      ))}
      <SaveRow
        role={role}
        query={query}
        code="O4"
        card="rules"
        forward={{ affected: RULES_AFFECTED, what: "κλεισμένα Γυρίσματα" }}
      />
      <p className="muted o-hint">
        Ισχύει από την επόμενη κράτηση· {RULES_AFFECTED} κλεισμένα Γυρίσματα δεν
        αλλάζουν.
      </p>
    </SettingsCard>
  );
}

// Κανόνες ημερολογίου Google.
export function O4Google({ role, query }: ScreenProps) {
  const rules = GOOGLE_RULES;
  return (
    <>
      <SettingsCard title="Κανόνες ημερολογίου Google">
        <div className="o-fields">
          <span className="stack o-field">
            <label htmlFor="o4-g-new">Νέο γεγονός από το Google</label>
            <select
              id="o4-g-new"
              className="select"
              defaultValue={rules.newEvent}
            >
              {rules.newEventOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </span>
          <span className="stack o-field">
            <label htmlFor="o4-g-del">Προθεσμία επιβεβαίωσης διαγραφής</label>
            <select
              id="o4-g-del"
              className="select"
              defaultValue={rules.deleteDeadline}
            >
              {rules.deleteDeadlineOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </span>
          <span className="stack o-field">
            <label htmlFor="o4-g-write">
              Γράφονται στο Google τα Γυρίσματα που αναμένουν έγκριση
            </label>
            <select
              id="o4-g-write"
              className="select"
              defaultValue={rules.writePending}
            >
              <option value="ναι">ναι</option>
              <option value="όχι">όχι</option>
            </select>
          </span>
        </div>
        <SaveRow role={role} query={query} code="O4" card="google" />
        <p className="note" role="status">
          Σταθερός κανόνας: ένα γεγονός από το Google δεν γίνεται ποτέ Γύρισμα.
          Το πολύ να κλείσει χρόνο.
        </p>
      </SettingsCard>
      <p className="muted o-hint">
        Τα Πρότυπα συνεργείου και εξοπλισμού δεν είναι εδώ:{" "}
        <Link href={screenHref(role, "E7", {})}>Πρότυπα (E7)</Link>.
      </p>
    </>
  );
}
