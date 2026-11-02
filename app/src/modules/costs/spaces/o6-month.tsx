"use client";

import { useState, type ReactNode } from "react";

import type { CostMonth } from "@/modules/catalogue";
import { Panel } from "@/spaces/kit/panel";
import { Badge, fmtMoney } from "@/spaces/screens/shared";

import { basisOf, decimalText, liveHourCost } from "./o6-live";

// Οι κάρτες «Έξοδα του μήνα» και «Παραγωγικές ώρες και Κόστος ώρας» (prototype `screens/o6-cost.tsx`), μέσα σε μία
// φόρμα του πραγματικού `saveCostMonth` (μήνας + έξοδα + ώρες μαζί). Η βάση κρατά ένα σύνολο εξόδων ανά μήνα, όχι
// κατηγορίες: η λίστα εξόδων και το «+ Νέο έξοδο» λείπουν· τη θέση τους παίρνουν οι μήνες που έχουν γραφτεί.

interface O6MonthCardsProps {
  months: readonly CostMonth[];
  options: readonly { value: string; label: string }[];
  current: string;
  inForceMonth: string | null;
  // Οι γραμμές των μηνών και τα κουμπιά αποθήκευσης (SaveRow), έτοιμα από τον server.
  monthList: ReactNode;
  saveExpenses: ReactNode;
  saveHours: ReactNode;
  forwardNote: string;
}

const PENDING = <Badge tone="attention">εκκρεμεί</Badge>;

export function O6MonthCards(props: O6MonthCardsProps) {
  const [month, setMonth] = useState(props.current);
  const basis = basisOf(props.months, month, props.inForceMonth);
  return (
    <MonthFields
      key={month}
      {...props}
      month={month}
      setMonth={setMonth}
      expenses={decimalText(basis?.expensesTotal)}
      hours={decimalText(basis?.productiveHours)}
    />
  );
}

interface MonthFieldsProps extends O6MonthCardsProps {
  month: string;
  setMonth: (month: string) => void;
  expenses: string;
  hours: string;
}

function MonthFields(props: MonthFieldsProps) {
  const [expenses, setExpenses] = useState(props.expenses);
  const [hours, setHours] = useState(props.hours);
  const live = liveHourCost(expenses, hours);
  return (
    <>
      <div className="o-card">
        <Panel label="Έξοδα του μήνα">
          <p className="muted o-hint">{props.forwardNote}</p>
          <div className="o-fields">
            <span className="stack o-field">
              <label htmlFor="o6-month">Μήνας</label>
              <select
                id="o6-month"
                className="select"
                name="month"
                value={props.month}
                onChange={(event) => props.setMonth(event.target.value)}
              >
                {props.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </span>
            <span className="stack o-field">
              <label htmlFor="o6-expenses">
                Σύνολο εξόδων του μήνα (€) {expenses === "" && PENDING}
              </label>
              <input
                id="o6-expenses"
                className="input"
                name="expensesTotal"
                inputMode="decimal"
                required
                defaultValue={props.expenses}
                placeholder={expenses === "" ? "εκκρεμεί" : undefined}
                onChange={(event) => setExpenses(event.target.value)}
              />
            </span>
          </div>
          {props.monthList}
          {props.saveExpenses}
        </Panel>
      </div>
      <div className="o-card">
        <Panel label="Παραγωγικές ώρες και Κόστος ώρας">
          <div className="o6-hours">
            <span className="stack o-field">
              <label htmlFor="o6-hours">
                Αναμενόμενες παραγωγικές ώρες του μήνα
              </label>
              <input
                id="o6-hours"
                className="input"
                name="productiveHours"
                inputMode="decimal"
                required
                defaultValue={props.hours}
                placeholder={hours === "" ? "εκκρεμεί" : undefined}
                onChange={(event) => setHours(event.target.value)}
              />
            </span>
          </div>
          <p>
            Κόστος ώρας:{" "}
            {live === null ? (
              PENDING
            ) : (
              <strong>
                {fmtMoney(live.expenses)} ÷ {decimalText(live.hours)} ώρες ={" "}
                {fmtMoney(live.hourCost)}
              </strong>
            )}
          </p>
          {props.saveHours}
          <p className="muted o-hint">{props.forwardNote}</p>
        </Panel>
      </div>
    </>
  );
}
