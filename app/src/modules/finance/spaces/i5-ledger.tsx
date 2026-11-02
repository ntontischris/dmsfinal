import { Badge, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import type { I5Row } from "./i5-adapter";

// Ο πίνακας κινήσεων της Καρτέλας του prototype (`screens/i5-ledger.tsx`).

// Στα Τιμολόγια: τι έγινε με αυτό το ίδιο, ώστε το τρέχον υπόλοιπο να μη διαβάζεται ως οφειλή του.
function InvoiceState({ row }: { row: I5Row }) {
  if (!row.invoiceStatus) return null;
  if (row.invoiceStatus === "εξοφλημένο")
    return <Badge tone="strong">εξοφλημένο</Badge>;
  return (
    <span className="i245-sub">
      {row.invoiceStatus}: μένουν {fmtMoney(row.invoiceRemaining ?? 0)}
    </span>
  );
}

const moneyOrDash = (value: number): string =>
  value === 0 ? "—" : fmtMoney(value);

function LedgerLine({ row }: { row: I5Row }) {
  return (
    <tr>
      <td data-label="Ημερομηνία">
        <strong>{fmtDate(row.date)}</strong>
      </td>
      <td data-label="Κίνηση" className="i245-cell">
        <strong>{row.label}</strong> <InvoiceState row={row} />
      </td>
      <td data-label="Χρέωση" className="num">
        {moneyOrDash(row.debit)}
      </td>
      <td data-label="Πίστωση" className="num">
        {moneyOrDash(row.credit)}
      </td>
      <td data-label="Υπόλοιπο λογαριασμού" className="num i245-money">
        {fmtMoney(row.balance)}
      </td>
    </tr>
  );
}

export function LedgerTable({ rows }: { rows: readonly I5Row[] }) {
  return (
    <div className="scroll i245-glass">
      <table className="rtable">
        <thead>
          <tr>
            <th>Ημερομηνία</th>
            <th>Κίνηση</th>
            <th className="num">Χρέωση</th>
            <th className="num">Πίστωση</th>
            <th className="num">Υπόλοιπο λογαριασμού</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <LedgerLine key={row.key} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
