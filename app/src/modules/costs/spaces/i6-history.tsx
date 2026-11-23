import { fmtMoney } from "@/spaces/screens/shared";

import type { HistoryRow } from "./i6-adapter";
import { fmtRate } from "./i6-model";

// Ιστορικό Κόστους ώρας (prototype `screens/i6-history.tsx`): οι γραμμένοι μήνες από τη βάση, σε κλειστό κουτί των
// «Χρημάτων». Κάθε μήνας μία γραμμή: κατάσταση, μήνας, έξοδα και ώρες, Κόστος ώρας.

const hintOf = (rows: readonly HistoryRow[]): string => {
  const count = rows.length === 1 ? "1 μήνας" : `${rows.length} μήνες`;
  const latest = rows.find((m) => !m.isClosed);
  return latest
    ? `${count} · ${latest.label}: ${fmtRate(latest.hourCost)} την ώρα`
    : count;
};

function HistoryLine({ m }: { m: HistoryRow }) {
  return (
    <tr className="ml-line" data-faded={m.isClosed || undefined}>
      <td className="ml-thumb" aria-hidden="true">
        {m.month.slice(5, 7)}
      </td>
      <td className="ml-main">
        <span className="ml-tag">{m.statusLabel}</span>
        <strong>{m.label}</strong>
        <small>
          Έξοδα {fmtMoney(m.expenses)} · Ώρες {m.hours}
        </small>
      </td>
      <td className="ml-amount">
        {fmtRate(m.hourCost)}
        <small>την ώρα</small>
      </td>
    </tr>
  );
}

export function HourCostHistory({ rows }: { rows: readonly HistoryRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <details className="ml-box">
        <summary>
          <h2 className="ml-box-title">Ιστορικό Κόστους ώρας</h2>
          <small>{hintOf(rows)}</small>
        </summary>
        <table className="ml-table ml-list">
          <thead>
            <tr>
              <th>Μήνας</th>
              <th>Κατάσταση, έξοδα και ώρες</th>
              <th>Κόστος ώρας</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <HistoryLine key={m.month} m={m} />
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
