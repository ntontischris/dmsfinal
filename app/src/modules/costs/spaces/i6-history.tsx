import { Panel } from "@/spaces/kit/panel";
import { Badge, fmtMoney } from "@/spaces/screens/shared";

import type { HistoryRow } from "./i6-adapter";
import { fmtRate } from "./i6-model";

// Ιστορικό Κόστους ώρας (prototype `screens/i6-history.tsx`): οι γραμμένοι μήνες από τη βάση.

export function HourCostHistory({ rows }: { rows: readonly HistoryRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Panel label="Ιστορικό Κόστους ώρας" isFlush>
      <div className="scroll">
        <table className="rtable i67-flat">
          <thead>
            <tr>
              <th>Μήνας</th>
              <th className="num">Έξοδα</th>
              <th className="num">Ώρες</th>
              <th className="num">Κόστος ώρας</th>
              <th>Κατάσταση</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.month}>
                <td data-label="Μήνας">
                  <strong>{m.label}</strong>
                </td>
                <td data-label="Έξοδα" className="num">
                  {fmtMoney(m.expenses)}
                </td>
                <td data-label="Ώρες" className="num">
                  {m.hours}
                </td>
                <td data-label="Κόστος ώρας" className="num i67-money">
                  {fmtRate(m.hourCost)}
                </td>
                <td data-label="Κατάσταση">
                  <Badge tone={m.isClosed ? "faded" : "strong"}>
                    {m.statusLabel}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
