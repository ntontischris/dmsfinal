"use client";

import { useState } from "react";

import { Badge, type Tone } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { saveCostMonth } from "../actions-settings";
import {
  formatHours,
  formatMoney,
  formatMonth,
  monthOptions,
  monthStatus,
} from "../helpers";
import { MONTH_STATUS_LABELS } from "../labels";
import type { CostHint, CostMonth, MonthStatus } from "../types";

import { ActionForm } from "./action-form";

interface CostMonthsCardProps {
  months: readonly CostMonth[];
  hint: CostHint | null;
  current: string; // YYYY-MM-01 του τρέχοντος μήνα Αθήνας
  canManage: boolean;
}

const MONTHS_AHEAD = 6;
const STATUS_TONES: Readonly<Record<MonthStatus, Tone | undefined>> = {
  closed: undefined,
  current: "ok",
  future: "strong",
};

// Το κόμμα είναι ο δεκαδικός του ελληνικού πληκτρολογίου, γι' αυτό τα πεδία είναι κειμένου.
const decimalText = (value: number | undefined): string =>
  value === undefined ? "" : String(value).replace(".", ",");

function InForce({ hint }: { hint: CostHint | null }) {
  if (!hint || hint.hourCost === null || hint.hourCostMonth === null)
    return <p className="m-0 text-sm">Δεν έχει οριστεί ακόμα Κόστος ώρας.</p>;
  return (
    <p className="m-0 text-sm">
      Κόστος ώρας που ισχύει:{" "}
      <strong className="tabular-nums">{formatMoney(hint.hourCost)}</strong> (
      {formatMonth(hint.hourCostMonth)})
    </p>
  );
}

function MonthsTable({
  months,
  current,
}: {
  months: readonly CostMonth[];
  current: string;
}) {
  if (months.length === 0) return null;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Μήνας</Th>
          <Th isNumeric>Έξοδα</Th>
          <Th isNumeric>Παραγωγικές ώρες</Th>
          <Th isNumeric>Κόστος ώρας</Th>
          <Th>Κατάσταση</Th>
        </tr>
      </thead>
      <tbody>
        {months.map((row) => {
          const status = monthStatus(row.month, current);
          return (
            <Tr key={row.month}>
              <Td data-label="Μήνας">{formatMonth(row.month)}</Td>
              <Td data-label="Έξοδα" isNumeric>
                {formatMoney(row.expensesTotal)}
              </Td>
              <Td data-label="Παραγωγικές ώρες" isNumeric>
                {formatHours(row.productiveHours)}
              </Td>
              <Td data-label="Κόστος ώρας" isNumeric>
                {formatMoney(row.hourCost)}
              </Td>
              <Td data-label="Κατάσταση">
                <Badge tone={STATUS_TONES[status]}>
                  {MONTH_STATUS_LABELS[status]}
                </Badge>
              </Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}

// Η φόρμα προσυμπληρώνεται από τον μήνα που ισχύει (ή από τον μήνα που διάλεξες, αν έχει ήδη γραφτεί)·
// ο ιδιοκτήτης διορθώνει αντί να ξαναγράφει.
function MonthForm({
  months,
  hint,
  current,
}: Omit<CostMonthsCardProps, "canManage">) {
  const [month, setMonth] = useState(current);
  const basis =
    months.find((row) => row.month === month) ??
    months.find((row) => row.month === hint?.hourCostMonth);
  return (
    <ActionForm action={saveCostMonth} onlyWhenChanged submitLabel="Αποθήκευση μήνα">
      <Field label="Μήνας">
        <Select
          name="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        >
          {monthOptions(current, MONTHS_AHEAD).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Έξοδα του μήνα (€)"
        hint="Το σύνολο των εξόδων του μήνα. Η ανάλυση σε κατηγορίες έρχεται με το module Οικονομικά."
      >
        <Input
          key={`expenses-${month}`}
          name="expensesTotal"
          inputMode="decimal"
          required
          defaultValue={decimalText(basis?.expensesTotal)}
        />
      </Field>
      <Field label="Αναμενόμενες παραγωγικές ώρες">
        <Input
          key={`hours-${month}`}
          name="productiveHours"
          inputMode="decimal"
          required
          defaultValue={decimalText(basis?.productiveHours)}
        />
      </Field>
    </ActionForm>
  );
}

// O6 · Κόστος ώρας ανά μήνα: έξοδα ÷ παραγωγικές ώρες, ισχύει από τον μήνα που ορίζεις και μετά (ADR 0015).
export function CostMonthsCard({
  months,
  hint,
  current,
  canManage,
}: CostMonthsCardProps) {
  return (
    <Panel label="Κόστος ώρας">
      <div className="grid gap-4">
        <p className="m-0 text-sm text-muted-foreground">
          Κόστος ώρας = έξοδα του μήνα ÷ αναμενόμενες παραγωγικές ώρες. Ισχύει
          από τον μήνα που ορίζεις και μετά, μέχρι να οριστεί νεότερος. Οι
          κλεισμένοι μήνες δεν αλλάζουν.
        </p>
        <InForce hint={hint} />
        <MonthsTable months={months} current={current} />
        {canManage ? (
          <div className="border-t pt-4">
            <MonthForm months={months} hint={hint} current={current} />
          </div>
        ) : (
          <p className="m-0 text-sm text-muted-foreground">
            Αλλάζουν μόνο από όποιον «Διαχειρίζεται κόστος».
          </p>
        )}
      </div>
    </Panel>
  );
}
