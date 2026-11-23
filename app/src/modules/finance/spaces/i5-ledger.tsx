import { Badge, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import type { I5Row } from "./i5-adapter";
import { lineMarkOf } from "./i5-model";

import "./money-lines.css";

// Οι κινήσεις της Καρτέλας ως γραμμές (Χρήματα restyle, όπως οι Εισπράξεις): ημερομηνία, κίνηση, χρέωση ή πίστωση
// και το τρέχον υπόλοιπο του λογαριασμού μετά από αυτήν.

// Στα Τιμολόγια: τι έγινε με αυτό το ίδιο, ώστε το τρέχον υπόλοιπο να μη διαβάζεται ως οφειλή του.
function InvoiceState({ row }: { row: I5Row }) {
  if (!row.invoiceStatus) return null;
  if (row.invoiceStatus === "εξοφλημένο")
    return <Badge tone="strong">εξοφλημένο</Badge>;
  return (
    <small>
      {row.invoiceStatus}: μένουν {fmtMoney(row.invoiceRemaining ?? 0)}
    </small>
  );
}

const sidesOf = (row: I5Row): string => {
  const parts = [
    row.debit !== 0 ? `χρέωση ${fmtMoney(row.debit)}` : null,
    row.credit !== 0 ? `πίστωση ${fmtMoney(row.credit)}` : null,
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? "—" : parts.join(" · ");
};

function LedgerLine({ row }: { row: I5Row }) {
  const isCredit = row.credit !== 0 && row.debit === 0;
  return (
    <li className="ml-line i5-line" data-side={isCredit ? "credit" : "debit"}>
      <span className="ml-thumb" aria-hidden="true">
        {lineMarkOf(row.label)}
      </span>
      <span className="ml-main">
        <span className="ml-tag">
          {fmtDate(row.date)} · {isCredit ? "πίστωση" : "χρέωση"}
        </span>
        <strong>{row.label}</strong>
        <InvoiceState row={row} />
      </span>
      <span className="ml-amount">
        {fmtMoney(isCredit ? row.credit : row.debit)}
        <small>{sidesOf(row)}</small>
      </span>
      <span className="i5-running">
        <small>υπόλοιπο λογαριασμού</small>
        <strong>{fmtMoney(row.balance)}</strong>
      </span>
    </li>
  );
}

export function LedgerLines({ rows }: { rows: readonly I5Row[] }) {
  return (
    <section className="i5-moves" aria-labelledby="i5-moves-title">
      <h2 id="i5-moves-title" className="ml-box-title">
        Κινήσεις <small className="muted">({rows.length})</small>
      </h2>
      <ul className="ml-list">
        {rows.map((row) => (
          <LedgerLine key={row.key} row={row} />
        ))}
      </ul>
    </section>
  );
}
