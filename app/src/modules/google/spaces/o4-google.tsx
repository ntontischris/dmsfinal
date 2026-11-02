import Link from "next/link";

import { SaveRow, SettingsCard, SettingsForm } from "@/modules/settings";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice } from "@/spaces/screens/shared";

import { saveGoogleRules } from "../actions";
import { DELETE_HOURS_LABELS, NEW_EVENT_LABELS } from "../labels";
import { getGoogleView } from "../queries";

// O4 › Ημερολόγιο Google στη νέα εμφάνιση (prototype `screens/o4-rules.tsx` O4Google): οι τρεις Κανόνες του Google,
// με το πραγματικό saveGoogleRules. Το «ναι/όχι» στέλνει «on»/κενό, όπως το κουτάκι της παλιάς φόρμας.
export async function SpacesGoogleRules() {
  const view = await getGoogleView();
  if (!view.ok) return <ErrorNotice what="οι Κανόνες του Google" />;
  const rules = view.data.rules;
  return (
    <>
      <SettingsCard title="Κανόνες ημερολογίου Google">
        <SettingsForm action={saveGoogleRules}>
          <div className="o-fields">
            <span className="stack o-field">
              <label htmlFor="o4-g-new">Νέο γεγονός από το Google</label>
              <select
                id="o4-g-new"
                name="newEvent"
                className="select"
                defaultValue={rules.newEvent}
              >
                {Object.entries(NEW_EVENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </span>
            <span className="stack o-field">
              <label htmlFor="o4-g-del">Προθεσμία επιβεβαίωσης διαγραφής</label>
              <select
                id="o4-g-del"
                name="deleteHours"
                className="select"
                defaultValue={String(rules.deleteHours)}
              >
                {Object.entries(DELETE_HOURS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
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
                name="writePending"
                className="select"
                defaultValue={rules.writePending ? "on" : ""}
              >
                <option value="on">ναι</option>
                <option value="">όχι</option>
              </select>
            </span>
          </div>
          <SaveRow card="google" />
        </SettingsForm>
        <p className="note" role="status">
          Σταθερός κανόνας: ένα γεγονός από το Google δεν γίνεται ποτέ Γύρισμα.
          Το πολύ να κλείσει χρόνο.
        </p>
      </SettingsCard>
      <p className="muted o-hint">
        Τα Πρότυπα συνεργείου και εξοπλισμού δεν είναι εδώ:{" "}
        <Link href={hrefOf("E7")}>Πρότυπα (E7)</Link>.
      </p>
    </>
  );
}
