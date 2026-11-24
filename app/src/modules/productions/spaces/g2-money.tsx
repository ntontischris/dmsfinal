import { Badge, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { BILLABLE_REASON_LABELS } from "../labels";
import { getProductionMoney } from "../queries";
import { G2Box } from "./g2-box";
import { PRICE_OF_LABELS, coverageOf } from "./g2-money-model";

// «Τιμή και Τιμολογητέα» της Παραγωγής: μόνο για όποιον «Βλέπει ποσά» (αλλιώς η βάση αρνείται και το κουτί λείπει).
// Η Εσωτερική Παραγωγή δεν έχει Συμφωνία, άρα ούτε τιμή.
export async function G2Money({ productionId }: { productionId: string }) {
  const read = await getProductionMoney(productionId);
  if (!read.ok || read.data === null || read.data.priceOf === null) return null;
  const { price, priceOf, billables } = read.data;
  return (
    <G2Box
      title="Τιμή και Τιμολογητέα"
      hint={
        price === null
          ? "χωρίς τιμή"
          : `${fmtMoney(price)} · ${PRICE_OF_LABELS[priceOf]}`
      }
    >
      {billables.length === 0 ? (
        <p className="ml-empty">
          Δεν υπάρχει ακόμα Τιμολογητέο για αυτή την Παραγωγή.
        </p>
      ) : (
        <ul className="ml-list">
          {billables.map((billable) => {
            const coverage = coverageOf(billable.net, billable.covered);
            return (
              <li key={billable.id} className="ml-line">
                <span className="ml-main">
                  <strong>{billable.label}</strong>
                  <small>
                    {`${BILLABLE_REASON_LABELS[billable.reason]} · ${fmtDate(billable.billableOn)}`}
                  </small>
                </span>
                <span className="ml-amount">{fmtMoney(billable.net)}</span>
                <span className="ml-quick">
                  <Badge tone={coverage.tone}>{coverage.word}</Badge>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </G2Box>
  );
}
