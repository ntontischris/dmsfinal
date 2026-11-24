import Link from "next/link";

import {
  athensMonthStart,
  formatHours,
  formatMoney,
  saveMultipliers,
  type CostHint,
  type CostMonth,
} from "@/modules/catalogue";
import { SaveRow, SettingsForm } from "@/modules/settings";
import { hrefOf } from "@/spaces/data/screens";
import { fmtPercent } from "@/spaces/screens/shared";

import { G3Box } from "./g3-box";
import { monthRowsOf, multiplierRowsOf, type MonthRow } from "./o6-adapter";
import { decimalText } from "./o6-live";

// Τα κουτιά κόστους της O6 (μορφή «Χρήματα»): η ματιά στους μήνες (μόνο ανάγνωση, τα γράφει η I6, d7) και το
// «Εύρος τιμής και Υπέρβαση κόστους» στο πραγματικό `saveMultipliers`. Κλειστά· η υπόδειξη λέει τι έχουν μέσα.
const RANGE_NOTE =
  "Είναι οδηγός δίπλα στην τιμή κάθε Πακέτου ή Υπηρεσίας (κόστος × πολλαπλασιαστής)· την τιμή τη γράφεις πάντα εσύ.";

function MonthLine({ row }: { row: MonthRow }) {
  return (
    <li
      className="ml-line"
      data-faded={row.status === "closed" || undefined}
      data-urgent={row.status === "current" || undefined}
    >
      <span className="ml-thumb" aria-hidden="true">
        {row.label.slice(0, 3)}
      </span>
      <span className="ml-main">
        <span className="ml-tag">{row.statusLabel}</span>
        <strong>{row.label}</strong>
        <small>{row.sub}</small>
      </span>
      <span className="ml-amount">
        {formatMoney(row.expenses)}
        <small>έξοδα</small>
      </span>
    </li>
  );
}

const monthsHint = (rows: readonly MonthRow[]): string => {
  const current = rows.find((row) => row.status === "current");
  const count = `${rows.length} μήνες`;
  return current
    ? `${count} · ${current.statusLabel}: ${formatMoney(current.expenses)} έξοδα`
    : count;
};

// «Έξοδα και ώρες»: μόνο ανάγνωση. Τα αλλάζει η I6, η μία θέση του κόστους (d7).
export function CostMonthsGlance({ months }: { months: readonly CostMonth[] }) {
  const rows = monthRowsOf(months, athensMonthStart(), {
    money: formatMoney,
    hours: formatHours,
  });
  return (
    <G3Box title="Έξοδα και ώρες" hint={monthsHint(rows)}>
      {rows.length > 0 && (
        <ul className="ml-list">
          {rows.map((row) => (
            <MonthLine key={row.month} row={row} />
          ))}
        </ul>
      )}
      <p className="ml-quick o6-form" data-align="start">
        <Link data-primary href={hrefOf("I6")}>
          Έξοδα και Κόστος ώρας
        </Link>
      </p>
      <p className="muted o-hint">
        Τα Έξοδα και οι Παραγωγικές ώρες κάθε μήνα γράφονται εκεί· από αυτά
        βγαίνει το Κόστος ώρας.
      </p>
    </G3Box>
  );
}

// Κάθε πολλαπλασιαστής μία γραμμή (ml-line): όνομα και ελάχιστο περιθώριο, το πεδίο δεξιά.
function MultiplierRows({ hint }: { hint: CostHint }) {
  return (
    <ul className="ml-list">
      {multiplierRowsOf(hint.multipliers).map((row) => (
        <li key={row.name} className="ml-line">
          <span className="ml-thumb" aria-hidden="true">
            ×{decimalText(row.factor)}
          </span>
          <span className="ml-main">
            <strong>{row.label}</strong>
            <small>
              Ελάχιστο περιθώριο: {fmtPercent(row.margin)} (1 − 1/
              {decimalText(row.factor)})
            </small>
          </span>
          <label className="o6-factor">
            <span>Πολλαπλασιαστής</span>
            <input
              className="input"
              name={row.name}
              inputMode="decimal"
              required
              aria-label={`Πολλαπλασιαστής ${row.label}`}
              defaultValue={decimalText(row.factor)}
            />
          </label>
        </li>
      ))}
    </ul>
  );
}

const rangeHint = (hint: CostHint): string =>
  [
    ...multiplierRowsOf(hint.multipliers).map(
      (row) => `${row.label} ×${decimalText(row.factor)}`,
    ),
    `Υπέρβαση πάνω από ${decimalText(hint.overrunPercent)}%`,
  ].join(" · ");

function OverrunField({ hint }: { hint: CostHint }) {
  return (
    <div className="o-fields">
      <span className="stack o-field">
        <label htmlFor="o6-overrun">Όριο Υπέρβασης κόστους (%)</label>
        <input
          id="o6-overrun"
          className="input"
          name="overrunPercent"
          inputMode="decimal"
          required
          defaultValue={decimalText(hint.overrunPercent)}
        />
        <span className="muted o-hint">
          Πάνω από αυτό, η Παραγωγή σημαίνεται «Υπέρβαση» στο Κόστος και ώρες·
          δεν μπλοκάρει τίποτα.
        </span>
      </span>
    </div>
  );
}

// «Εύρος τιμής και Υπέρβαση κόστους»: οι τρεις πολλαπλασιαστές και το ποσοστό υπέρβασης.
export function RangeCard({ hint }: { hint: CostHint }) {
  return (
    <SettingsForm action={saveMultipliers}>
      <G3Box title="Εύρος τιμής και Υπέρβαση κόστους" hint={rangeHint(hint)}>
        <MultiplierRows hint={hint} />
        <OverrunField hint={hint} />
        <SaveRow card="range" />
        <p className="muted o-hint">{RANGE_NOTE}</p>
      </G3Box>
    </SettingsForm>
  );
}
