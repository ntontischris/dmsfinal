import {
  ALLOWED_DURATIONS,
  DAY_EXCEPTIONS,
  DEFAULT_CAPACITY,
  START_STEP,
  WEEK,
} from "@/data/settings-filming";
import { SaveRow, SettingsCard } from "@/screens/o-shared";
import { Badge, fmtDate, type ScreenProps } from "@/screens/shared";

// Ωράριο κρατήσεων και Χωρητικότητα.
export function O4Hours({ role, query }: ScreenProps) {
  return (
    <>
      <SettingsCard title="Εβδομαδιαίο πρόγραμμα">
        <div className="scroll">
          <table className="rtable">
            <thead>
              <tr>
                <th>Μέρα</th>
                <th>Κατάσταση</th>
                <th>Από</th>
                <th>Έως</th>
                <th>Χωρητικότητα</th>
              </tr>
            </thead>
            <tbody>
              {WEEK.map((day) => (
                <tr key={day.id}>
                  <td data-label="Μέρα">{day.label}</td>
                  <td data-label="Κατάσταση">
                    {day.isOpen ? "ανοιχτά" : <Badge>κλειστά</Badge>}
                  </td>
                  <td data-label="Από">{day.isOpen ? day.from : "—"}</td>
                  <td data-label="Έως">{day.isOpen ? day.to : "—"}</td>
                  <td data-label="Χωρητικότητα">
                    {day.isOpen ? (
                      <>
                        {day.capacity}
                        {day.capacity !== DEFAULT_CAPACITY && (
                          <span className="muted">
                            {" "}
                            (αντί για {DEFAULT_CAPACITY})
                          </span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted o-hint">
          Χωρητικότητα: πόσα Γυρίσματα χωράνε την ίδια μέρα. Προεπιλογή{" "}
          {DEFAULT_CAPACITY}, και ανά μέρα όπου διαφέρει.
        </p>
      </SettingsCard>
      <SettingsCard title="Εξαιρέσεις ανά μέρα">
        <ul className="list">
          {DAY_EXCEPTIONS.map((ex) => (
            <li key={ex.id}>
              {fmtDate(ex.date)} · {ex.state} · «{ex.reason}»
            </li>
          ))}
        </ul>
        <div className="btn-row o-list-actions">
          <button type="button" className="button">
            + Νέα εξαίρεση
          </button>
        </div>
      </SettingsCard>
      <SettingsCard title="Διάρκειες και ώρα έναρξης">
        <div className="o-fields">
          <span className="stack o-field">
            <span>Επιτρεπτές διάρκειες</span>
            <span>{ALLOWED_DURATIONS.join(" · ")}</span>
          </span>
          <span className="stack o-field">
            <label htmlFor="o4-step">Βήμα ώρας έναρξης</label>
            <select id="o4-step" className="select" defaultValue={START_STEP}>
              <option value="15 λεπτά">15 λεπτά</option>
              <option value="30 λεπτά">30 λεπτά</option>
              <option value="60 λεπτά">60 λεπτά</option>
            </select>
          </span>
        </div>
        <SaveRow role={role} query={query} code="O4" card="hours" />
      </SettingsCard>
    </>
  );
}
