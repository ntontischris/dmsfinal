import { MONTH_COSTS } from "@/data/finance";
import {
  TODAY,
  hourCostOf,
  isClosedMonth,
  monthTotal,
} from "@/data/finance-access";
import { fmtMonth, fmtRate } from "@/screens/i6-model";
import { Badge, fmtMoney } from "@/screens/shared";

const statusOf = (month: string): string =>
  isClosedMonth(month)
    ? "κλεισμένος"
    : month === TODAY.slice(0, 7)
      ? "τρέχων"
      : "μελλοντικός";

export function HourCostHistory() {
  return (
    <section className="card">
      <h2 className="card-title">Ιστορικό Κόστους ώρας</h2>
      <table className="rtable">
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
          {MONTH_COSTS.map((m) => (
            <tr key={m.month}>
              <td data-label="Μήνας">{fmtMonth(m.month)}</td>
              <td data-label="Έξοδα" className="num">
                {fmtMoney(monthTotal(m))}
              </td>
              <td data-label="Ώρες" className="num">
                {m.productiveHours}
              </td>
              <td data-label="Κόστος ώρας" className="num">
                {fmtRate(hourCostOf(m))}
              </td>
              <td data-label="Κατάσταση">
                <Badge tone={isClosedMonth(m.month) ? undefined : "strong"}>
                  {statusOf(m.month)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
