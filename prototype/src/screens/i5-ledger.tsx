import type { LedgerRow } from "@/data/finance-access";
import { fmtDate, fmtMoney } from "@/screens/shared";

import "./i245.css";

const moneyOrDash = (value: number): string =>
  value === 0 ? "—" : fmtMoney(value);

function LedgerLine({ row }: { row: LedgerRow }) {
  return (
    <tr>
      <td data-label="Ημερομηνία">{fmtDate(row.date)}</td>
      <td data-label="Κίνηση" className="i245-cell">
        {row.label}
      </td>
      <td data-label="Χρέωση" className="num">
        {moneyOrDash(row.debit)}
      </td>
      <td data-label="Πίστωση" className="num">
        {moneyOrDash(row.credit)}
      </td>
      <td data-label="Υπόλοιπο" className="num">
        {fmtMoney(row.balance)}
      </td>
    </tr>
  );
}

export function LedgerTable({ rows }: { rows: readonly LedgerRow[] }) {
  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Ημερομηνία</th>
          <th>Κίνηση</th>
          <th className="num">Χρέωση</th>
          <th className="num">Πίστωση</th>
          <th className="num">Υπόλοιπο</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <LedgerLine key={row.ref ?? row.date + row.label} row={row} />
        ))}
      </tbody>
    </table>
  );
}
