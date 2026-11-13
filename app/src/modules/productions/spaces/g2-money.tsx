import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { BILLABLE_REASON_LABELS } from "../labels";
import { getProductionMoney } from "../queries";
import { PRICE_OF_LABELS, coverageOf } from "./g2-money-model";

// «Τιμή και Τιμολογητέα» της Παραγωγής: μόνο για όποιον «Βλέπει ποσά» (αλλιώς η βάση αρνείται και το πάνελ λείπει).
// Η Εσωτερική Παραγωγή δεν έχει Συμφωνία, άρα ούτε τιμή.
export async function G2Money({ productionId }: { productionId: string }) {
  const read = await getProductionMoney(productionId);
  if (!read.ok || read.data === null || read.data.priceOf === null) return null;
  const { price, priceOf, billables } = read.data;
  return (
    <Panel
      label="Τιμή και Τιμολογητέα"
      aside={price === null ? "χωρίς τιμή" : `${fmtMoney(price)} · ${PRICE_OF_LABELS[priceOf]}`}
    >
      {billables.length === 0 ? (
        <p className="muted">
          Δεν υπάρχει ακόμα Τιμολογητέο για αυτή την Παραγωγή.
        </p>
      ) : (
        <RowList>
          {billables.map((billable) => {
            const coverage = coverageOf(billable.net, billable.covered);
            return (
              <ListRow
                key={billable.id}
                title={billable.label}
                sub={`${BILLABLE_REASON_LABELS[billable.reason]} · ${fmtDate(billable.billableOn)}`}
                aside={
                  <>
                    <strong>{fmtMoney(billable.net)}</strong>{" "}
                    <Badge tone={coverage.tone}>{coverage.word}</Badge>
                  </>
                }
              />
            );
          })}
        </RowList>
      )}
    </Panel>
  );
}
