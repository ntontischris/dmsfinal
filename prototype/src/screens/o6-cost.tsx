import {
  COST_OVERRUN_LIMIT,
  EXPENSE_CATEGORIES,
  MONTH_LABEL,
  PREVIOUS_HOURS,
  PRODUCTIVE_HOURS,
  RANGE_MULTIPLIERS,
  totalExpenses,
} from "@/data/settings-finance";
import {
  NoCostPermission,
  Pending,
  SaveRow,
  SettingsCard,
} from "@/screens/o-shared";
import { fmtMoney, fmtPercent, type ScreenProps } from "@/screens/shared";

const FORWARD_NOTE = `Ισχύει από τον τρέχοντα μήνα (${MONTH_LABEL})· οι κλεισμένοι μήνες δεν αλλάζουν.`;

interface CostBlockProps extends ScreenProps {
  isEmpty: boolean;
}

// Μπλοκ κόστους: μόνο «Διαχειρίζεται κόστος» (αρχικά ο Ιδιοκτήτης).
export function O6CostBlock({ role, query, isEmpty }: CostBlockProps) {
  const total = totalExpenses(EXPENSE_CATEGORIES);
  const hourCost = total / PRODUCTIVE_HOURS;
  return (
    <>
      <SettingsCard title="Έξοδα του μήνα">
        <p className="muted o-hint">{FORWARD_NOTE}</p>
        {isEmpty ? (
          <p>
            Έξοδα πρώτου μήνα <Pending />{" "}
            <span className="muted">εκκρεμεί μέχρι να ελεγχθούν</span>
          </p>
        ) : (
          <div className="scroll">
            <table className="rtable">
              <thead>
                <tr>
                  <th>Κατηγορία</th>
                  <th>Έξοδο</th>
                  <th>Ανά μήνα</th>
                </tr>
              </thead>
              <tbody>
                {EXPENSE_CATEGORIES.flatMap((cat) =>
                  cat.lines.map((line, index) => (
                    <tr key={line.id}>
                      <td data-label="Κατηγορία">
                        {index === 0 ? cat.label : ""}
                      </td>
                      <td data-label="Έξοδο">{line.label}</td>
                      <td data-label="Ανά μήνα">{fmtMoney(line.amount)}</td>
                    </tr>
                  )),
                )}
                <tr className="o6-total">
                  <td data-label="Κατηγορία">Σύνολο</td>
                  <td data-label="Έξοδο" />
                  <td data-label="Ανά μήνα">{fmtMoney(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <div className="btn-row o-list-actions">
          <button type="button" className="button">
            + Νέο έξοδο
          </button>
        </div>
        <SaveRow role={role} query={query} code="O6" card="expenses" />
      </SettingsCard>
      <SettingsCard title="Παραγωγικές ώρες και Κόστος ώρας">
        <div className="o6-hours">
          <span className="stack o-field">
            <label htmlFor="o6-hours">
              Αναμενόμενες παραγωγικές ώρες του μήνα
            </label>
            <input
              id="o6-hours"
              className="input"
              defaultValue={isEmpty ? "" : PRODUCTIVE_HOURS}
              placeholder={isEmpty ? "εκκρεμεί" : undefined}
              inputMode="numeric"
            />
            {!isEmpty && (
              <span className="muted o-hint">
                Πρόσφατη αλλαγή: {PREVIOUS_HOURS} → {PRODUCTIVE_HOURS}.
              </span>
            )}
          </span>
        </div>
        <p>
          Κόστος ώρας:{" "}
          {isEmpty ? (
            <Pending />
          ) : (
            <strong>
              {fmtMoney(total)} ÷ {PRODUCTIVE_HOURS} ώρες = {fmtMoney(hourCost)}
            </strong>
          )}
        </p>
        <SaveRow role={role} query={query} code="O6" card="hours" />
        <p className="muted o-hint">{FORWARD_NOTE}</p>
      </SettingsCard>
      <SettingsCard title="Εύρος τιμής και Υπέρβαση κόστους">
        <div className="scroll">
          <table className="rtable">
            <thead>
              <tr>
                <th>Εύρος</th>
                <th>Πολλαπλασιαστής</th>
                <th>Ελάχιστο περιθώριο</th>
              </tr>
            </thead>
            <tbody>
              {RANGE_MULTIPLIERS.map((m) => (
                <tr key={m.id}>
                  <td data-label="Εύρος">{m.label}</td>
                  <td data-label="Πολλαπλασιαστής">
                    <input
                      className="input"
                      aria-label={`Πολλαπλασιαστής ${m.label}`}
                      defaultValue={String(m.factor).replace(".", ",")}
                    />
                  </td>
                  <td data-label="Ελάχιστο περιθώριο">
                    {fmtPercent(1 - 1 / m.factor)}
                    <span className="muted">
                      {" "}
                      (1 − 1/{String(m.factor).replace(".", ",")})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="o-fields">
          <span className="stack o-field">
            <label htmlFor="o6-overrun">Όριο Υπέρβασης κόστους (%)</label>
            <input
              id="o6-overrun"
              className="input"
              defaultValue={`+${Math.round(COST_OVERRUN_LIMIT * 100)}`}
            />
            <span className="muted o-hint">
              Πάνω από αυτό, η Διαχείριση ειδοποιείται· δεν μπλοκάρει τίποτα.
            </span>
          </span>
        </div>
        <SaveRow role={role} query={query} code="O6" card="range" />
        <p className="muted o-hint">{FORWARD_NOTE}</p>
      </SettingsCard>
    </>
  );
}

// Διαχείριση χωρίς «Διαχειρίζεται κόστος»: μόνο το σύνολο Κόστος ώρας του μήνα.
export function O6AdminCost({
  hourCost,
  isEmpty,
}: {
  hourCost: number;
  isEmpty: boolean;
}) {
  return (
    <>
      <NoCostPermission />
      <SettingsCard title={`Κόστος ώρας, ${MONTH_LABEL}`}>
        <p>
          {isEmpty ? (
            <Pending />
          ) : (
            <strong>{fmtMoney(hourCost)} ανά ώρα</strong>
          )}
        </p>
        <p className="muted o-hint">
          Βλέπεις μόνο το σύνολο· τα έξοδα και οι μισθοί φαίνονται σε όποιον
          έχει το Δικαίωμα.
        </p>
      </SettingsCard>
    </>
  );
}
